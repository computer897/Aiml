"""
Routes package initialization.
Imports and exports all API routers.
"""

from app.routes.auth_routes import router as auth_router
from app.routes.class_routes import router as class_router
from app.routes.attendance_routes import router as attendance_router
from app.routes.join_request_routes import router as join_request_router
from app.routes.announcement_routes import router as announcement_router
from app.routes.document_routes import router as document_router

__all__ = [
    "auth_router", 
    "class_router", 
    "attendance_router", 
    "join_request_router",
    "announcement_router",
    "document_router"
]
