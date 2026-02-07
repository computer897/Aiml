"""
API routes for user authentication.
Handles user registration and login with JWT tokens.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.models import UserCreate, UserLogin, UserResponse
from app.auth import hash_password, authenticate_user, create_access_token
from app.database import get_db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


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
        
        # Create user document
        user_doc = {
            "name": user_data.name,
            "email": user_data.email,
            "password_hash": password_hash,
            "role": user_data.role,
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
        
        # Create access token with string user ID
        access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
        
        logger.info(f"✓ User logged in: {credentials.email}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": user.role
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
