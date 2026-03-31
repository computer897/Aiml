"""Attendance tracking and finalized engagement reporting."""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from app.models import Attendance, AttendanceStatus, FrameData, AttendanceReport
from app.config import settings
from app.face_detection import FaceDetector
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
        self._indexes_ready = False
        self.engagement_sample_seconds = settings.frame_interval_seconds
        logger.info("✓ Attendance manager initialized")

    def _should_enforce_retention(self) -> bool:
        """Return True when attendance reports should expire automatically."""
        return settings.attendance_retention_hours > 0

    def _retention_filter(self) -> Dict[str, Any]:
        """Filter used to fetch only non-expired attendance reports."""
        if self._should_enforce_retention():
            return {"expires_at": {"$gt": datetime.utcnow()}}
        return {}

    async def ensure_indexes(self, db) -> None:
        """Create MongoDB indexes needed for report lookup and TTL cleanup."""
        if self._indexes_ready:
            return

        await db.attendance.create_index(
            [("class_id", 1), ("session_id", 1), ("student_id", 1)],
            name="attendance_class_session_student_idx"
        )
        await db.attendance_reports.create_index(
            [("class_id", 1), ("session_id", 1), ("student_id", 1)],
            unique=True,
            name="attendance_report_unique_idx"
        )
        await db.attendance_reports.create_index(
            [("class_id", 1), ("created_at", -1)],
            name="attendance_report_class_created_idx"
        )
        if self._should_enforce_retention():
            await db.attendance_reports.create_index(
                "expires_at",
                expireAfterSeconds=0,
                name="attendance_report_ttl_idx"
            )
        else:
            try:
                indexes = await db.attendance_reports.index_information()
                if "attendance_report_ttl_idx" in indexes:
                    await db.attendance_reports.drop_index("attendance_report_ttl_idx")
            except Exception as exc:
                logger.warning("Unable to drop TTL index for attendance reports: %s", exc)
        self._indexes_ready = True

    def _format_duration_label(self, total_seconds: int) -> str:
        minutes = total_seconds // 60
        seconds = total_seconds % 60
        if minutes and seconds:
            return f"{minutes}m {seconds}s"
        if minutes:
            return f"{minutes} min"
        return f"{seconds}s"

    def _normalize_status(self, status: Any) -> str:
        return status.value if isinstance(status, AttendanceStatus) else str(status)

    def _serialize_report_row(self, record: dict, class_duration_seconds: Optional[int] = None) -> dict:
        engagement_seconds = int(round(record.get("engagement_time_seconds", record.get("engagement_duration_seconds", 0)) or 0))
        duration_seconds = int(round(class_duration_seconds or record.get("class_duration_seconds", record.get("total_class_duration_seconds", 0)) or 0))
        ratio = float(record.get("engagement_ratio", 0) or 0)
        if duration_seconds > 0 and ratio <= 0:
            ratio = min(engagement_seconds / duration_seconds, 1)

        attendance_status = self._normalize_status(record.get("attendance_status", record.get("status", AttendanceStatus.IN_PROGRESS)))

        return {
            "student_id": record.get("student_id"),
            "student_name": record.get("student_name", "Student"),
            "section": record.get("section") or "N/A",
            "attendance_status": attendance_status,
            "status": attendance_status,
            "engagement_time_seconds": engagement_seconds,
            "engagement_time_minutes": round(engagement_seconds / 60, 1),
            "engagement_time_label": self._format_duration_label(engagement_seconds),
            "engagement_ratio": round(ratio, 4),
            "engagement_percentage": round(ratio * 100, 2),
            "class_duration_seconds": duration_seconds,
            "class_duration_label": self._format_duration_label(duration_seconds) if duration_seconds else "0s",
            "class_date": record.get("class_date"),
            "started_at": record.get("started_at"),
            "ended_at": record.get("ended_at"),
        }

    def _build_report_payload(
        self,
        class_doc: Optional[dict],
        session_id: str,
        rows: List[dict],
        started_at: Optional[datetime],
        ended_at: Optional[datetime],
        class_duration_seconds: int,
    ) -> AttendanceReport:
        present_count = sum(1 for row in rows if row["attendance_status"] == AttendanceStatus.PRESENT.value)
        absent_count = sum(1 for row in rows if row["attendance_status"] == AttendanceStatus.ABSENT.value)

        rows.sort(key=lambda row: (row["attendance_status"] != AttendanceStatus.PRESENT.value, row["student_name"].lower()))

        return AttendanceReport(
            class_id=class_doc["class_id"] if class_doc else "",
            session_id=session_id,
            class_title=class_doc.get("title") if class_doc else None,
            teacher_name=class_doc.get("teacher_name") if class_doc else None,
            class_date=started_at.date().isoformat() if started_at else None,
            started_at=started_at,
            ended_at=ended_at,
            class_duration_seconds=class_duration_seconds,
            total_students=len(rows),
            present_count=present_count,
            absent_count=absent_count,
            attendance_records=rows,
        )
    
    async def start_attendance_session(
        self, 
        student_id: str,
        student_name: str,
        class_id: str,
        session_id: str,
        class_duration_minutes: int,
        class_started_at: Optional[datetime],
        class_title: Optional[str],
        teacher_name: Optional[str],
        section: Optional[str],
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
        await self.ensure_indexes(db)

        # Check if session already exists
        existing = await db.attendance.find_one({
            "session_id": session_id,
            "student_id": student_id
        })
        
        if existing:
            await db.attendance.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "student_name": student_name,
                    "class_title": class_title,
                    "teacher_name": teacher_name,
                    "section": section,
                    "class_started_at": class_started_at,
                    "total_class_duration_seconds": class_duration_minutes * 60,
                }}
            )
            existing.update({
                "student_name": student_name,
                "class_title": class_title,
                "teacher_name": teacher_name,
                "section": section,
                "class_started_at": class_started_at,
                "total_class_duration_seconds": class_duration_minutes * 60,
                "id": existing["_id"],
            })
            logger.info(f"Attendance session already exists for student {student_id}")
            return Attendance(**existing)
        
        # Create new attendance record
        attendance = Attendance(
            student_id=student_id,
            student_name=student_name,
            class_id=class_id,
            session_id=session_id,
            class_title=class_title,
            teacher_name=teacher_name,
            section=section,
            class_started_at=class_started_at,
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
            await self.ensure_indexes(db)
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

            if last_engaged_time and face_detected:
                # Fixed increment sampling: each valid detection sample adds one interval.
                time_increment = self.engagement_sample_seconds
            
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
        await self.ensure_indexes(db)
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

    async def build_live_class_report(
        self,
        class_doc: dict,
        session_id: str,
        db
    ) -> AttendanceReport:
        await self.ensure_indexes(db)

        cursor = db.attendance.find({"class_id": class_doc["class_id"], "session_id": session_id})
        attendance_records = await cursor.to_list(length=None)

        session_started_at = class_doc.get("session_started_at") or datetime.utcnow()
        ended_at = class_doc.get("ended_at") or datetime.utcnow()
        class_duration_seconds = max(
            int((ended_at - session_started_at).total_seconds()),
            1,
        )

        rows = []
        for record in attendance_records:
            engagement_seconds = int(round(record.get("engagement_duration_seconds", 0) or 0))
            engagement_ratio = min(engagement_seconds / class_duration_seconds, 1) if class_duration_seconds > 0 else 0
            attendance_status = (
                AttendanceStatus.PRESENT.value
                if engagement_ratio * 100 >= settings.attendance_threshold
                else AttendanceStatus.ABSENT.value
            )

            rows.append(self._serialize_report_row({
                **record,
                "attendance_status": attendance_status,
                "engagement_ratio": engagement_ratio,
                "class_duration_seconds": class_duration_seconds,
                "class_date": session_started_at.date().isoformat(),
                "ended_at": ended_at,
            }, class_duration_seconds=class_duration_seconds))

        return self._build_report_payload(
            class_doc=class_doc,
            session_id=session_id,
            rows=rows,
            started_at=session_started_at,
            ended_at=ended_at,
            class_duration_seconds=class_duration_seconds,
        )

    async def finalize_class_attendance(
        self,
        class_doc: dict,
        session_id: str,
        ended_at: datetime,
        db
    ) -> AttendanceReport:
        await self.ensure_indexes(db)

        session_started_at = class_doc.get("session_started_at") or ended_at
        class_duration_seconds = max(
            int((ended_at - session_started_at).total_seconds()),
            1,
        )
        class_date = session_started_at.date().isoformat()

        cursor = db.attendance.find({"class_id": class_doc["class_id"], "session_id": session_id})
        attendance_records = await cursor.to_list(length=None)

        await db.attendance_reports.delete_many({
            "class_id": class_doc["class_id"],
            "session_id": session_id,
        })

        rows = []
        final_documents = []
        expires_at = (
            ended_at + timedelta(hours=settings.attendance_retention_hours)
            if self._should_enforce_retention()
            else None
        )

        for record in attendance_records:
            engagement_seconds = int(round(record.get("engagement_duration_seconds", 0) or 0))
            engagement_ratio = min(engagement_seconds / class_duration_seconds, 1) if class_duration_seconds > 0 else 0
            attendance_status = (
                AttendanceStatus.PRESENT
                if engagement_ratio * 100 >= settings.attendance_threshold
                else AttendanceStatus.ABSENT
            )

            final_row = self._serialize_report_row({
                **record,
                "attendance_status": attendance_status,
                "engagement_ratio": engagement_ratio,
                "class_duration_seconds": class_duration_seconds,
                "class_date": class_date,
                "ended_at": ended_at,
            }, class_duration_seconds=class_duration_seconds)
            rows.append(final_row)

            doc = {
                "class_id": class_doc["class_id"],
                "session_id": session_id,
                "class_title": class_doc.get("title"),
                "teacher_name": class_doc.get("teacher_name"),
                "student_id": final_row["student_id"],
                "student_name": final_row["student_name"],
                "section": final_row["section"],
                "attendance_status": final_row["attendance_status"],
                "engagement_time_seconds": final_row["engagement_time_seconds"],
                "engagement_ratio": final_row["engagement_ratio"],
                "class_duration_seconds": class_duration_seconds,
                "class_date": class_date,
                "started_at": session_started_at,
                "ended_at": ended_at,
                "created_at": datetime.utcnow(),
            }

            if expires_at:
                doc["expires_at"] = expires_at

            final_documents.append(doc)

            await db.attendance.update_one(
                {"_id": record["_id"]},
                {"$set": {
                    "ended_at": ended_at,
                    "engagement_percentage": final_row["engagement_percentage"],
                    "status": attendance_status.value,
                }}
            )

            session_key = f"{session_id}_{record['student_id']}"
            self.active_sessions.pop(session_key, None)

        if final_documents:
            await db.attendance_reports.insert_many(final_documents)

        return self._build_report_payload(
            class_doc=class_doc,
            session_id=session_id,
            rows=rows,
            started_at=session_started_at,
            ended_at=ended_at,
            class_duration_seconds=class_duration_seconds,
        )

    async def get_finalized_report(
        self,
        class_doc: dict,
        session_id: str,
        db
    ) -> Optional[AttendanceReport]:
        await self.ensure_indexes(db)

        query = {
            "class_id": class_doc["class_id"],
            "session_id": session_id,
        }
        retention_filter = self._retention_filter()
        if retention_filter:
            query.update(retention_filter)

        cursor = db.attendance_reports.find(query)
        records = await cursor.to_list(length=None)

        if not records:
            return None

        started_at = min((record.get("started_at") for record in records if record.get("started_at")), default=None)
        ended_at = max((record.get("ended_at") for record in records if record.get("ended_at")), default=None)
        class_duration_seconds = max((int(record.get("class_duration_seconds", 0) or 0) for record in records), default=0)
        rows = [self._serialize_report_row(record, class_duration_seconds=class_duration_seconds) for record in records]

        return self._build_report_payload(
            class_doc=class_doc,
            session_id=session_id,
            rows=rows,
            started_at=started_at,
            ended_at=ended_at,
            class_duration_seconds=class_duration_seconds,
        )

    async def get_latest_class_attendance_report(
        self,
        class_doc: dict,
        db
    ) -> Optional[AttendanceReport]:
        await self.ensure_indexes(db)

        query = {"class_id": class_doc["class_id"]}
        retention_filter = self._retention_filter()
        if retention_filter:
            query.update(retention_filter)

        latest_record = await db.attendance_reports.find_one(
            query,
            sort=[("created_at", -1)]
        )

        if not latest_record:
            return None

        return await self.get_finalized_report(class_doc, latest_record["session_id"], db)
    
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
        class_doc = await db.classes.find_one({"class_id": class_id})
        if not class_doc:
            return AttendanceReport(
                class_id=class_id,
                session_id=session_id,
                total_students=0,
                present_count=0,
                absent_count=0,
                attendance_records=[]
            )

        finalized_report = await self.get_finalized_report(class_doc, session_id, db)
        if finalized_report:
            return finalized_report

        # Important: do not compute final attendance while class is running.
        # Final statuses are generated only when class ends.
        return AttendanceReport(
            class_id=class_id,
            session_id=session_id,
            class_title=class_doc.get("title"),
            teacher_name=class_doc.get("teacher_name"),
            class_date=None,
            started_at=class_doc.get("session_started_at"),
            ended_at=class_doc.get("ended_at"),
            class_duration_seconds=0,
            total_students=0,
            present_count=0,
            absent_count=0,
            attendance_records=[]
        )

    async def list_class_reports(
        self,
        class_id: str,
        db,
        limit: int = 25
    ) -> List[dict]:
        """Return summarized attendance reports for a class."""
        await self.ensure_indexes(db)

        match_stage = {"class_id": class_id}
        retention_filter = self._retention_filter()
        if retention_filter:
            match_stage.update(retention_filter)

        pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": "$session_id",
                    "session_id": {"$first": "$session_id"},
                    "class_id": {"$first": "$class_id"},
                    "class_title": {"$first": "$class_title"},
                    "class_date": {"$first": "$class_date"},
                    "started_at": {"$min": "$started_at"},
                    "ended_at": {"$max": "$ended_at"},
                    "class_duration_seconds": {"$max": "$class_duration_seconds"},
                    "total_students": {"$sum": 1},
                    "present_count": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$attendance_status", AttendanceStatus.PRESENT.value]},
                                1,
                                0,
                            ]
                        }
                    },
                    "absent_count": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$attendance_status", AttendanceStatus.ABSENT.value]},
                                1,
                                0,
                            ]
                        }
                    },
                    "average_engagement": {"$avg": "$engagement_ratio"},
                }
            },
            {"$sort": {"ended_at": -1}},
            {"$limit": limit},
        ]

        cursor = db.attendance_reports.aggregate(pipeline)
        docs = await cursor.to_list(length=limit)

        summaries = []
        for doc in docs:
            summaries.append({
                "class_id": doc.get("class_id", class_id),
                "session_id": doc.get("session_id"),
                "class_title": doc.get("class_title"),
                "class_date": doc.get("class_date"),
                "started_at": doc.get("started_at"),
                "ended_at": doc.get("ended_at"),
                "class_duration_seconds": int(doc.get("class_duration_seconds") or 0),
                "total_students": int(doc.get("total_students") or 0),
                "present_count": int(doc.get("present_count") or 0),
                "absent_count": int(doc.get("absent_count") or 0),
                "average_engagement_percentage": round((doc.get("average_engagement") or 0) * 100, 2),
            })

        return summaries

    async def delete_class_report(
        self,
        class_id: str,
        session_id: str,
        db
    ) -> int:
        """Delete all attendance report documents for a class session."""
        await self.ensure_indexes(db)
        result = await db.attendance_reports.delete_many({
            "class_id": class_id,
            "session_id": session_id,
        })
        return result.deleted_count


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
