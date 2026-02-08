"""
Authentication module for JWT token generation and validation.
Handles password hashing, token creation, and user authentication.
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
from app.database import get_db
from app.models import User, UserRole
import logging
import hashlib
import hmac

logger = logging.getLogger(__name__)

# Password hashing context
# Use bcrypt__ident="2b" to avoid passlib version-detection warnings
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# HTTP Bearer token scheme
security = HTTPBearer()


# bcrypt has a hard 72-byte input limit.  Pydantic validation caps passwords
# at 64 *characters*, which is safe for ASCII but could exceed 72 bytes with
# multi-byte UTF-8.  Pre-hashing with SHA-256 gives a fixed-length input,
# which is the industry-standard approach used by Dropbox, Django, etc.

def _prehash(password: str) -> str:
    """SHA-256 pre-hash the password to guarantee ≤ 72 bytes for bcrypt."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    """
    Hash a plain text password using bcrypt with SHA-256 pre-hashing.

    The SHA-256 step ensures the input to bcrypt is always 64 hex chars
    (64 bytes), safely under bcrypt's 72-byte limit regardless of the
    original password's encoding.

    Args:
        password: Plain text password (validated to 8-64 chars by Pydantic)

    Returns:
        Hashed password string
    """
    return pwd_context.hash(_prehash(password))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a hashed password.

    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to compare against

    Returns:
        True if passwords match, False otherwise
    """
    return pwd_context.verify(_prehash(plain_password), hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Dictionary containing token payload data
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT access token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError as e:
        logger.error(f"Token decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db)
) -> User:
    """
    Get the current authenticated user from JWT token.
    Dependency injection for protected routes.
    
    Args:
        credentials: HTTP Bearer credentials containing JWT token
        db: Database instance
        
    Returns:
        User object of authenticated user
        
    Raises:
        HTTPException: If authentication fails
    """
    from bson import ObjectId
    
    token = credentials.credentials
    payload = decode_access_token(token)
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    # Fetch user from database using ObjectId
    try:
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID"
        )
    
    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Convert MongoDB document to User model
    user_doc["_id"] = str(user_doc["_id"])
    user_doc["id"] = user_doc["_id"]
    return User(**user_doc)


async def get_current_teacher(current_user: User = Depends(get_current_user)) -> User:
    """
    Ensure the current user is a teacher.
    Dependency for teacher-only routes.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User object if user is a teacher
        
    Raises:
        HTTPException: If user is not a teacher
    """
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access this resource"
        )
    return current_user


async def get_current_student(current_user: User = Depends(get_current_user)) -> User:
    """
    Ensure the current user is a student.
    Dependency for student-only routes.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User object if user is a student
        
    Raises:
        HTTPException: If user is not a student
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this resource"
        )
    return current_user


async def authenticate_user(email: str, password: str, db) -> Optional[User]:
    """
    Authenticate a user by email and password.
    
    Args:
        email: User's email address
        password: Plain text password
        db: Database instance
        
    Returns:
        User object if authentication successful, None otherwise
    """
    user_doc = await db.users.find_one({"email": email})
    if not user_doc:
        return None
    
    if not verify_password(password, user_doc["password_hash"]):
        return None
    
    # Convert ObjectId to string for the model
    user_doc["_id"] = str(user_doc["_id"])
    user_doc["id"] = user_doc["_id"]
    return User(**user_doc)
