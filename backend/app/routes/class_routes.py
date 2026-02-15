"""
API routes for classroom management.
Handles class creation, retrieval, and student enrollment.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from app.models import ClassCreate, ClassResponse, Class, User
from app.auth import get_current_teacher, get_current_student, get_current_user
from app.database import get_db
from datetime import datetime
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Class ID already exists"
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
    
    Args:
        class_id: Class identifier
        current_user: Authenticated teacher
        db: Database instance
        
    Returns:
        Success message with session ID
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
    
    # Generate session ID
    session_id = f"{class_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    # Mark class as active
    await db.classes.update_one(
        {"_id": class_doc["_id"]},
        {"$set": {"is_active": True}}
    )
    
    logger.info(f"✓ Class {class_id} activated with session {session_id}")
    
    return {
        "message": "Class activated",
        "class_id": class_id,
        "session_id": session_id
    }


@router.post("/{class_id}/deactivate", response_model=dict)
async def deactivate_class(
    class_id: str,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Deactivate a class session (teacher only).
    
    Args:
        class_id: Class identifier
        current_user: Authenticated teacher
        db: Database instance
        
    Returns:
        Success message
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
    
    ended_at = datetime.utcnow()
    
    await db.classes.update_one(
        {"_id": class_doc["_id"]},
        {"$set": {
            "is_active": False,
            "is_finished": True,
            "ended_at": ended_at
        }}
    )
    
    logger.info(f"✓ Class {class_id} deactivated and finished")
    
    return {
        "message": "Class ended",
        "class_id": class_id,
        "ended_at": ended_at.isoformat()
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
    
    logger.info(f"✓ Class {class_id} deleted by teacher {current_user.name}")
    
    return {
        "message": "Class deleted successfully",
        "class_id": class_id
    }


# (teacher/classes and student/classes routes moved above /{class_id} to fix route ordering)
