"""
API routes for user authentication.
Handles user registration and login with JWT tokens.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models import UserCreate, UserLogin, UserResponse, User
from app.auth import hash_password, verify_password, authenticate_user, create_access_token, get_current_user
from app.database import get_db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class ProfileUpdate(BaseModel):
    """Schema for profile update."""
    name: Optional[str] = None
    college_name: Optional[str] = None
    department_name: Optional[str] = None


class PasswordUpdate(BaseModel):
    """Schema for password update."""
    current_password: str
    new_password: str


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, db=Depends(get_db)):
    """
    Register a new user (student or teacher).
    
    Args:
        user_data: User registration data
        db: Database instance
        
    Returns:
        Success message with user ID
        
    Raises:
        HTTPException: If email already exists or database error
    """
    try:
        # Check if email already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        password_hash = hash_password(user_data.password)
        
        # Create user document with multi-college fields
        user_doc = {
            "name": user_data.name,
            "email": user_data.email,
            "password_hash": password_hash,
            "role": user_data.role,
            "college_name": user_data.college_name,
            "department_name": user_data.department_name,
            "created_at": datetime.utcnow()
        }
        
        # Insert into database
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
        logger.info(f"✓ New user registered: {user_data.email} (role: {user_data.role})")
        
        return {
            "message": "User registered successfully",
            "user_id": user_id,
            "role": user_data.role
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration error: {str(e)}"
        )


@router.post("/login", response_model=dict)
async def login_user(credentials: UserLogin, db=Depends(get_db)):
    """
    Authenticate user and return JWT token.
    
    Args:
        credentials: User login credentials
        db: Database instance
        
    Returns:
        Access token and user information
        
    Raises:
        HTTPException: If credentials are invalid or database error
    """
    try:
        # Authenticate user
        user = await authenticate_user(credentials.email, credentials.password, db)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token with user ID, role, college and department for access control
        access_token = create_access_token(data={
            "sub": str(user.id),
            "role": user.role,
            "college_name": user.college_name,
            "department_name": user.department_name
        })
        
        logger.info(f"✓ User logged in: {credentials.email}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "college_name": user.college_name,
                "department_name": user.department_name
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {str(e)}"
        )


@router.get("/me", response_model=dict)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user profile.
    
    Returns:
        Current user information
    """
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "college_name": current_user.college_name,
        "department_name": current_user.department_name
    }


@router.put("/profile", response_model=dict)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Update user profile.
    
    Args:
        profile_data: Fields to update
        current_user: Authenticated user
        db: Database instance
        
    Returns:
        Updated user information
    """
    from bson import ObjectId
    
    try:
        # Build update document
        update_doc = {}
        if profile_data.name:
            update_doc["name"] = profile_data.name
        if profile_data.college_name:
            update_doc["college_name"] = profile_data.college_name
        if profile_data.department_name:
            update_doc["department_name"] = profile_data.department_name
        
        if not update_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        update_doc["updated_at"] = datetime.utcnow()
        
        # Update user in database
        result = await db.users.update_one(
            {"_id": ObjectId(current_user.id)},
            {"$set": update_doc}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"✓ Profile updated for user: {current_user.email}")
        
        return {
            "message": "Profile updated successfully",
            "updated_fields": list(update_doc.keys())
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )


@router.put("/password", response_model=dict)
async def update_password(
    password_data: PasswordUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Update user password.
    
    Args:
        password_data: Current and new password
        current_user: Authenticated user
        db: Database instance
        
    Returns:
        Success message
    """
    from bson import ObjectId
    
    try:
        # Get user's current password hash from database
        user_doc = await db.users.find_one({"_id": ObjectId(current_user.id)})
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify current password
        if not verify_password(password_data.current_password, user_doc["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Hash new password
        new_password_hash = hash_password(password_data.new_password)
        
        # Update password in database
        await db.users.update_one(
            {"_id": ObjectId(current_user.id)},
            {"$set": {
                "password_hash": new_password_hash,
                "updated_at": datetime.utcnow()
            }}
        )
        
        logger.info(f"✓ Password updated for user: {current_user.email}")
        
        return {"message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )
