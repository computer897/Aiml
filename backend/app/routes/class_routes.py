"""
API routes for classroom management.
Handles class creation, retrieval, and student enrollment.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from app.attendance import get_attendance_manager
from app.models import ClassCreate, ClassResponse, Class, User, ClassNotificationResponse
from app.auth import get_current_teacher, get_current_student, get_current_user
from app.database import get_db
from app.websocket import get_connection_manager
from datetime import datetime, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/class", tags=["Classroom"])


class ClassUpdate(BaseModel):
    """Schema for updating a class."""
    title: Optional[str] = None
    description: Optional[str] = None
    schedule_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None


@router.post("/create", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
async def create_class(
    class_data: ClassCreate,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Create a new class (teacher only).
    
    Args:
        class_data: Class creation data
        current_user: Authenticated teacher
        db: Database instance
        
    Returns:
        Created class information
        
    Raises:
        HTTPException: If class_id already exists
    """
    # Check if class_id already exists
    existing_class = await db.classes.find_one({"class_id": class_data.class_id})
    if existing_class:
        logger.warning(f"Duplicate class_id attempted: {class_data.class_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Class ID '{class_data.class_id}' already exists. Please use a different Class ID."
        )
    
    # Create class document with multi-college fields auto-assigned from teacher
    # NOTE: college_name and department_name are NOT sent from frontend
    # They are extracted from the authenticated teacher's profile for security
    class_doc = {
        "class_id": class_data.class_id,
        "title": class_data.title,
        "description": class_data.description,
        "teacher_id": current_user.id,
        "teacher_name": current_user.name,
        "schedule_time": class_data.schedule_time,
        "duration_minutes": class_data.duration_minutes,
        "is_active": False,
        "is_finished": False,  # Explicitly set to ensure it's always present
        "enrolled_students": [],
        "created_at": datetime.utcnow(),
        # Multi-college system fields (internal use only)
        "college_name": current_user.college_name,
        "department_name": current_user.department_name,
        "created_by": current_user.id
    }
    
    # Insert into database
    result = await db.classes.insert_one(class_doc)
    class_doc["id"] = str(result.inserted_id)
    
    # Automatically create a reminder notification for enrolled students
    try:
        schedule_time = class_data.schedule_time
        if schedule_time:
            time_label = schedule_time.strftime("%b %d, %Y at %I:%M %p")
        else:
            time_label = "soon"

        notification_doc = {
            "class_id": class_data.class_id,
            "class_title": class_data.title,
            "teacher_id": current_user.id,
            "teacher_name": current_user.name,
            "title": f"New Class Scheduled: {class_data.title}",
            "message": f"{class_data.title} is scheduled for {time_label}.", 
            "type": "reminder",
            "schedule_time": schedule_time,
            "created_at": datetime.utcnow()
        }
        await db.class_notifications.insert_one(notification_doc)
    except Exception as exc:
        logger.warning(f"Unable to create notification for class {class_data.class_id}: {exc}")

    logger.info(f"✓ Class created: {class_data.class_id} by teacher {current_user.name}")
    
    return ClassResponse(**class_doc)


# ── Static routes MUST come before /{class_id} to avoid being shadowed ──

@router.get("/teacher/classes", response_model=List[ClassResponse])
async def get_teacher_classes(
    current_user: User = Depends(get_current_teacher),
    include_finished: bool = False,
    db=Depends(get_db)
):
    """
    Get all classes created by the current teacher.
    By default, excludes finished classes (auto-cleanup).
    """
    query = {"teacher_id": current_user.id}
    if not include_finished:
        # Exclude finished classes from the list
        query["$or"] = [{"is_finished": {"$ne": True}}, {"is_finished": {"$exists": False}}]
    
    cursor = db.classes.find(query)
    classes = []
    
    async for class_doc in cursor:
        class_doc["id"] = str(class_doc["_id"])
        classes.append(ClassResponse(**class_doc))
    
    logger.info(f"✓ Retrieved {len(classes)} classes for teacher {current_user.name}")
    return classes


@router.get("/student/classes", response_model=List[ClassResponse])
async def get_student_classes(
    current_user: User = Depends(get_current_student),
    include_finished: bool = False,
    db=Depends(get_db)
):
    """
    Get all classes the current student is enrolled in.
    Google Meet style - shows all enrolled classes regardless of college/department.
    By default, excludes finished classes (auto-cleanup).
    """
    # Build query - filter by enrolled status
    query = {"enrolled_students": current_user.id}
    if not include_finished:
        # Exclude finished classes from the list
        query["$or"] = [{"is_finished": {"$ne": True}}, {"is_finished": {"$exists": False}}]
    
    cursor = db.classes.find(query)
    classes = []
    
    async for class_doc in cursor:
        class_doc["id"] = str(class_doc["_id"])
        classes.append(ClassResponse(**class_doc))
    
    logger.info(f"✓ Retrieved {len(classes)} classes for student {current_user.name}")
    return classes


@router.get("/student/notifications", response_model=List[ClassNotificationResponse])
async def get_student_notifications(
    current_user: User = Depends(get_current_student),
    db=Depends(get_db)
):
    """Return scheduled class notifications for the student's enrolled classes."""
    cursor = db.classes.find({"enrolled_students": current_user.id})
    class_map = {}
    async for class_doc in cursor:
        class_map[class_doc["class_id"]] = {
            "title": class_doc.get("title"),
            "teacher_name": class_doc.get("teacher_name"),
        }

    if not class_map:
        return []

    notifications_cursor = db.class_notifications.find(
        {"class_id": {"$in": list(class_map.keys())}}
    ).sort("created_at", -1).limit(100)

    notifications: List[ClassNotificationResponse] = []
    async for doc in notifications_cursor:
        doc_id = str(doc.get("_id"))
        doc.pop("_id", None)
        class_id = doc.get("class_id")
        doc["id"] = doc_id
        doc["class_title"] = doc.get("class_title") or class_map.get(class_id, {}).get("title")
        doc["teacher_name"] = doc.get("teacher_name") or class_map.get(class_id, {}).get("teacher_name")
        notifications.append(ClassNotificationResponse(**doc))

    return notifications


@router.get("/student/available", response_model=List[ClassResponse])
async def get_available_classes(
    current_user: User = Depends(get_current_student),
    db=Depends(get_db)
):
    """
    Get all available classes the student can join.
    Google Meet style - shows all active classes not yet enrolled.
    """
    # Find all non-enrolled, non-finished classes (Google Meet style)
    cursor = db.classes.find({
        "enrolled_students": {"$ne": current_user.id},  # Not already enrolled
        "$or": [{"is_finished": {"$ne": True}}, {"is_finished": {"$exists": False}}]
    })
    classes = []
    
    async for class_doc in cursor:
        class_doc["id"] = str(class_doc["_id"])
        classes.append(ClassResponse(**class_doc))
    
    logger.info(f"✓ Found {len(classes)} available classes for student {current_user.name}")
    return classes


@router.get("/{class_id}", response_model=ClassResponse)
async def get_class(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Get class details by class_id.

    Google Meet style: Any authenticated user can view class details
    using the class ID. No college/department restrictions.

    Args:
        class_id: Class identifier
        current_user: Authenticated user
        db: Database instance

    Returns:
        Class information

    Raises:
        HTTPException: If class not found
    """
    class_doc = await db.classes.find_one({"class_id": class_id})

    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    # Auto-end class if scheduled end time has passed
    if class_doc.get("is_active") and class_doc.get("schedule_time") and class_doc.get("duration_minutes"):
        schedule_time = class_doc["schedule_time"]
        duration_minutes = class_doc["duration_minutes"]
        end_time = schedule_time + timedelta(minutes=duration_minutes)

        if datetime.utcnow() >= end_time:
            logger.info(f"Auto-ending class {class_id} - scheduled end time reached")
            # Update the class to mark it as finished
            await db.classes.update_one(
                {"class_id": class_id},
                {
                    "$set": {
                        "is_active": False,
                        "is_finished": True,
                        "status": "ended"
                    }
                }
            )
            class_doc["is_active"] = False
            class_doc["is_finished"] = True
            class_doc["status"] = "ended"

    # Google Meet style - anyone with the class ID can access
    # No college/department restrictions

    class_doc["id"] = str(class_doc["_id"])
    return ClassResponse(**class_doc)


@router.post("/{class_id}/join", response_model=dict)
async def join_class(
    class_id: str,
    current_user: User = Depends(get_current_student),
    db=Depends(get_db)
):
    """
    Student joins a class using class_id.
    
    Google Meet style: Any student can join any class with the class ID.
    No college/department restrictions.
    
    Args:
        class_id: Class identifier to join
        current_user: Authenticated student
        db: Database instance
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If class not found or already enrolled
    """
    class_doc = await db.classes.find_one({"class_id": class_id})
    
    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    # Google Meet style - anyone with the class ID can join
    # No college/department restrictions
    
    # Check if already enrolled
    if current_user.id in class_doc.get("enrolled_students", []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already enrolled in this class"
        )
    
    # Add student to enrolled list
    await db.classes.update_one(
        {"_id": class_doc["_id"]},
        {"$push": {"enrolled_students": current_user.id}}
    )
    
    logger.info(f"✓ Student {current_user.name} joined class {class_id}")
    
    return {
        "message": "Successfully joined class",
        "class_id": class_id,
        "class_title": class_doc["title"]
    }


@router.get("/{class_id}/students", response_model=List[dict])
async def get_class_students(
    class_id: str,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Get list of enrolled students for a class (teacher only).
    
    Args:
        class_id: Class identifier
        current_user: Authenticated teacher
        db: Database instance
        
    Returns:
        List of enrolled students
        
    Raises:
        HTTPException: If class not found or unauthorized
    """
    class_doc = await db.classes.find_one({"class_id": class_id})
    
    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    # Verify teacher owns this class
    if class_doc["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this class"
        )
    
    # Fetch student details
    student_ids = class_doc.get("enrolled_students", [])
    students = []
    
    for student_id in student_ids:
        student_doc = await db.users.find_one({"_id": student_id})
        if student_doc:
            students.append({
                "id": student_id,
                "name": student_doc["name"],
                "email": student_doc["email"]
            })
    
    return students


@router.post("/{class_id}/activate", response_model=dict)
async def activate_class(
    class_id: str,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Activate a class session (teacher only).

    IMPORTANT: Schedules automatic class end when duration expires.
    Teacher can also manually end class before time runs out.

    Args:
        class_id: Class identifier
        current_user: Authenticated teacher
        db: Database instance

    Returns:
        Success message with session ID and duration
    """
    class_doc = await db.classes.find_one({"class_id": class_id})

    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    if class_doc["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to activate this class"
        )

    # Check if class has already passed its scheduled end time
    if class_doc.get("schedule_time") and class_doc.get("duration_minutes"):
        schedule_time = class_doc["schedule_time"]
        duration_minutes = class_doc["duration_minutes"]
        end_time = schedule_time + timedelta(minutes=duration_minutes)

        if datetime.utcnow() >= end_time:
            logger.warning(f"Cannot activate class {class_id} - scheduled end time has passed")
            # Auto-mark as finished
            await db.classes.update_one(
                {"class_id": class_id},
                {
                    "$set": {
                        "is_active": False,
                        "is_finished": True,
                        "status": "ended"
                    }
                }
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot activate class - scheduled end time ({end_time.isoformat()}) has already passed"
            )

    # Generate session ID
    session_id = f"{class_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    session_started_at = datetime.utcnow()
    duration_minutes = class_doc.get("duration_minutes", 60)

    # Mark class as active
    await db.classes.update_one(
        {"_id": class_doc["_id"]},
        {"$set": {
            "is_active": True,
            "is_finished": False,
            "auto_ended": False,  # Reset auto-end flag
            "active_session_id": session_id,
            "session_started_at": session_started_at,
            "ended_at": None,
        }}
    )

    # AUTOMATIC END DISABLED - Classes now stay open indefinitely
    # Uncomment below to re-enable auto-end scheduling
    # from app.class_scheduler import get_class_scheduler
    # scheduler = get_class_scheduler()
    # await scheduler.schedule_auto_end(
    #     class_id=class_id,
    #     session_id=session_id,
    #     duration_minutes=duration_minutes,
    #     db=db
    # )

    logger.info(
        f"✓ Class {class_id} activated with session {session_id} "
        f"(no auto-end - class stays open until manually closed)"
    )

    return {
        "message": "Class activated - will stay open until manually closed by teacher",
        "class_id": class_id,
        "session_id": session_id,
        "started_at": session_started_at.isoformat(),
        "duration_minutes": duration_minutes,
    }


@router.post("/{class_id}/deactivate", response_model=dict)
async def deactivate_class(
    class_id: str,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Manually end a class session BEFORE duration expires (teacher only).

    IMPORTANT: This triggers immediate attendance finalization.
    If teacher doesn't call this, class will auto-end after duration.

    Args:
        class_id: Class identifier
        current_user: Authenticated teacher
        db: Database instance

    Returns:
        Success message with attendance report

    Raises:
        HTTPException: If class not found or unauthorized
    """
    class_doc = await db.classes.find_one({"class_id": class_id})

    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    if class_doc["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to deactivate this class"
        )

    # CANCEL AUTO-END TASK if running
    from app.class_scheduler import get_class_scheduler
    scheduler = get_class_scheduler()
    was_auto_end_scheduled = scheduler.cancel_auto_end(class_id)

    ended_at = datetime.utcnow()
    attendance_report = None

    # FINALIZE ATTENDANCE IMMEDIATELY
    attendance_manager = get_attendance_manager()
    session_id = class_doc.get("active_session_id")

    if session_id:
        try:
            attendance_report = await attendance_manager.finalize_class_attendance(
                class_doc=class_doc,
                session_id=session_id,
                ended_at=ended_at,
                db=db,
            )

            # BROADCAST ATTENDANCE to all connected students/teachers
            connection_manager = get_connection_manager()
            for record in attendance_report.attendance_records:
                await connection_manager.broadcast_attendance_status(
                    class_id=class_id,
                    student_id=record["student_id"],
                    student_name=record["student_name"],
                    status=record["attendance_status"],
                    engagement_percentage=record["engagement_percentage"],
                )

            logger.info(
                f"✓ Attendance finalized (manual end): "
                f"{attendance_report.present_count} present, "
                f"{attendance_report.absent_count} absent"
            )

        except Exception as exc:
            logger.error("Failed to finalize attendance: %s", exc)
            attendance_report = None

    # Mark class as finished (MANUALLY)
    await db.classes.update_one(
        {"_id": class_doc["_id"]},
        {"$set": {
            "is_active": False,
            "is_finished": True,
            "active_session_id": None,
            "session_started_at": None,
            "ended_at": ended_at,
            "auto_ended": False,  # Not auto-ended
            "ended_reason": "Manually ended by teacher",
        }}
    )

    logger.info(
        f"✓ Class {class_id} manually ended by {current_user.name} "
        f"(auto-end was {'scheduled' if was_auto_end_scheduled else 'not scheduled'})"
    )

    return {
        "message": "Class ended successfully - attendance finalized",
        "class_id": class_id,
        "ended_at": ended_at.isoformat(),
        "manually_ended": True,
        "attendance_report": attendance_report.model_dump() if attendance_report else None
    }


@router.put("/{class_id}", response_model=ClassResponse)
async def update_class(
    class_id: str,
    class_update: ClassUpdate,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Update a class (teacher only).
    
    Args:
        class_id: Class identifier
        class_update: Fields to update
        current_user: Authenticated teacher
        db: Database instance
        
    Returns:
        Updated class information
        
    Raises:
        HTTPException: If class not found or unauthorized
    """
    class_doc = await db.classes.find_one({"class_id": class_id})
    
    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_doc["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this class"
        )
    
    # Build update document
    update_doc = {}
    if class_update.title:
        update_doc["title"] = class_update.title
    if class_update.description is not None:
        update_doc["description"] = class_update.description
    if class_update.schedule_time:
        update_doc["schedule_time"] = class_update.schedule_time
    if class_update.duration_minutes:
        update_doc["duration_minutes"] = class_update.duration_minutes
    
    if not update_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    update_doc["updated_at"] = datetime.utcnow()
    
    await db.classes.update_one(
        {"_id": class_doc["_id"]},
        {"$set": update_doc}
    )
    
    # Fetch updated document
    updated_doc = await db.classes.find_one({"class_id": class_id})
    updated_doc["id"] = str(updated_doc["_id"])
    
    logger.info(f"✓ Class {class_id} updated by teacher {current_user.name}")
    
    return ClassResponse(**updated_doc)


@router.delete("/{class_id}", response_model=dict)
async def delete_class(
    class_id: str,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Delete a class (teacher only).
    
    Args:
        class_id: Class identifier
        current_user: Authenticated teacher
        db: Database instance
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If class not found or unauthorized
    """
    class_doc = await db.classes.find_one({"class_id": class_id})
    
    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_doc["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this class"
        )
    
    # Delete the class
    await db.classes.delete_one({"_id": class_doc["_id"]})
    
    # Also delete related attendance records
    await db.attendance.delete_many({"class_id": class_id})
    await db.attendance_reports.delete_many({"class_id": class_id})
    
    logger.info(f"✓ Class {class_id} deleted by teacher {current_user.name}")
    
    return {
        "message": "Class deleted successfully",
        "class_id": class_id
    }


@router.post("/admin/check-expired", response_model=dict)
async def check_and_end_expired_classes(
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    ADMIN ENDPOINT: Manually check for expired classes and auto-end them.

    This is useful for:
    - Manual trigger if auto-end fails
    - Testing purposes
    - Recovery from crashes

    Only teachers can call this (can later restrict to admin only).

    Returns:
        List of classes that were auto-ended
    """
    try:
        expired_classes = []
        current_time = datetime.utcnow()

        # Find all active classes that have exceeded their duration
        cursor = db.classes.find({
            "is_active": True,
            "session_started_at": {"$exists": True},
            "duration_minutes": {"$exists": True}
        })

        active_classes = await cursor.to_list(length=None)

        for class_doc in active_classes:
            session_started = class_doc["session_started_at"]
            duration_minutes = class_doc.get("duration_minutes", 60)
            duration_seconds = duration_minutes * 60

            elapsed_seconds = (current_time - session_started).total_seconds()

            # Check if class duration has expired
            if elapsed_seconds >= duration_seconds:
                class_id = class_doc["class_id"]
                logger.info(f"📋 Found expired class: {class_id} (elapsed: {elapsed_seconds}s, duration: {duration_seconds}s)")

                # Auto-end the class
                try:
                    from app.class_scheduler import get_class_scheduler
                    scheduler = get_class_scheduler()

                    # Cancel auto-end task (if still exists)
                    scheduler.cancel_auto_end(class_id)

                    # Finalize attendance
                    attendance_manager = get_attendance_manager()
                    ended_at = datetime.utcnow()
                    session_id = class_doc.get("active_session_id")

                    if session_id:
                        attendance_report = await attendance_manager.finalize_class_attendance(
                            class_doc=class_doc,
                            session_id=session_id,
                            ended_at=ended_at,
                            db=db,
                        )

                        # Broadcast to connected clients
                        connection_manager = get_connection_manager()
                        for record in attendance_report.attendance_records:
                            await connection_manager.broadcast_attendance_status(
                                class_id=class_id,
                                student_id=record["student_id"],
                                student_name=record["student_name"],
                                status=record["attendance_status"],
                                engagement_percentage=record["engagement_percentage"],
                            )

                    # Mark as finished
                    await db.classes.update_one(
                        {"_id": class_doc["_id"]},
                        {"$set": {
                            "is_active": False,
                            "is_finished": True,
                            "active_session_id": None,
                            "session_started_at": None,
                            "ended_at": ended_at,
                            "auto_ended": True,
                            "ended_reason": "Manually triggered auto-end (admin check)",
                        }}
                    )

                    expired_classes.append({
                        "class_id": class_id,
                        "ended_at": ended_at.isoformat(),
                        "elapsed_seconds": elapsed_seconds,
                    })

                    logger.info(f"✓ Auto-ended expired class: {class_id}")

                except Exception as e:
                    logger.error(f"Error auto-ending class {class_id}: {e}")

        return {
            "message": f"Checked and auto-ended {len(expired_classes)} expired classes",
            "expired_classes": expired_classes,
            "count": len(expired_classes)
        }

    except Exception as e:
        logger.error(f"Error in check-expired endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking expired classes: {str(e)}"
        )


@router.get("/admin/scheduler-status", response_model=dict)
async def get_scheduler_status(
    current_user: User = Depends(get_current_teacher),
):
    """
    ADMIN ENDPOINT: Get scheduler status information.

    Shows:
    - Number of active auto-end tasks
    - Can be useful for debugging and monitoring

    Returns:
        Scheduler status information
    """
    try:
        from app.class_scheduler import get_class_scheduler
        scheduler = get_class_scheduler()

        active_count = scheduler.get_active_classes()

        logger.info(f"Scheduler status requested: {active_count} active classes")

        return {
            "message": "Scheduler status retrieved",
            "active_auto_end_tasks": active_count,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error getting scheduler status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting scheduler status: {str(e)}"
        )


# (teacher/classes and student/classes routes moved above /{class_id} to fix route ordering)
