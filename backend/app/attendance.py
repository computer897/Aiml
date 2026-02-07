"""
Attendance tracking and management module.
Handles student engagement tracking, attendance calculation, and status updates.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict
from app.models import (
    Attendance, AttendanceStatus, AttendanceStart, 
    FrameData, AttendanceReport
)
from app.config import settings
from app.face_detection import FaceDetector
from app.database import get_db
import logging

logger = logging.getLogger(__name__)


class AttendanceManager:
    """
    Manages attendance tracking for students during class sessions.
    Tracks engagement time and calculates attendance status.
    """
    
    def __init__(self):
        """Initialize attendance manager."""
        self.active_sessions: Dict[str, datetime] = {}  # session_id -> last_engaged_time
        logger.info("✓ Attendance manager initialized")
    
    async def start_attendance_session(
        self, 
        student_id: str,
        student_name: str,
        class_id: str,
        session_id: str,
        class_duration_minutes: int,
        db
    ) -> Attendance:
        """
        Start a new attendance tracking session for a student.
        
        Args:
            student_id: Student's user ID
            student_name: Student's name
            class_id: Class identifier
            session_id: Unique session identifier
            class_duration_minutes: Expected class duration
            db: Database instance
            
        Returns:
            Created Attendance object
        """
        # Check if session already exists
        existing = await db.attendance.find_one({
            "session_id": session_id,
            "student_id": student_id
        })
        
        if existing:
            logger.info(f"Attendance session already exists for student {student_id}")
            existing["id"] = existing["_id"]
            return Attendance(**existing)
        
        # Create new attendance record
        attendance = Attendance(
            student_id=student_id,
            student_name=student_name,
            class_id=class_id,
            session_id=session_id,
            total_class_duration_seconds=class_duration_minutes * 60,
            started_at=datetime.utcnow()
        )
        
        # Insert into database
        result = await db.attendance.insert_one(attendance.dict(by_alias=True, exclude={"id"}))
        attendance.id = str(result.inserted_id)
        
        # Track in active sessions
        self.active_sessions[f"{session_id}_{student_id}"] = datetime.utcnow()
        
        logger.info(f"✓ Started attendance session for student {student_id} in class {class_id}")
        return attendance
    
    async def process_frame(
        self,
        frame_data: FrameData,
        face_detector: FaceDetector,
        db
    ) -> Dict:
        """
        Process a webcam frame and update engagement tracking.
        
        This is the core attendance logic:
        1. Detect face in frame
        2. Check if looking at screen
        3. If engaged (face present AND looking at screen), increment engagement time
        4. Update attendance record in real-time
        
        Args:
            frame_data: Frame data containing image and metadata
            face_detector: Face detector instance
            db: Database instance
            
        Returns:
            Dictionary with detection results and updated attendance info
        """
        try:
            # Find attendance record
            attendance_doc = await db.attendance.find_one({
                "session_id": frame_data.session_id,
                "student_id": frame_data.student_id
            })
            
            if not attendance_doc:
                logger.warning(f"No attendance record found for session {frame_data.session_id}")
                return {
                    "success": False,
                    "message": "Attendance session not found"
                }
            
            # Analyze frame for face detection
            face_detected, looking_at_screen = face_detector.analyze_frame(frame_data.frame_base64)
            
            # Calculate engagement time increment
            current_time = datetime.utcnow()
            session_key = f"{frame_data.session_id}_{frame_data.student_id}"
            
            # Calculate time since last frame
            last_engaged_time = self.active_sessions.get(session_key)
            time_increment = 0
            
            if last_engaged_time:
                # Calculate seconds since last update
                time_diff = (current_time - last_engaged_time).total_seconds()
                
                # Only count if face is detected AND looking at screen
                # Cap at frame interval + buffer to prevent manipulation
                if face_detected and looking_at_screen:
                    time_increment = min(time_diff, settings.frame_interval_seconds + 2)
            
            # Update last engaged time
            self.active_sessions[session_key] = current_time
            
            # Update attendance record
            new_engagement_seconds = attendance_doc["engagement_duration_seconds"] + time_increment
            total_duration = attendance_doc["total_class_duration_seconds"]
            
            # Calculate engagement percentage
            engagement_percentage = (new_engagement_seconds / total_duration * 100) if total_duration > 0 else 0
            
            # Update database
            update_data = {
                "last_frame_timestamp": current_time,
                "is_face_detected": face_detected,
                "is_looking_at_screen": looking_at_screen,
                "engagement_duration_seconds": new_engagement_seconds,
                "engagement_percentage": round(engagement_percentage, 2)
            }
            
            await db.attendance.update_one(
                {"_id": attendance_doc["_id"]},
                {"$set": update_data}
            )
            
            logger.debug(f"Frame processed for student {frame_data.student_id}: "
                        f"face={face_detected}, looking={looking_at_screen}, "
                        f"engagement={engagement_percentage:.1f}%")
            
            return {
                "success": True,
                "face_detected": face_detected,
                "looking_at_screen": looking_at_screen,
                "engagement_percentage": round(engagement_percentage, 2),
                "engagement_seconds": new_engagement_seconds,
                "time_increment": time_increment
            }
            
        except Exception as e:
            logger.error(f"Error processing frame: {e}")
            return {
                "success": False,
                "message": str(e)
            }
    
    async def end_attendance_session(
        self,
        session_id: str,
        student_id: str,
        db
    ) -> Optional[Attendance]:
        """
        End an attendance session and finalize attendance status.
        
        Determines final status based on engagement percentage:
        - >= threshold (default 75%) -> PRESENT
        - < threshold -> ABSENT
        
        Args:
            session_id: Session identifier
            student_id: Student's user ID
            db: Database instance
            
        Returns:
            Updated Attendance object, or None if not found
        """
        attendance_doc = await db.attendance.find_one({
            "session_id": session_id,
            "student_id": student_id
        })
        
        if not attendance_doc:
            logger.warning(f"No attendance record found for session {session_id}, student {student_id}")
            return None
        
        # Calculate final status
        engagement_percentage = attendance_doc["engagement_percentage"]
        
        if engagement_percentage >= settings.attendance_threshold:
            final_status = AttendanceStatus.PRESENT
        else:
            final_status = AttendanceStatus.ABSENT
        
        # Update record
        await db.attendance.update_one(
            {"_id": attendance_doc["_id"]},
            {
                "$set": {
                    "ended_at": datetime.utcnow(),
                    "status": final_status
                }
            }
        )
        
        # Remove from active sessions
        session_key = f"{session_id}_{student_id}"
        if session_key in self.active_sessions:
            del self.active_sessions[session_key]
        
        logger.info(f"✓ Ended attendance session for student {student_id}: "
                   f"engagement={engagement_percentage:.1f}%, status={final_status}")
        
        # Fetch and return updated record
        updated_doc = await db.attendance.find_one({"_id": attendance_doc["_id"]})
        updated_doc["id"] = updated_doc["_id"]
        return Attendance(**updated_doc)
    
    async def get_class_attendance_report(
        self,
        class_id: str,
        session_id: str,
        db
    ) -> AttendanceReport:
        """
        Generate attendance report for a class session.
        
        Args:
            class_id: Class identifier
            session_id: Session identifier
            db: Database instance
            
        Returns:
            AttendanceReport with summary statistics
        """
        # Fetch class info
        class_doc = await db.classes.find_one({"class_id": class_id})
        class_title = class_doc["title"] if class_doc else "Unknown Class"
        
        # Fetch all attendance records for this session
        cursor = db.attendance.find({"class_id": class_id, "session_id": session_id})
        attendance_records = await cursor.to_list(length=None)
        
        # Calculate statistics
        total_students = len(attendance_records)
        present_count = sum(1 for r in attendance_records if r["status"] == AttendanceStatus.PRESENT)
        absent_count = sum(1 for r in attendance_records if r["status"] == AttendanceStatus.ABSENT)
        
        # Format records for response
        formatted_records = []
        for record in attendance_records:
            formatted_records.append({
                "student_id": record["student_id"],
                "student_name": record["student_name"],
                "engagement_percentage": record["engagement_percentage"],
                "engagement_duration_seconds": record["engagement_duration_seconds"],
                "total_duration_seconds": record["total_class_duration_seconds"],
                "status": record["status"],
                "started_at": record["started_at"],
                "ended_at": record.get("ended_at")
            })
        
        return AttendanceReport(
            class_id=class_id,
            class_title=class_title,
            total_students=total_students,
            present_count=present_count,
            absent_count=absent_count,
            attendance_records=formatted_records
        )


# Global attendance manager instance
attendance_manager = AttendanceManager()


def get_attendance_manager() -> AttendanceManager:
    """
    Get the global attendance manager instance.
    Used for dependency injection.
    
    Returns:
        AttendanceManager instance
    """
    return attendance_manager
