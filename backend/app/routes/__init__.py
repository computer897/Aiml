"""
Routes package initialization.
Imports and exports all API routers.
"""

from app.routes.auth_routes import router as auth_router
from app.routes.class_routes import router as class_router
from app.routes.attendance_routes import router as attendance_router

__all__ = ["auth_router", "class_router", "attendance_router"]
