"""
Data models for the Virtual Classroom system.
Defines the structure for User, Class, and Attendance records.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration."""
    STUDENT = "student"
    TEACHER = "teacher"


class User(BaseModel):
    """User model for authentication and identification."""
    id: Optional[str] = Field(None, alias="_id")
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password_hash: str
    role: UserRole
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "role": "student"
            }
        }


class UserCreate(BaseModel):
    """Schema for user registration."""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Public user information response."""
    id: str
    name: str
    email: EmailStr
    role: UserRole
    created_at: datetime


class Class(BaseModel):
    """Class model for classroom sessions."""
    id: Optional[str] = Field(None, alias="_id")
    class_id: str = Field(..., description="Unique class identifier for students to join")
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    teacher_id: str
    teacher_name: str
    schedule_time: datetime
    duration_minutes: int = Field(..., gt=0, description="Expected class duration in minutes")
    is_active: bool = Field(default=False, description="Whether class is currently in session")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    enrolled_students: List[str] = Field(default_factory=list, description="List of student IDs")
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "class_id": "CS101-2024",
                "title": "Introduction to Computer Science",
                "teacher_id": "teacher123",
                "schedule_time": "2024-03-15T10:00:00",
                "duration_minutes": 60
            }
        }


class ClassCreate(BaseModel):
    """Schema for creating a new class."""
    class_id: str = Field(..., min_length=3, max_length=50)
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    schedule_time: datetime
    duration_minutes: int = Field(..., gt=0)


class ClassResponse(BaseModel):
    """Public class information response."""
    id: str
    class_id: str
    title: str
    description: Optional[str]
    teacher_id: str
    teacher_name: str
    schedule_time: datetime
    duration_minutes: int
    is_active: bool
    enrolled_students: List[str]
    created_at: datetime


class AttendanceStatus(str, Enum):
    """Attendance status enumeration."""
    PRESENT = "present"
    ABSENT = "absent"
    IN_PROGRESS = "in_progress"


class Attendance(BaseModel):
    """Attendance model tracking student engagement."""
    id: Optional[str] = Field(None, alias="_id")
    student_id: str
    student_name: str
    class_id: str
    session_id: str = Field(..., description="Unique identifier for this attendance session")
    
    # Time tracking
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    total_class_duration_seconds: int = Field(default=0, description="Expected class duration")
    engagement_duration_seconds: int = Field(default=0, description="Time student was engaged")
    
    # Real-time tracking
    last_frame_timestamp: Optional[datetime] = None
    is_face_detected: bool = Field(default=False)
    is_looking_at_screen: bool = Field(default=False)
    
    # Final status
    engagement_percentage: float = Field(default=0.0, description="Percentage of time engaged")
    status: AttendanceStatus = Field(default=AttendanceStatus.IN_PROGRESS)
    
    class Config:
        populate_by_name = True


class AttendanceStart(BaseModel):
    """Schema for starting attendance tracking."""
    class_id: str
    session_id: str


class FrameData(BaseModel):
    """Schema for receiving webcam frame data."""
    session_id: str
    student_id: str
    frame_base64: str = Field(..., description="Base64 encoded image frame")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class EngagementUpdate(BaseModel):
    """Real-time engagement update for WebSocket."""
    student_id: str
    student_name: str
    is_face_detected: bool
    is_looking_at_screen: bool
    engagement_percentage: float
    last_update: datetime


class AttendanceReport(BaseModel):
    """Attendance report for a class session."""
    class_id: str
    class_title: str
    total_students: int
    present_count: int
    absent_count: int
    attendance_records: List[dict]
