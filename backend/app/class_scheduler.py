"""
Class scheduler for automatic class end and attendance generation.
Handles both manual and automatic class termination with strict attendance validation.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging
import asyncio

logger = logging.getLogger(__name__)


class ClassScheduler:
    """
    Manages automatic class end when duration expires.
    Ensures attendance is generated ONLY when class actually ends (manual or automatic).
    """

    def __init__(self):
        """Initialize class scheduler."""
        self.active_auto_end_tasks: Dict[str, asyncio.Task] = {}
        logger.info("✓ Class scheduler initialized")

    async def schedule_auto_end(
        self,
        class_id: str,
        session_id: str,
        duration_minutes: int,
        db
    ) -> None:
        """
        Schedule automatic class end after duration expires.

        Args:
            class_id: Class identifier
            session_id: Active session identifier
            duration_minutes: Class duration in minutes
            db: Database instance
        """
        # Cancel any existing auto-end task for this class
        if class_id in self.active_auto_end_tasks:
            self.active_auto_end_tasks[class_id].cancel()
            logger.info(f"Cancelled previous auto-end task for class {class_id}")

        # Create new auto-end task
        task = asyncio.create_task(
            self._auto_end_after_duration(class_id, session_id, duration_minutes, db)
        )
        self.active_auto_end_tasks[class_id] = task
        logger.info(f"✓ Auto-end scheduled for class {class_id} after {duration_minutes} minutes")

    async def _auto_end_after_duration(
        self,
        class_id: str,
        session_id: str,
        duration_minutes: int,
        db
    ) -> None:
        """
        Internal method to automatically end class after duration expires.

        Args:
            class_id: Class identifier
            session_id: Active session identifier
            duration_minutes: Class duration in minutes
            db: Database instance
        """
        try:
            # Wait for duration to elapse
            wait_seconds = duration_minutes * 60
            logger.info(f"Auto-end timer started for {class_id}: waiting {duration_minutes} min")
            await asyncio.sleep(wait_seconds)

            # Check if class is still active (might have been manually ended)
            class_doc = await db.classes.find_one({"class_id": class_id})

            if not class_doc:
                logger.warning(f"Class {class_id} not found for auto-end")
                return

            if not class_doc.get("is_active", False):
                logger.info(f"Class {class_id} already ended manually, skipping auto-end")
                self.active_auto_end_tasks.pop(class_id, None)
                return

            # Verify session matches
            if class_doc.get("active_session_id") != session_id:
                logger.info(f"Session mismatch for class {class_id}, skipping auto-end")
                self.active_auto_end_tasks.pop(class_id, None)
                return

            # AUTO-END THE CLASS
            logger.info(f"⏰ AUTO-ENDING class {class_id} after duration expired")
            await self._auto_end_class(class_doc, db)

            # Clean up task
            self.active_auto_end_tasks.pop(class_id, None)

        except asyncio.CancelledError:
            logger.info(f"Auto-end task cancelled for class {class_id}")
            self.active_auto_end_tasks.pop(class_id, None)
        except Exception as e:
            logger.error(f"Error in auto-end task for class {class_id}: {e}")
            self.active_auto_end_tasks.pop(class_id, None)

    async def _auto_end_class(self, class_doc: dict, db) -> None:
        """
        Auto-end a class and generate attendance report.

        Args:
            class_doc: Class document from database
            db: Database instance
        """
        try:
            from app.attendance import get_attendance_manager
            from app.websocket import get_connection_manager

            ended_at = datetime.utcnow()
            class_id = class_doc["class_id"]
            session_id = class_doc.get("active_session_id")

            # Finalize attendance
            attendance_manager = get_attendance_manager()
            if session_id:
                try:
                    attendance_report = await attendance_manager.finalize_class_attendance(
                        class_doc=class_doc,
                        session_id=session_id,
                        ended_at=ended_at,
                        db=db,
                    )

                    # Broadcast final attendance to all connected clients
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
                        f"✓ Attendance finalized via auto-end: "
                        f"{attendance_report.present_count} present, "
                        f"{attendance_report.absent_count} absent"
                    )
                except Exception as exc:
                    logger.error(f"Failed to finalize attendance during auto-end: {exc}")

            # Mark class as finished
            await db.classes.update_one(
                {"_id": class_doc["_id"]},
                {
                    "$set": {
                        "is_active": False,
                        "is_finished": True,
                        "active_session_id": None,
                        "session_started_at": None,
                        "ended_at": ended_at,
                        "auto_ended": True,  # Track that this was auto-ended
                        "ended_reason": "Duration expired - automatic termination",
                    }
                },
            )

            logger.info(f"✓ Class {class_id} auto-ended at {ended_at.isoformat()}")

        except Exception as e:
            logger.error(f"Error during auto-end for class {class_doc['class_id']}: {e}")

    def cancel_auto_end(self, class_id: str) -> bool:
        """
        Cancel auto-end task for a class (called when teacher manually ends class).

        Args:
            class_id: Class identifier

        Returns:
            True if task was cancelled, False if no task exists
        """
        if class_id in self.active_auto_end_tasks:
            task = self.active_auto_end_tasks[class_id]
            task.cancel()
            self.active_auto_end_tasks.pop(class_id, None)
            logger.info(f"Auto-end task cancelled for class {class_id}")
            return True
        return False

    def get_active_classes(self) -> int:
        """Get number of classes with active auto-end tasks."""
        return len(self.active_auto_end_tasks)


# Global scheduler instance
class_scheduler = ClassScheduler()


def get_class_scheduler() -> ClassScheduler:
    """
    Get the global class scheduler instance.
    Used for dependency injection.

    Returns:
        ClassScheduler instance
    """
    return class_scheduler
