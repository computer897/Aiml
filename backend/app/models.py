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
    # Multi-college system fields - optional for backward compatibility with existing users
    college_name: Optional[str] = Field(None, max_length=200, description="College name for access control")
    department_name: Optional[str] = Field(None, max_length=200, description="Department name for access control")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "role": "student",
                "college_name": "ABC University",
                "department_name": "Computer Science"
            }
        }


class UserCreate(BaseModel):
    """Schema for user registration."""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(
        ...,
        min_length=8,
        max_length=64,
        description="Password must be 8-64 characters",
    )
    role: UserRole
    # Multi-college system fields - required during registration
    college_name: str = Field(..., min_length=2, max_length=200, description="College name")
    department_name: str = Field(..., min_length=2, max_length=200, description="Department name")


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
    college_name: Optional[str] = None
    department_name: Optional[str] = None
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
    # Multi-college system fields (INTERNAL USE ONLY - not exposed in API responses)
    college_name: str = Field(..., description="College name for filtering (internal)")
    department_name: str = Field(..., description="Department name for filtering (internal)")
    created_by: str = Field(..., description="Teacher ID who created this class")
    
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
    is_finished: Optional[bool] = False
    ended_at: Optional[datetime] = None
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
    
    # Real-time tracking (from browser-side face detection)
    last_frame_timestamp: Optional[datetime] = None
    is_face_detected: bool = Field(default=False)
    is_looking_at_screen: bool = Field(default=False)
    attention_score: float = Field(default=0.0, ge=0, le=100, description="Attention score from client-side detection")
    multiple_faces_detected: bool = Field(default=False, description="Whether multiple faces were detected")
    
    # Final status
    engagement_percentage: float = Field(default=0.0, description="Percentage of time engaged")
    status: AttendanceStatus = Field(default=AttendanceStatus.IN_PROGRESS)
    
    # Privacy tracking
    consent_given: bool = Field(default=True, description="Whether student consented to AI tracking")
    
    class Config:
        populate_by_name = True


class AttendanceStart(BaseModel):
    """Schema for starting attendance tracking."""
    class_id: str
    session_id: str


class FrameData(BaseModel):
    """Schema for receiving webcam frame data (LEGACY - for backward compatibility)."""
    session_id: str
    student_id: str
    frame_base64: str = Field(..., description="Base64 encoded image frame")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AttendanceMetadata(BaseModel):
    """
    Schema for receiving attendance metadata from browser-side face detection.
    
    PRIVACY-FOCUSED: No video/images are transmitted. Only detection metadata
    from client-side processing is sent to the server.
    
    This approach:
    - Keeps video processing local (in browser)
    - Only transmits boolean/numeric metadata
    - Ensures no raw video/images are stored
    - Complies with privacy-first design
    """
    student_id: str = Field(..., description="Student's user ID")
    class_id: str = Field(..., description="Class identifier")
    session_id: str = Field(..., description="Attendance session identifier")
    face_detected: bool = Field(..., description="Whether a face was detected")
    multiple_faces: bool = Field(default=False, description="Whether multiple faces were detected")
    face_count: int = Field(default=0, description="Number of faces detected")
    attention_score: float = Field(default=0.0, ge=0, le=100, description="Attention/engagement score 0-100")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    processing_location: str = Field(default="client-side", description="Where face detection was performed")
    detection_method: str = Field(default="face-api.js", description="Face detection library used")


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
