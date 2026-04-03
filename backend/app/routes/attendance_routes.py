"""Attendance tracking, engagement aggregation, and report export routes."""

import csv
import io
import logging
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from app.attendance import get_attendance_manager
from app.attendance_excel import get_attendance_excel_exporter
from app.auth import get_current_student, get_current_teacher, get_current_user
from app.config import settings
from app.database import get_db
from app.face_detection import get_face_detector
from app.models import (
    AttendanceEndRequest,
    AttendanceMetadata,
    AttendanceReport,
    AttendanceReportSummary,
    AttendanceStart,
    AttendanceStatus,
    EngagementUpdate,
    FrameData,
    User,
)
from app.websocket import get_connection_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/start", response_model=dict)
async def start_attendance(
    attendance_data: AttendanceStart,
    current_user: User = Depends(get_current_student),
    db=Depends(get_db)
):
    """
    Start attendance tracking for a student in a class session.
    
    Args:
        attendance_data: Session information
        current_user: Authenticated student
        db: Database instance
        
    Returns:
        Confirmation with session details
        
    Raises:
        HTTPException: If class not found or not active
    """
    attendance_manager = get_attendance_manager()
    await attendance_manager.ensure_indexes(db)

    # Verify class exists and is active
    class_doc = await db.classes.find_one({"class_id": attendance_data.class_id})
    
    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if not class_doc.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Class session is not active"
        )

    active_session_id = class_doc.get("active_session_id")
    if active_session_id and attendance_data.session_id != active_session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance session does not match the active class session"
        )
    
    # Verify student is enrolled
    if current_user.id not in class_doc.get("enrolled_students", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enrolled in this class"
        )
    
    # Start attendance session
    attendance = await attendance_manager.start_attendance_session(
        student_id=current_user.id,
        student_name=current_user.name,
        class_id=attendance_data.class_id,
        session_id=attendance_data.session_id,
        class_duration_minutes=class_doc["duration_minutes"],
        class_started_at=class_doc.get("session_started_at"),
        class_title=class_doc.get("title"),
        teacher_name=class_doc.get("teacher_name"),
        section=current_user.department_name,
        db=db
    )
    
    logger.info(f"✓ Attendance started for student {current_user.name} in session {attendance_data.session_id}")
    
    return {
        "message": "Attendance tracking started",
        "session_id": attendance_data.session_id,
        "class_id": attendance_data.class_id,
        "student_id": current_user.id,
        "started_at": attendance.started_at.isoformat(),
    }


@router.post("/frame", response_model=dict)
async def process_frame(
    frame_data: FrameData,
    current_user: User = Depends(get_current_student),
    db=Depends(get_db)
):
    """
    Process a webcam frame for engagement tracking.
    
    This is the core endpoint that receives frames from student webcams,
    analyzes face presence and attention, and updates engagement metrics.
    
    Args:
        frame_data: Frame data with base64 encoded image
        current_user: Authenticated student
        db: Database instance
        
    Returns:
        Analysis results and updated engagement metrics
    """
    # Verify student owns this session
    if frame_data.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot submit frames for another student"
        )
    
    attendance_manager = get_attendance_manager()
    await attendance_manager.ensure_indexes(db)

    # Process frame
    face_detector = get_face_detector()
    
    result = await attendance_manager.process_frame(
        frame_data=frame_data,
        face_detector=face_detector,
        db=db
    )
    
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Failed to process frame")
        )
    
    # Get attendance record to find class_id
    attendance_doc = await db.attendance.find_one({
        "session_id": frame_data.session_id,
        "student_id": frame_data.student_id
    })
    
    if attendance_doc:
        # Broadcast real-time update via WebSocket
        connection_manager = get_connection_manager()
        engagement_update = EngagementUpdate(
            student_id=current_user.id,
            student_name=current_user.name,
            is_face_detected=result["face_detected"],
            is_looking_at_screen=result["looking_at_screen"],
            engagement_percentage=result["engagement_percentage"],
            last_update=datetime.utcnow()
        )
        
        await connection_manager.broadcast_engagement_update(
            class_id=attendance_doc["class_id"],
            engagement_update=engagement_update
        )
    
    return {
        "message": "Frame processed successfully",
        "face_detected": result["face_detected"],
        "looking_at_screen": result["looking_at_screen"],
        "engagement_percentage": result["engagement_percentage"],
        "engagement_seconds": result["engagement_seconds"]
    }


@router.post("/metadata", response_model=dict)
async def process_metadata(
    metadata: AttendanceMetadata,
    current_user: User = Depends(get_current_student),
    db=Depends(get_db)
):
    """
    Process attendance metadata from browser-side face detection.
    
    PRIVACY-FOCUSED: This endpoint receives only metadata, not video/images.
    Face detection is performed client-side using face-api.js.
    
    This approach ensures:
    - No raw video/images are transmitted or stored
    - Privacy-compliant attendance tracking
    - Reduced bandwidth usage
    - Client-side AI processing
    
    Args:
        metadata: Face detection metadata from client
        current_user: Authenticated student
        db: Database instance
        
    Returns:
        Updated engagement metrics
    """
    # Verify student owns this session
    if metadata.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot submit metadata for another student"
        )
    
    attendance_manager = get_attendance_manager()
    await attendance_manager.ensure_indexes(db)

    # Find attendance record
    attendance_doc = await db.attendance.find_one({
        "class_id": metadata.class_id,
        "session_id": metadata.session_id,
        "student_id": metadata.student_id
    })

    if not attendance_doc:
        class_doc = await db.classes.find_one({"class_id": metadata.class_id})
        if not class_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found"
            )

        active_session_id = class_doc.get("active_session_id")
        if active_session_id and metadata.session_id != active_session_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attendance session does not match the active class session"
            )

        if current_user.id not in class_doc.get("enrolled_students", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enrolled in this class"
            )

        # Self-heal missing start call: create attendance session from metadata flow.
        await attendance_manager.start_attendance_session(
            student_id=current_user.id,
            student_name=current_user.name,
            class_id=metadata.class_id,
            session_id=metadata.session_id,
            class_duration_minutes=class_doc.get("duration_minutes", 0),
            class_started_at=class_doc.get("session_started_at"),
            class_title=class_doc.get("title"),
            teacher_name=class_doc.get("teacher_name"),
            section=metadata.section or current_user.department_name,
            db=db,
        )

        attendance_doc = await db.attendance.find_one({
            "class_id": metadata.class_id,
            "session_id": metadata.session_id,
            "student_id": metadata.student_id
        })

        if not attendance_doc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to initialize attendance session"
            )
    
    # Fixed-interval engagement sampling: every valid sample adds 5 seconds.
    current_time = metadata.timestamp
    time_increment = settings.frame_interval_seconds if metadata.face_detected else 0
    
    # Update engagement metrics
    new_engagement_seconds = attendance_doc["engagement_duration_seconds"] + time_increment
    total_duration = attendance_doc.get("total_class_duration_seconds") or settings.frame_interval_seconds
    engagement_percentage = (new_engagement_seconds / total_duration * 100) if total_duration > 0 else 0
    
    # Combine attention score with presence tracking
    # Weight: 70% presence time, 30% attention quality
    weighted_score = engagement_percentage * 0.7 + (metadata.attention_score * time_increment / max(total_duration, 1)) * 0.3
    
    # Update database
    update_data = {
        "last_frame_timestamp": current_time,
        "student_name": current_user.name,
        "section": metadata.section or current_user.department_name,
        "is_face_detected": metadata.face_detected,
        "is_looking_at_screen": metadata.attention_score > 50,  # Estimate from attention score
        "engagement_duration_seconds": new_engagement_seconds,
        "engagement_percentage": round(min(engagement_percentage, 100), 2),
        "attention_score": metadata.attention_score,
        "multiple_faces_detected": metadata.multiple_faces
    }

    # STRICT MODE: Track if face was EVER detected (for stricter attendance validation)
    if metadata.face_detected:
        update_data["face_detected_at_least_once"] = True

    await db.attendance.update_one(
        {"_id": attendance_doc["_id"]},
        {
            "$set": update_data,
            "$push": {
                "engagement_logs": {
                    "timestamp": current_time,
                    "is_present": metadata.face_detected,
                    "increment_seconds": time_increment,
                }
            },
        }
    )
    
    # Broadcast engagement update via WebSocket (for teacher dashboard)
    connection_manager = get_connection_manager()
    engagement_update = EngagementUpdate(
        student_id=current_user.id,
        student_name=current_user.name,
        is_face_detected=metadata.face_detected,
        is_looking_at_screen=metadata.attention_score > 50,
        engagement_percentage=round(min(engagement_percentage, 100), 2),
        last_update=current_time
    )
    
    await connection_manager.broadcast_engagement_update(
        class_id=metadata.class_id,
        engagement_update=engagement_update
    )
    
    logger.debug(f"Metadata processed for student {metadata.student_id}: "
                f"face={metadata.face_detected}, attention={metadata.attention_score}, "
                f"engagement={engagement_percentage:.1f}%")
    
    return {
        "message": "Metadata processed successfully",
        "face_detected": metadata.face_detected,
        "attention_score": metadata.attention_score,
        "engagement_percentage": round(min(engagement_percentage, 100), 2),
        "engagement_seconds": new_engagement_seconds
    }


@router.post("/end", response_model=dict)
async def end_attendance(
    payload: AttendanceEndRequest,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    End attendance tracking session and finalize status.
    
    Args:
        session_id: Session identifier
        current_user: Authenticated student
        db: Database instance
        
    Returns:
        Final attendance status
    """
    attendance_manager = get_attendance_manager()
    await attendance_manager.ensure_indexes(db)

    if current_user.role == "teacher":
        if not payload.class_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="class_id is required when a teacher finalizes attendance"
            )

        class_doc = await db.classes.find_one({"class_id": payload.class_id})
        if not class_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found"
            )

        if class_doc["teacher_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to finalize this class"
            )

        report = await attendance_manager.finalize_class_attendance(
            class_doc=class_doc,
            session_id=payload.session_id,
            ended_at=payload.ended_at or datetime.utcnow(),
            db=db,
        )

        connection_manager = get_connection_manager()
        for record in report.attendance_records:
            await connection_manager.broadcast_attendance_status(
                class_id=payload.class_id,
                student_id=record["student_id"],
                student_name=record["student_name"],
                status=record["attendance_status"],
                engagement_percentage=record["engagement_percentage"],
            )

        logger.info(f"✓ Attendance finalized for class {payload.class_id}, session {payload.session_id}")
        return report.model_dump()

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Attendance is finalized only when class ends"
    )


# IMPORTANT: /report/{class_id}/{session_id} MUST be defined BEFORE /report/{class_id}
# to ensure proper route matching in FastAPI (specific routes before general ones)
@router.get("/report/{class_id}/{session_id}", response_model=AttendanceReport)
async def get_attendance_report(
    class_id: str,
    session_id: str,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Get attendance report for a class session (teacher only).
    
    Args:
        class_id: Class identifier
        session_id: Session identifier
        current_user: Authenticated teacher
        db: Database instance
        
    Returns:
        Comprehensive attendance report
        
    Raises:
        HTTPException: If class not found or unauthorized
    """
    # Verify class exists and teacher owns it
    class_doc = await db.classes.find_one({"class_id": class_id})
    
    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_doc["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this report"
        )
    
    attendance_manager = get_attendance_manager()
    report = await attendance_manager.get_class_attendance_report(
        class_id=class_id,
        session_id=session_id,
        db=db
    )
    
    logger.info(f"✓ Attendance report generated for class {class_id}, session {session_id}")
    
    return report


@router.get("/report/{class_id}", response_model=AttendanceReport)
async def get_latest_attendance_report(
    class_id: str,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Get the latest finalized attendance report for a class within retention."""
    class_doc = await db.classes.find_one({"class_id": class_id})

    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    if class_doc["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this report"
        )

    attendance_manager = get_attendance_manager()
    report = await attendance_manager.get_latest_class_attendance_report(class_doc, db)
    if report:
        return report

    return AttendanceReport(
        class_id=class_id,
        total_students=0,
        present_count=0,
        absent_count=0,
        attendance_records=[]
    )


@router.get("/{class_id}", response_model=AttendanceReport)
async def get_attendance_by_class(
    class_id: str,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Return latest finalized attendance list for a class.

    Alias endpoint requested by frontend integrations:
    GET /attendance/:classId
    """
    return await get_latest_attendance_report(class_id=class_id, current_user=current_user, db=db)


@router.get("/reports/{class_id}", response_model=List[AttendanceReportSummary])
async def list_attendance_reports(
    class_id: str,
    limit: int = 25,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """List finalized attendance reports for a class, newest first."""
    class_doc = await db.classes.find_one({"class_id": class_id})

    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    if class_doc["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view these reports"
        )

    attendance_manager = get_attendance_manager()
    safe_limit = max(1, min(limit, 100))
    summaries = await attendance_manager.list_class_reports(
        class_id=class_id,
        db=db,
        limit=safe_limit,
    )
    return summaries


@router.delete("/report/{class_id}/{session_id}", response_model=dict)
async def delete_attendance_report(
    class_id: str,
    session_id: str,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Delete a stored attendance report for a class session."""
    class_doc = await db.classes.find_one({"class_id": class_id})

    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    if class_doc["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this report"
        )

    attendance_manager = get_attendance_manager()
    deleted = await attendance_manager.delete_class_report(class_id, session_id, db)

    if deleted == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance report not found"
        )

    return {
        "message": "Attendance report deleted",
        "class_id": class_id,
        "session_id": session_id,
        "deleted_count": deleted,
    }


@router.get("/student/{student_id}", response_model=List[dict])
async def get_student_attendance_history(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Get attendance history for a student.
    Students can view their own, teachers can view any enrolled student.
    
    Args:
        student_id: Student's user ID
        current_user: Authenticated user
        db: Database instance
        
    Returns:
        List of attendance records
        
    Raises:
        HTTPException: If unauthorized
    """
    # Students can only view their own records
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view other students' attendance"
        )
    
    attendance_manager = get_attendance_manager()
    await attendance_manager.ensure_indexes(db)

    query = {"student_id": student_id}
    if settings.attendance_retention_hours > 0:
        query["expires_at"] = {"$gt": datetime.utcnow()}

    cursor = db.attendance_reports.find(query).sort("created_at", -1)
    records = await cursor.to_list(length=100)
    
    # Format response
    formatted_records = []
    for record in records:
        formatted_records.append({
            "class_id": record["class_id"],
            "session_id": record["session_id"],
            "started_at": record["started_at"],
            "ended_at": record.get("ended_at"),
            "engagement_percentage": round(float(record.get("engagement_ratio", 0) or 0) * 100, 2),
            "engagement_time_seconds": record.get("engagement_time_seconds", 0),
            "section": record.get("section") or "N/A",
            "status": record.get("attendance_status", AttendanceStatus.ABSENT.value)
        })
    
    return formatted_records


@router.websocket("/ws/{class_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    class_id: str,
    token: str,
    db=Depends(get_db)
):
    """
    WebSocket endpoint for real-time engagement updates.
    
    Multi-college validation: Users can only connect to classes
    from their own college and department.
    
    Teachers connect to monitor student engagement in real-time.
    
    Args:
        websocket: WebSocket connection
        class_id: Class identifier to monitor
        token: JWT authentication token
        db: Database instance
    """
    try:
        # Verify JWT token
        from app.auth import decode_access_token
        
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        # Get user from database
        user_doc = await db.users.find_one({"_id": user_id})
        
        if not user_doc:
            await websocket.close(code=1008, reason="User not found")
            return
        
        # ═══════════════════════════════════════════════════════════════════
        # MULTI-COLLEGE VALIDATION: Verify user belongs to same college/dept
        # ═══════════════════════════════════════════════════════════════════
        class_doc = await db.classes.find_one({"class_id": class_id})
        
        if not class_doc:
            await websocket.close(code=1008, reason="Class not found")
            return
        
        # Extract college/department from JWT payload (not user_doc to ensure fresh data)
        user_college = payload.get("college_name") or user_doc.get("college_name")
        user_department = payload.get("department_name") or user_doc.get("department_name")
        
        if class_doc.get("college_name") != user_college:
            logger.warning(f"✗ WebSocket rejected: user {user_id} - college mismatch")
            await websocket.close(code=1008, reason="Access denied: different college")
            return
        
        if class_doc.get("department_name") != user_department:
            logger.warning(f"✗ WebSocket rejected: user {user_id} - department mismatch")
            await websocket.close(code=1008, reason="Access denied: different department")
            return
        # ═══════════════════════════════════════════════════════════════════
        
        # Connect to WebSocket manager
        connection_manager = get_connection_manager()
        await connection_manager.connect(
            websocket=websocket,
            class_id=class_id,
            user_id=user_id,
            role=user_doc["role"]
        )
        
        # Keep connection alive
        try:
            while True:
                # Wait for client messages (heartbeat, etc.)
                data = await websocket.receive_text()
                
                # Echo back to confirm connection
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        except WebSocketDisconnect:
            connection_manager.disconnect(websocket, class_id, user_id)
            logger.info(f"WebSocket disconnected: user={user_id}, class={class_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=1011, reason="Internal error")


@router.get("/live/{class_id}")
async def get_live_attendance(
    class_id: str,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Get live attendance data for an active class session (teacher only).
    
    Returns real-time attendance status for all students currently in the class.
    
    Args:
        class_id: Class identifier
        current_user: Authenticated teacher
        db: Database instance
        
    Returns:
        List of current student attendance records with real-time status
    """
    # Verify class exists and teacher owns it
    class_doc = await db.classes.find_one({"class_id": class_id})
    
    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_doc["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this class"
        )
    
    attendance_manager = get_attendance_manager()
    await attendance_manager.ensure_indexes(db)

    # Get active attendance sessions for this class
    cursor = db.attendance.find({
        "class_id": class_id,
        "status": "in_progress"
    })
    records = await cursor.to_list(length=None)
    
    # Format response with real-time status
    live_data = []
    current_time = datetime.utcnow()
    
    for record in records:
        last_seen = record.get("last_frame_timestamp")
        is_active = False
        
        if last_seen:
            seconds_since_seen = (current_time - last_seen).total_seconds()
            is_active = seconds_since_seen < 10  # Active if seen in last 10 seconds
        
        live_data.append({
            "student_id": record["student_id"],
            "student_name": record["student_name"],
            "section": record.get("section") or "N/A",
            "face_detected": record.get("is_face_detected", False),
            "looking_at_screen": record.get("is_looking_at_screen", False),
            "engagement_percentage": record.get("engagement_percentage", 0),
            "attention_score": record.get("attention_score", 0),
            "multiple_faces": record.get("multiple_faces_detected", False),
            "is_active": is_active,
            "last_seen": last_seen.isoformat() if last_seen else None,
            "joined_at": record["started_at"].isoformat()
        })
    
    return {
        "class_id": class_id,
        "class_title": class_doc.get("title", "Unknown"),
        "is_active": class_doc.get("is_active", False),
        "student_count": len(live_data),
        "students": live_data
    }


@router.get("/export/{class_id}/{session_id}")
async def export_attendance(
    class_id: str,
    session_id: str,
    format: str = "csv",
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Export attendance data for a class session (teacher only).
    
    Args:
        class_id: Class identifier
        session_id: Session identifier
        format: Export format (csv)
        current_user: Authenticated teacher
        db: Database instance
        
    Returns:
        CSV file with attendance data
    """
    # Verify class exists and teacher owns it
    class_doc = await db.classes.find_one({"class_id": class_id})
    
    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_doc["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to export this class"
        )
    
    attendance_manager = get_attendance_manager()
    report = await attendance_manager.get_class_attendance_report(class_id, session_id, db)

    if not report.attendance_records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No attendance records found for this session"
        )
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Name",
        "Engagement Time",
        "Attendance %",
        "Status",
    ])
    
    # Data rows
    for record in report.attendance_records:
        writer.writerow([
            record.get("student_name", "Unknown"),
            record.get("engagement_time_label", "0s"),
            f"{round(record.get('engagement_percentage', 0), 2)}%",
            str(record.get("attendance_status", "unknown")).title(),
        ])
    
    # Return CSV response
    output.seek(0)
    filename = f"attendance_{class_id}_{session_id}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export-excel/{class_id}/{session_id}")
async def export_attendance_excel(
    class_id: str,
    session_id: str,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Export attendance data as EXCEL file (formatted with colors & summary).

    Features:
    - Professional formatting with headers
    - Green for PRESENT, Red for ABSENT
    - Engagement time and percentage columns
    - Summary statistics
    - Automatically downloaded to user's computer

    Args:
        class_id: Class identifier
        session_id: Session identifier
        current_user: Authenticated teacher
        db: Database instance

    Returns:
        Excel file (.xlsx) for download
    """
    # Verify class exists and teacher owns it
    class_doc = await db.classes.find_one({"class_id": class_id})

    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    if class_doc["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to export this class"
        )

    attendance_manager = get_attendance_manager()
    report = await attendance_manager.get_class_attendance_report(class_id, session_id, db)

    if not report.attendance_records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No attendance records found for this session"
        )

    try:
        # Generate Excel file
        exporter = get_attendance_excel_exporter()
        excel_file = exporter.generate_attendance_excel(
            report=report.model_dump(),
            class_doc=class_doc
        )

        # Return Excel response
        filename = f"attendance_{class_doc.get('title', class_id)}__{session_id}.xlsx"
        # Clean filename
        filename = filename.replace(" ", "_").replace("/", "-")

        logger.info(f"✓ Excel attendance report exported: {filename}")

        return StreamingResponse(
            iter([excel_file.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Excel export not available: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error exporting Excel: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating Excel file: {str(e)}"
        )


@router.get("/export-excel-bulk/{class_id}")
async def export_attendance_excel_bulk(
    class_id: str,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db),
    limit: int = 25
):
    """
    Export ALL attendance records for a class as EXCEL (multiple sheets).

    One sheet per class session with:
    - Separate sheets for each session
    - Professional formatting
    - Summary statistics per session
    - Green (PRESENT) and Red (ABSENT) highlighting

    Args:
        class_id: Class identifier
        current_user: Authenticated teacher
        db: Database instance
        limit: Maximum number of sessions to export

    Returns:
        Excel file (.xlsx) with multiple sheets
    """
    # Verify class exists and teacher owns it
    class_doc = await db.classes.find_one({"class_id": class_id})

    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    if class_doc["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to export this class"
        )

    try:
        attendance_manager = get_attendance_manager()

        # Get all attendance reports for this class
        summaries = await attendance_manager.list_class_reports(
            class_id=class_id,
            db=db,
            limit=limit
        )

        if not summaries:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No attendance records found for this class"
            )

        # Fetch full reports for each summary
        reports_list = []
        for summary in summaries:
            full_report = await attendance_manager.get_class_attendance_report(
                class_id=class_id,
                session_id=summary["session_id"],
                db=db
            )
            if full_report.attendance_records:
                reports_list.append(full_report.model_dump())

        if not reports_list:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No finalized attendance records found"
            )

        # Generate bulk Excel file
        exporter = get_attendance_excel_exporter()
        excel_file = exporter.generate_bulk_attendance_excel(
            reports_list=reports_list,
            class_doc=class_doc
        )

        # Return Excel response
        filename = f"attendance_all__{class_doc.get('title', class_id)}__{len(reports_list)}_sessions.xlsx"
        filename = filename.replace(" ", "_").replace("/", "-")

        logger.info(f"✓ Bulk Excel report exported: {filename} ({len(reports_list)} sessions)")

        return StreamingResponse(
            iter([excel_file.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Excel export not available: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error exporting bulk Excel: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating Excel file: {str(e)}"
        )
