"""
Announcement routes for the AI Attendance System.
Handles class announcements creation, listing, and seen tracking.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId
from typing import List

from ..database import get_database
from ..auth import get_current_user
from ..models import AnnouncementCreate, Announcement

router = APIRouter(prefix="/announcements", tags=["Announcements"])


@router.post("", response_model=dict)
async def create_announcement(
    announcement: AnnouncementCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Create a new announcement for a class. Only teacher of the class can create."""
    # Verify user is teacher
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create announcements")
    
    # Verify class exists and user is the teacher
    class_obj = await db.classes.find_one({"_id": ObjectId(announcement.class_id)})
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    if str(class_obj.get("teacher_id")) != str(current_user.get("_id")):
        raise HTTPException(status_code=403, detail="You can only create announcements for your own classes")
    
    # Create announcement document
    announcement_doc = {
        "class_id": announcement.class_id,
        "teacher_id": str(current_user.get("_id")),
        "teacher_name": current_user.get("name", "Teacher"),
        "title": announcement.title,
        "content": announcement.content,
        "priority": announcement.priority,
        "created_at": datetime.utcnow(),
        "seen_by": []
    }
    
    result = await db.announcements.insert_one(announcement_doc)
    
    return {
        "success": True,
        "announcement_id": str(result.inserted_id),
        "message": "Announcement created successfully"
    }


@router.get("/class/{class_id}", response_model=List[dict])
async def get_class_announcements(
    class_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get all announcements for a class."""
    # Verify class exists
    class_obj = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Get announcements sorted by created_at desc
    cursor = db.announcements.find({"class_id": class_id}).sort("created_at", -1)
    announcements = []
    
    async for ann in cursor:
        ann["_id"] = str(ann["_id"])
        ann["seen_count"] = len(ann.get("seen_by", []))
        ann["has_seen"] = str(current_user.get("_id")) in ann.get("seen_by", [])
        # Get total enrolled students for percentage
        ann["total_students"] = len(class_obj.get("enrolled_students", []))
        announcements.append(ann)
    
    return announcements


@router.post("/{announcement_id}/seen", response_model=dict)
async def mark_announcement_seen(
    announcement_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Mark an announcement as seen by the current user."""
    # Find announcement
    announcement = await db.announcements.find_one({"_id": ObjectId(announcement_id)})
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    user_id = str(current_user.get("_id"))
    
    # Add user to seen_by if not already there
    if user_id not in announcement.get("seen_by", []):
        await db.announcements.update_one(
            {"_id": ObjectId(announcement_id)},
            {"$push": {"seen_by": user_id}}
        )
    
    return {"success": True, "message": "Announcement marked as seen"}


@router.delete("/{announcement_id}", response_model=dict)
async def delete_announcement(
    announcement_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Delete an announcement. Only the teacher who created it can delete."""
    # Find announcement
    announcement = await db.announcements.find_one({"_id": ObjectId(announcement_id)})
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    # Verify user is the teacher who created it
    if announcement.get("teacher_id") != str(current_user.get("_id")):
        raise HTTPException(status_code=403, detail="You can only delete your own announcements")
    
    await db.announcements.delete_one({"_id": ObjectId(announcement_id)})
    
    return {"success": True, "message": "Announcement deleted successfully"}


@router.get("/{announcement_id}/seen-by", response_model=dict)
async def get_announcement_seen_by(
    announcement_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get list of students who have seen an announcement. Only teacher can view."""
    # Find announcement
    announcement = await db.announcements.find_one({"_id": ObjectId(announcement_id)})
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    # Verify user is the teacher
    if announcement.get("teacher_id") != str(current_user.get("_id")):
        raise HTTPException(status_code=403, detail="Only the teacher can view who has seen the announcement")
    
    # Get student details for seen_by list
    seen_by_ids = announcement.get("seen_by", [])
    students = []
    
    for student_id in seen_by_ids:
        try:
            user = await db.users.find_one({"_id": ObjectId(student_id)})
            if user:
                students.append({
                    "id": str(user["_id"]),
                    "name": user.get("name", "Unknown"),
                    "email": user.get("email", "")
                })
        except:
            pass
    
    return {
        "announcement_id": announcement_id,
        "seen_count": len(students),
        "students": students
    }
