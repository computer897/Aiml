"""
Socket.IO event handlers for real-time classroom updates.
Manages WebSocket connections, room subscriptions, and broadcasts.
"""

from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Global registry for active socket connections per class
# Format: { classId: { socketId: { userId, role, userName } } }
class_participants = {}


def setup_socket_events(sio):
    """
    Register all Socket.IO event handlers.
    Call this in main.py after creating the socketio instance.

    Args:
        sio: python_socketio.AsyncServer instance
    """

    @sio.on('connect')
    async def on_connect(sid, environ):
        """Handle new socket connection"""
        try:
            token = environ.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
            logger.info(f'[Socket.IO] ✅ Client connected: {sid} (token: {"***" if token else "none"})')
        except Exception as e:
            logger.error(f'[Socket.IO] Error on connect: {e}')


    @sio.on('disconnect')
    async def on_disconnect(sid):
        """Handle socket disconnection - remove from all classrooms"""
        try:
            logger.info(f'[Socket.IO] ⚠️ Client disconnected: {sid}')

            # Remove participant from all classes
            for classId in list(class_participants.keys()):
                if sid in class_participants[classId]:
                    participant = class_participants[classId].pop(sid)
                    logger.info(f'[Socket.IO] Removed {sid} from class {classId}')

                    # Broadcast student-left event to remaining participants
                    await sio.emit(
                        'student-left',
                        {
                            'socketId': sid,
                            'userId': participant.get('userId'),
                            'userName': participant.get('userName'),
                            'timestamp': datetime.now(timezone.utc).isoformat(),
                        },
                        room=classId
                    )
        except Exception as e:
            logger.error(f'[Socket.IO] Error on disconnect: {e}')


    @sio.on('join-classroom')
    async def on_join_classroom(sid, data):
        """Handle student/teacher joining a classroom"""
        try:
            classId = data.get('classId')
            userId = data.get('userId')
            role = data.get('role')
            userName = data.get('userName', f'{role}_{userId}')

            if not classId:
                logger.error(f'[Socket.IO] join-classroom: missing classId')
                return

            # Initialize class participants if needed
            if classId not in class_participants:
                class_participants[classId] = {}

            # Add participant
            class_participants[classId][sid] = {
                'userId': userId,
                'role': role,
                'userName': userName,
                'socketId': sid,
                'joinedAt': datetime.now(timezone.utc).isoformat(),
            }

            # Join socket room
            sio.enter_room(sid, classId)
            logger.info(f'[Socket.IO] {role} {userId} joined class {classId} (socket: {sid})')

            # Broadcast to all in class (except self)
            await sio.emit(
                'student-joined',
                {
                    'socketId': sid,
                    'userId': userId,
                    'role': role,
                    'userName': userName,
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                },
                room=classId,
                skip_sid=sid
            )

            # Send current participants list to new joiner
            participants = list(class_participants[classId].values())
            await sio.emit(
                'participants-list',
                {
                    'classId': classId,
                    'participants': participants,
                    'totalCount': len(participants),
                },
                to=sid
            )

        except Exception as e:
            logger.error(f'[Socket.IO] Error in join-classroom: {e}')


    @sio.on('leave-classroom')
    async def on_leave_classroom(sid, data):
        """Handle student leaving classroom"""
        try:
            classId = data.get('classId')

            if classId and classId in class_participants:
                if sid in class_participants[classId]:
                    participant = class_participants[classId].pop(sid)
                    sio.leave_room(sid, classId)
                    logger.info(f'[Socket.IO] {participant.get("role")} {participant.get("userId")} left class {classId}')

                    # Broadcast to remaining participants
                    await sio.emit(
                        'student-left',
                        {
                            'socketId': sid,
                            'userId': participant.get('userId'),
                            'userName': participant.get('userName'),
                        },
                        room=classId
                    )
        except Exception as e:
            logger.error(f'[Socket.IO] Error in leave-classroom: {e}')


    @sio.on('attendance-update')
    async def on_attendance_update(sid, data):
        """Handle real-time attendance/engagement updates from students"""
        try:
            classId = data.get('classId')
            if not classId:
                logger.debug(f'[Socket.IO] attendance-update: missing classId')
                return

            # Broadcast to teacher and other observers
            await sio.emit(
                'attendance-update',
                {
                    'socketId': sid,
                    'classId': classId,
                    'studentId': data.get('studentId'),
                    'isPresent': data.get('isPresent'),
                    'faceDetected': data.get('faceDetected'),
                    'engagementLevel': data.get('engagementLevel'),
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                },
                room=classId,
                skip_sid=sid  # Don't send back to sender
            )
        except Exception as e:
            logger.error(f'[Socket.IO] Error in attendance-update: {e}')


    @sio.on('engagement-update')
    async def on_engagement_update(sid, data):
        """Handle engagement/attention level updates from students

        Receives: studentId, status, studentName, cameraOn, isPresent, timestamp
        Broadcasts to teacher with all fields for real-time present/absent display
        """
        try:
            # Extract room ID - try common naming patterns
            classId = data.get('roomId') or data.get('classId') or data.get('class_id')
            if not classId:
                logger.debug(f'[Socket.IO] engagement-update: missing classId/roomId')
                return

            student_id = data.get('studentId')
            status = data.get('status')  # 'attentive', 'distracted', or 'not-detected'
            is_present = data.get('isPresent', False)  # Computed by frontend: status !== 'not-detected'

            # Broadcast to teacher with all original fields + timestamps
            # Teacher's frontend expects: is_present, is_face_detected, student_id, student_name
            await sio.emit(
                'engagement-update',
                {
                    'socketId': sid,
                    'classId': classId,
                    'student_id': student_id,
                    'studentId': student_id,  # Keep both for compatibility
                    'student_name': data.get('studentName'),
                    'studentName': data.get('studentName'),  # Keep both for compatibility
                    'status': status,
                    'is_present': is_present,  # Critical: teacher needs this
                    'is_face_detected': status != 'not-detected',  # True if face was detected
                    'cameraOn': data.get('cameraOn'),  # May differ from face detection
                    'timestamp': data.get('timestamp') or datetime.now(timezone.utc).isoformat(),
                },
                room=classId,
                skip_sid=sid  # Don't send back to sender
            )
        except Exception as e:
            logger.error(f'[Socket.IO] Error in engagement-update: {e}')


    @sio.on('end-class')
    async def on_end_class(sid, data):
        """
        Handle teacher ending the class.
        Finalizes attendance for all students and broadcasts report to class.

        Expected data:
        - classId: Class identifier
        - sessionId: Session identifier
        - token: JWT token for API authentication
        """
        try:
            classId = data.get('classId')
            sessionId = data.get('sessionId')
            token = data.get('token')

            if not classId or not sessionId:
                logger.error(f'[Socket.IO] end-class: missing classId or sessionId')
                await sio.emit('error', {
                    'message': 'Missing class or session information'
                }, to=sid)
                return

            logger.info(f'[Socket.IO] 👋 Class ending: {classId}, session: {sessionId}')

            # Import here to avoid circular imports
            from app.attendance import get_attendance_manager
            from app.database import get_database
            from app.auth import decode_access_token

            try:
                # Verify teacher authorization
                if token:
                    payload = decode_access_token(token)
                    user_id = payload.get('sub')
                    logger.info(f'[Socket.IO] end-class: authorized by teacher {user_id}')
            except Exception as e:
                logger.warning(f'[Socket.IO] end-class: token verification failed: {e}')
                # Continue anyway - class end might be system-triggered

            # Get database instance
            try:
                db = get_database()
            except Exception as e:
                logger.error(f'[Socket.IO] end-class: Could not get database: {e}')
                await sio.emit('error', {
                    'message': 'Database unavailable'
                }, to=sid)
                return

            if not db:
                logger.error('[Socket.IO] end-class: Database not available')
                await sio.emit('error', {
                    'message': 'Database unavailable'
                }, to=sid)
                return

            # Fetch class document
            class_doc = await db.classes.find_one({'class_id': classId})
            if not class_doc:
                logger.error(f'[Socket.IO] end-class: Class {classId} not found')
                await sio.emit('error', {
                    'message': 'Class not found'
                }, to=sid)
                return

            # Finalize attendance
            attendance_manager = get_attendance_manager()
            from datetime import datetime
            report = await attendance_manager.finalize_class_attendance(
                class_doc=class_doc,
                session_id=sessionId,
                ended_at=datetime.utcnow(),
                db=db
            )

            # Update class as finished
            await db.classes.update_one(
                {'_id': class_doc['_id']},
                {
                    '$set': {
                        'is_active': False,
                        'is_finished': True,
                        'ended_at': datetime.utcnow()
                    }
                }
            )

            logger.info(f'✅ [Socket.IO] Class {classId} ended: {report.present_count}/{report.total_students} present')

            # Broadcast finalized report to all in class
            await sio.emit(
                'class-ended',
                {
                    'classId': classId,
                    'sessionId': sessionId,
                    'report': report.model_dump(),
                    'timestamp': datetime.utcnow().isoformat(),
                },
                room=classId
            )

        except Exception as e:
            logger.error(f'[Socket.IO] Error in end-class: {e}', exc_info=True)
            await sio.emit('error', {
                'message': f'Error ending class: {str(e)}'
            }, to=sid)


    @sio.on('error')
    def on_error(sid, data):
        """Handle Socket.IO errors"""
        logger.error(f'[Socket.IO] Error from {sid}: {data}')


    logger.info('[Socket.IO] All event handlers registered successfully')


async def broadcast_to_class(sio, classId, eventName, data, excludeSid=None):
    """
    Broadcast an event to all participants in a classroom.

    Args:
        sio: SocketIO instance
        classId: Target classroom ID
        eventName: Event name
        data: Event data
        excludeSid: Optional socket ID to exclude from broadcast
    """
    data['timestamp'] = datetime.now(timezone.utc).isoformat()

    if excludeSid:
        await sio.emit(eventName, data, room=classId, skip_sid=excludeSid)
    else:
        await sio.emit(eventName, data, room=classId)


def get_class_participants(classId):
    """Get all participants in a classroom"""
    return class_participants.get(classId, {})


def get_participant_count(classId):
    """Get number of participants in a classroom"""
    return len(class_participants.get(classId, {}))
