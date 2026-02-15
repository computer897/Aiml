"""
API routes for class join requests (Google Meet style).
Handles join request creation, listing, and approval/rejection.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models import JoinRequest, JoinRequestCreate, JoinRequestResponse, JoinRequestStatus, User
from app.auth import get_current_user, get_current_teacher, get_current_student
from app.database import get_db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/join-request", tags=["Join Requests"])


@router.post("/{class_id}", response_model=JoinRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_join_request(
    class_id: str,
    current_user: User = Depends(get_current_student),
    db=Depends(get_db)
):
    """
    Create a join request for a class (student only).
    This initiates the Google Meet style join flow.
    
    Args:
        class_id: Class to join
        current_user: Authenticated student
        db: Database instance
        
    Returns:
        Created join request
    """
    # Check if class exists and is active
    class_doc = await db.classes.find_one({"class_id": class_id})
    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    # Verify student belongs to same college/department
    if class_doc.get("college_name") != current_user.college_name:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot join class from a different college"
        )
    
    if class_doc.get("department_name") != current_user.department_name:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot join class from a different department"
        )
    
    # Check if class is active
    if not class_doc.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Class is not currently active. Please wait for the teacher to start the session."
        )
    
    # Check if already enrolled
    if current_user.id in class_doc.get("enrolled_students", []):
        # Already enrolled, auto-accept
        return JoinRequestResponse(
            id="auto-accepted",
            class_id=class_id,
            student_id=current_user.id,
            student_name=current_user.name,
            student_email=current_user.email,
            status=JoinRequestStatus.ACCEPTED,
            requested_at=datetime.utcnow(),
            responded_at=datetime.utcnow()
        )
    
    # Check for existing pending request
    existing_request = await db.join_requests.find_one({
        "class_id": class_id,
        "student_id": current_user.id,
        "status": JoinRequestStatus.PENDING
    })
    
    if existing_request:
        existing_request["id"] = str(existing_request["_id"])
        return JoinRequestResponse(**existing_request)
    
    # Create new join request
    request_doc = {
        "class_id": class_id,
        "student_id": current_user.id,
        "student_name": current_user.name,
        "student_email": current_user.email,
        "status": JoinRequestStatus.PENDING,
        "requested_at": datetime.utcnow(),
        "responded_at": None,
        "responded_by": None
    }
    
    result = await db.join_requests.insert_one(request_doc)
    request_doc["id"] = str(result.inserted_id)
    
    logger.info(f"✓ Join request created: {current_user.name} -> {class_id}")
    
    return JoinRequestResponse(**request_doc)


@router.get("/pending/{class_id}", response_model=List[JoinRequestResponse])
async def get_pending_requests(
    class_id: str,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Get pending join requests for a class (teacher only).
    
    Args:
        class_id: Class identifier
        current_user: Authenticated teacher
        db: Database instance
        
    Returns:
        List of pending join requests
    """
    # Verify teacher owns the class
    class_doc = await db.classes.find_one({
        "class_id": class_id,
        "teacher_id": current_user.id
    })
    
    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found or you don't have permission"
        )
    
    # Get pending requests
    cursor = db.join_requests.find({
        "class_id": class_id,
        "status": JoinRequestStatus.PENDING
    })
    
    requests = []
    async for request in cursor:
        request["id"] = str(request["_id"])
        requests.append(JoinRequestResponse(**request))
    
    return requests


@router.post("/{request_id}/accept", response_model=dict)
async def accept_join_request(
    request_id: str,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Accept a join request (teacher only).
    
    Args:
        request_id: Join request ID
        current_user: Authenticated teacher
        db: Database instance
        
    Returns:
        Success message
    """
    from bson import ObjectId
    
    # Get the join request
    request_doc = await db.join_requests.find_one({"_id": ObjectId(request_id)})
    if not request_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found"
        )
    
    # Verify teacher owns the class
    class_doc = await db.classes.find_one({
        "class_id": request_doc["class_id"],
        "teacher_id": current_user.id
    })
    
    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to accept this request"
        )
    
    # Update request status
    await db.join_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {
            "status": JoinRequestStatus.ACCEPTED,
            "responded_at": datetime.utcnow(),
            "responded_by": current_user.id
        }}
    )
    
    # Add student to enrolled students
    await db.classes.update_one(
        {"class_id": request_doc["class_id"]},
        {"$addToSet": {"enrolled_students": request_doc["student_id"]}}
    )
    
    logger.info(f"✓ Join request accepted: {request_doc['student_name']} -> {request_doc['class_id']}")
    
    return {
        "message": "Join request accepted",
        "student_id": request_doc["student_id"],
        "student_name": request_doc["student_name"]
    }


@router.post("/{request_id}/reject", response_model=dict)
async def reject_join_request(
    request_id: str,
    current_user: User = Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Reject a join request (teacher only).
    
    Args:
        request_id: Join request ID
        current_user: Authenticated teacher
        db: Database instance
        
    Returns:
        Success message
    """
    from bson import ObjectId
    
    # Get the join request
    request_doc = await db.join_requests.find_one({"_id": ObjectId(request_id)})
    if not request_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found"
        )
    
    # Verify teacher owns the class
    class_doc = await db.classes.find_one({
        "class_id": request_doc["class_id"],
        "teacher_id": current_user.id
    })
    
    if not class_doc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to reject this request"
        )
    
    # Update request status
    await db.join_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {
            "status": JoinRequestStatus.REJECTED,
            "responded_at": datetime.utcnow(),
            "responded_by": current_user.id
        }}
    )
    
    logger.info(f"✓ Join request rejected: {request_doc['student_name']} -> {request_doc['class_id']}")
    
    return {
        "message": "Join request rejected",
        "student_id": request_doc["student_id"]
    }


@router.get("/status/{class_id}", response_model=dict)
async def get_request_status(
    class_id: str,
    current_user: User = Depends(get_current_student),
    db=Depends(get_db)
):
    """
    Get current join request status for a class (student only).
    
    Args:
        class_id: Class identifier
        current_user: Authenticated student
        db: Database instance
        
    Returns:
        Request status
    """
    # Check if already enrolled
    class_doc = await db.classes.find_one({"class_id": class_id})
    if class_doc and current_user.id in class_doc.get("enrolled_students", []):
        return {
            "status": "accepted",
            "enrolled": True,
            "message": "You are enrolled in this class"
        }
    
    # Find latest request
    request_doc = await db.join_requests.find_one(
        {
            "class_id": class_id,
            "student_id": current_user.id
        },
        sort=[("requested_at", -1)]
    )
    
    if not request_doc:
        return {
            "status": "none",
            "enrolled": False,
            "message": "No join request found"
        }
    
    return {
        "status": request_doc["status"],
        "enrolled": request_doc["status"] == JoinRequestStatus.ACCEPTED,
        "requested_at": request_doc["requested_at"],
        "responded_at": request_doc.get("responded_at"),
        "message": f"Request {request_doc['status']}"
    }
