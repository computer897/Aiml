"""
Document routes for the AI Attendance System.
Handles class document/material management with external file links.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId
from typing import List, Optional
from pydantic import BaseModel

from ..database import get_database
from ..auth import get_current_user


class DocumentCreate(BaseModel):
    """Schema for creating a document."""
    class_id: str
    title: str
    description: Optional[str] = None
    file_url: str
    file_name: str
    file_type: str  # pdf, doc, ppt, image, video, link, other
    file_size: int = 0  # Size in bytes, 0 for external links


router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("", response_model=dict)
async def upload_document(
    document: DocumentCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Create/upload a new document for a class. Only teacher of the class can upload."""
    # Verify user is teacher
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can upload documents")
    
    # Verify class exists and user is the teacher
    class_obj = await db.classes.find_one({"_id": ObjectId(document.class_id)})
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    if str(class_obj.get("teacher_id")) != str(current_user.get("_id")):
        raise HTTPException(status_code=403, detail="You can only upload documents to your own classes")
    
    # Create document record
    document_doc = {
        "class_id": document.class_id,
        "teacher_id": str(current_user.get("_id")),
        "title": document.title,
        "description": document.description,
        "file_name": document.file_name,
        "file_type": document.file_type,
        "file_size": document.file_size,
        "file_url": document.file_url,
        "uploaded_at": datetime.utcnow(),
        "download_count": 0,
        "viewed_by": []
    }
    
    result = await db.documents.insert_one(document_doc)
    
    return {
        "success": True,
        "document_id": str(result.inserted_id),
        "message": "Document uploaded successfully"
    }


@router.get("/class/{class_id}", response_model=List[dict])
async def get_class_documents(
    class_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get all documents for a class."""
    # Verify class exists
    class_obj = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Get documents sorted by uploaded_at desc
    cursor = db.documents.find({"class_id": class_id}).sort("uploaded_at", -1)
    documents = []
    
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["has_viewed"] = str(current_user.get("_id")) in doc.get("viewed_by", [])
        documents.append(doc)
    
    return documents


@router.post("/{document_id}/view", response_model=dict)
async def mark_document_viewed(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Mark a document as viewed by the current user and increment download count."""
    # Find document
    document = await db.documents.find_one({"_id": ObjectId(document_id)})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    user_id = str(current_user.get("_id"))
    
    # Update view status and download count
    update_ops = {"$inc": {"download_count": 1}}
    if user_id not in document.get("viewed_by", []):
        update_ops["$push"] = {"viewed_by": user_id}
    
    await db.documents.update_one({"_id": ObjectId(document_id)}, update_ops)
    
    return {"success": True, "message": "Document view recorded"}


@router.delete("/{document_id}", response_model=dict)
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Delete a document. Only the teacher who uploaded it can delete."""
    # Find document
    document = await db.documents.find_one({"_id": ObjectId(document_id)})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Verify user is the teacher who uploaded it
    if document.get("teacher_id") != str(current_user.get("_id")):
        raise HTTPException(status_code=403, detail="You can only delete your own documents")
    
    await db.documents.delete_one({"_id": ObjectId(document_id)})
    
    return {"success": True, "message": "Document deleted successfully"}


@router.get("/teacher/all", response_model=List[dict])
async def get_teacher_documents(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get all documents uploaded by the current teacher."""
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")
    
    teacher_id = str(current_user.get("_id"))
    
    # Get all documents by this teacher
    cursor = db.documents.find({"teacher_id": teacher_id}).sort("uploaded_at", -1)
    documents = []
    
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        # Get class name
        class_obj = await db.classes.find_one({"_id": ObjectId(doc.get("class_id"))})
        doc["class_name"] = class_obj.get("title", "Unknown Class") if class_obj else "Unknown Class"
        documents.append(doc)
    
    return documents
