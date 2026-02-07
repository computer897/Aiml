"""
WebSocket handler for real-time student engagement updates.
Enables live monitoring of student attendance status for teachers.
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set, List
from datetime import datetime
from app.models import EngagementUpdate
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time updates.
    
    Architecture:
    - Teachers connect to monitor their class sessions
    - Students send engagement updates through REST API
    - Manager broadcasts updates to all connected teachers for that class
    """
    
    def __init__(self):
        """Initialize connection manager."""
        # Store active connections by class_id: {websocket, user_id, role}
        self.active_connections: Dict[str, List[Dict]] = {}
        logger.info("✓ WebSocket connection manager initialized")
    
    async def connect(self, websocket: WebSocket, class_id: str, user_id: str, role: str):
        """
        Accept and register a new WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            class_id: Class identifier the user is monitoring
            user_id: User's ID
            role: User role (teacher/student)
        """
        await websocket.accept()
        
        if class_id not in self.active_connections:
            self.active_connections[class_id] = []
        
        connection_info = {
            "websocket": websocket,
            "user_id": user_id,
            "role": role,
            "connected_at": datetime.utcnow()
        }
        
        self.active_connections[class_id].append(connection_info)
        
        logger.info(f"✓ WebSocket connected: user={user_id}, role={role}, class={class_id}")
        
        # Send welcome message
        await websocket.send_json({
            "type": "connection",
            "message": "Connected to engagement tracking",
            "class_id": class_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def disconnect(self, websocket: WebSocket, class_id: str, user_id: str):
        """
        Remove a WebSocket connection.
        
        Args:
            websocket: WebSocket connection to remove
            class_id: Class identifier
            user_id: User's ID
        """
        if class_id in self.active_connections:
            self.active_connections[class_id] = [
                conn for conn in self.active_connections[class_id]
                if conn["websocket"] != websocket
            ]
            
            # Clean up empty class connections
            if not self.active_connections[class_id]:
                del self.active_connections[class_id]
        
        logger.info(f"✓ WebSocket disconnected: user={user_id}, class={class_id}")
    
    async def broadcast_engagement_update(
        self,
        class_id: str,
        engagement_update: EngagementUpdate
    ):
        """
        Broadcast student engagement update to all connected clients for a class.
        
        Args:
            class_id: Class identifier
            engagement_update: Engagement update data
        """
        if class_id not in self.active_connections:
            logger.debug(f"No active connections for class {class_id}")
            return
        
        # Prepare message
        message = {
            "type": "engagement_update",
            "data": {
                "student_id": engagement_update.student_id,
                "student_name": engagement_update.student_name,
                "is_face_detected": engagement_update.is_face_detected,
                "is_looking_at_screen": engagement_update.is_looking_at_screen,
                "engagement_percentage": engagement_update.engagement_percentage,
                "last_update": engagement_update.last_update.isoformat()
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to all connected clients
        disconnected = []
        for connection in self.active_connections[class_id]:
            try:
                await connection["websocket"].send_json(message)
            except Exception as e:
                logger.error(f"Error sending to websocket: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn["websocket"], class_id, conn["user_id"])
    
    async def broadcast_attendance_status(
        self,
        class_id: str,
        student_id: str,
        student_name: str,
        status: str,
        engagement_percentage: float
    ):
        """
        Broadcast final attendance status when a session ends.
        
        Args:
            class_id: Class identifier
            student_id: Student's ID
            student_name: Student's name
            status: Final attendance status (present/absent)
            engagement_percentage: Final engagement percentage
        """
        if class_id not in self.active_connections:
            return
        
        message = {
            "type": "attendance_status",
            "data": {
                "student_id": student_id,
                "student_name": student_name,
                "status": status,
                "engagement_percentage": engagement_percentage
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        disconnected = []
        for connection in self.active_connections[class_id]:
            try:
                await connection["websocket"].send_json(message)
            except Exception as e:
                logger.error(f"Error sending attendance status: {e}")
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn["websocket"], class_id, conn["user_id"])
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """
        Send a message to a specific WebSocket connection.
        
        Args:
            message: Message to send
            websocket: Target WebSocket connection
        """
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
    
    def get_connected_users(self, class_id: str) -> List[Dict]:
        """
        Get list of connected users for a class.
        
        Args:
            class_id: Class identifier
            
        Returns:
            List of connected user information
        """
        if class_id not in self.active_connections:
            return []
        
        return [
            {
                "user_id": conn["user_id"],
                "role": conn["role"],
                "connected_at": conn["connected_at"].isoformat()
            }
            for conn in self.active_connections[class_id]
        ]


# Global connection manager instance
connection_manager = ConnectionManager()


def get_connection_manager() -> ConnectionManager:
    """
    Get the global connection manager instance.
    Used for dependency injection.
    
    Returns:
        ConnectionManager instance
    """
    return connection_manager
