# 🎓 Virtual Classroom Backend - Project Overview

## 📁 Project Structure

```
backend/
├── app/                           # Main application package
│   ├── __init__.py               # Package initialization
│   ├── config.py                 # Configuration & settings management
│   ├── database.py               # MongoDB connection & management
│   ├── models.py                 # Pydantic data models
│   ├── auth.py                   # JWT authentication & authorization
│   ├── face_detection.py        # MediaPipe face detection & analysis
│   ├── attendance.py            # Attendance tracking logic
│   ├── websocket.py             # Real-time WebSocket manager
│   └── routes/                   # API endpoint routers
│       ├── __init__.py
│       ├── auth_routes.py       # /auth endpoints
│       ├── class_routes.py      # /class endpoints
│       └── attendance_routes.py # /attendance endpoints
│
├── main.py                       # FastAPI application entry point
├── run.py                        # Quick start script
├── test_api.py                  # Automated API test suite
│
├── requirements.txt             # Python dependencies
├── .env                         # Environment variables (not in git)
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
│
├── README.md                    # Main documentation
├── API_TESTING.md              # API testing guide
└── PROJECT_OVERVIEW.md         # This file
```

## 🔑 Key Features Implementation

### 1. Authentication System (`auth.py`)
- **Password Hashing**: Bcrypt for secure password storage
- **JWT Tokens**: Stateless authentication with configurable expiry
- **Role-Based Access**: Separate permissions for teachers and students
- **Protected Routes**: Dependency injection for authentication

**Key Functions:**
- `hash_password()` - Hash passwords with bcrypt
- `create_access_token()` - Generate JWT tokens
- `get_current_user()` - Verify and extract user from token
- `get_current_teacher()` / `get_current_student()` - Role verification

### 2. Face Detection (`face_detection.py`)
- **MediaPipe Face Mesh**: 468 facial landmark detection
- **Head Pose Analysis**: Determines if student is looking at screen
- **Real-time Processing**: Analyzes frames as they arrive
- **Robust Detection**: Works in various lighting conditions

**Algorithm:**
1. Decode base64 image to numpy array
2. Process with MediaPipe Face Mesh
3. Extract key landmarks (nose, eyes, mouth)
4. Calculate face center and symmetry
5. Determine if looking at screen based on:
   - Horizontal centering (< 30% deviation)
   - Face symmetry (> 70% ratio)
   - Proper vertical alignment

### 3. Attendance Tracking (`attendance.py`)
- **Smart Attendance**: Not binary - based on engagement percentage
- **Real-time Updates**: Continuous tracking during class
- **Configurable Threshold**: Default 75% for "Present" status
- **Session Management**: Tracks active sessions

**Core Logic:**
```python
# Every frame update:
if face_detected AND looking_at_screen:
    engagement_time += time_since_last_frame

engagement_percentage = (engagement_time / total_class_time) * 100

# Final status:
if engagement_percentage >= 75%:
    status = PRESENT
else:
    status = ABSENT
```

### 4. Real-time Communication (`websocket.py`)
- **WebSocket Manager**: Handles multiple connections per class
- **Broadcast System**: Push updates to all connected clients
- **Connection Lifecycle**: Automatic cleanup on disconnect
- **Live Updates**: Teachers see engagement changes immediately

**Message Types:**
- `connection` - Initial connection confirmation
- `engagement_update` - Real-time student engagement data
- `attendance_status` - Final attendance status
- `pong` - Heartbeat response

### 5. Database Models (`models.py`)

#### User Model
```python
{
    "id": "unique_id",
    "name": "string",
    "email": "email@example.com",
    "password_hash": "bcrypt_hash",
    "role": "student" | "teacher",
    "created_at": "datetime"
}
```

#### Class Model
```python
{
    "id": "unique_id",
    "class_id": "CS101-2024",        # Student-facing ID
    "title": "Class Title",
    "teacher_id": "teacher_user_id",
    "schedule_time": "datetime",
    "duration_minutes": 60,
    "is_active": bool,
    "enrolled_students": ["student_ids"]
}
```

#### Attendance Model
```python
{
    "id": "unique_id",
    "student_id": "student_user_id",
    "class_id": "CS101-2024",
    "session_id": "unique_session",
    "engagement_duration_seconds": 3245,
    "total_class_duration_seconds": 3600,
    "engagement_percentage": 90.14,
    "status": "present" | "absent" | "in_progress",
    "is_face_detected": bool,
    "is_looking_at_screen": bool
}
```

## 🔄 Complete Workflow

### Teacher Workflow
```
1. Register → POST /auth/register (role: teacher)
2. Login → POST /auth/login
3. Create Class → POST /class/create
4. Activate Session → POST /class/{class_id}/activate
5. Connect WebSocket → WS /attendance/ws/{class_id}?token=...
6. Monitor Students → Receive real-time updates
7. End Session → POST /class/{class_id}/deactivate
8. View Report → GET /attendance/report/{class_id}/{session_id}
```

### Student Workflow
```
1. Register → POST /auth/register (role: student)
2. Login → POST /auth/login
3. Join Class → POST /class/{class_id}/join
4. Wait for Activation (teacher activates)
5. Start Attendance → POST /attendance/start
6. Send Frames → POST /attendance/frame (every 3 seconds)
7. End Attendance → POST /attendance/end
8. View History → GET /attendance/student/{student_id}
```

## 🎯 API Endpoints Summary

### Authentication (`/auth`)
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token

### Classroom (`/class`)
- `POST /class/create` - Create class (teacher)
- `GET /class/{class_id}` - Get class details
- `POST /class/{class_id}/join` - Join class (student)
- `GET /class/{class_id}/students` - List students (teacher)
- `POST /class/{class_id}/activate` - Start session (teacher)
- `POST /class/{class_id}/deactivate` - End session (teacher)

### Attendance (`/attendance`)
- `POST /attendance/start` - Start tracking (student)
- `POST /attendance/frame` - Submit webcam frame (student)
- `POST /attendance/end` - End tracking (student)
- `GET /attendance/report/{class_id}/{session_id}` - Get report (teacher)
- `GET /attendance/student/{student_id}` - Student history
- `WS /attendance/ws/{class_id}` - Real-time updates (WebSocket)

## 🔒 Security Implementation

### Password Security
- Bcrypt hashing with automatic salt generation
- Minimum 6 character password requirement
- Passwords never stored in plain text

### JWT Security
- HS256 algorithm for token signing
- Configurable token expiry (default 24 hours)
- Token verification on every protected route
- User ID embedded in token payload

### Authorization
- Role-based access control (RBAC)
- Teachers can only access their classes
- Students can only submit their own frames
- Dependency injection for permission checks

### CORS Protection
- Configurable allowed origins
- Credentials support for cross-origin requests
- Preflight request handling

## 🚀 Performance Considerations

### Database Optimization
- Async MongoDB driver (Motor)
- Connection pooling
- Index on frequently queried fields:
  - `users.email` (unique)
  - `classes.class_id` (unique)
  - `attendance.session_id + student_id`

### Frame Processing
- Efficient base64 decoding
- MediaPipe optimized for real-time use
- Frame validation before processing
- Configurable frame interval (default 3 seconds)

### WebSocket Efficiency
- Single connection per client
- Broadcast only to relevant class
- Automatic cleanup of dead connections
- Minimal message payload

## 📊 Data Flow

### Frame Processing Flow
```
Student Browser
    ↓ (capture webcam)
    ↓ (convert to base64)
    ↓ POST /attendance/frame
FastAPI Backend
    ↓ (decode image)
    ↓ (MediaPipe face detection)
    ↓ (calculate engagement)
    ↓ (update database)
    ↓ (broadcast via WebSocket)
Teacher Dashboard
    ↓ (display real-time update)
```

### Attendance Calculation Flow
```
Frame Received
    ↓
Detect Face? → NO → engagement_time unchanged
    ↓ YES
Looking at Screen? → NO → engagement_time unchanged
    ↓ YES
engagement_time += time_since_last_frame
    ↓
engagement_percentage = (engagement_time / total_time) * 100
    ↓
Update Database
    ↓
Broadcast to Teacher
```

## 🛠️ Configuration Options

### Environment Variables (`.env`)
```env
# Database
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=virtual_classroom

# Security
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Server
HOST=0.0.0.0
PORT=8000

# Attendance
ATTENDANCE_THRESHOLD=75.0
FRAME_INTERVAL_SECONDS=3
```

### Adjustable Parameters
- **Attendance Threshold**: Change percentage required for "Present"
- **Frame Interval**: How often to expect frames from students
- **Token Expiry**: How long JWT tokens remain valid
- **Face Detection Confidence**: MediaPipe min_detection_confidence

## 🧪 Testing Strategy

### 1. Health Check
```bash
curl http://localhost:8000/health
```

### 2. Automated Tests
```bash
python test_api.py
```

### 3. Manual Testing
- Use Swagger UI at `/docs`
- Follow `API_TESTING.md` guide
- Test WebSocket with browser console

### 4. Integration Testing
- Full workflow: Register → Login → Create → Join → Attend
- Test with real webcam frames
- Monitor WebSocket messages

## 📈 Scalability Considerations

### Horizontal Scaling
- Stateless authentication (JWT)
- MongoDB supports sharding
- WebSocket connections can be distributed

### Vertical Scaling
- Async operations throughout
- Efficient MediaPipe processing
- Connection pooling

### Monitoring
- Structured logging
- Health check endpoint
- Database connection status

## 🔮 Future Enhancements

1. **Advanced Analytics**
   - Attention heatmaps
   - Engagement trends over time
   - Predictive attendance

2. **Additional Features**
   - Recording sessions
   - Breakout rooms
   - Quiz integration
   - Screen sharing detection

3. **ML Improvements**
   - Emotion detection
   - Distraction detection
   - Multi-face handling

4. **Infrastructure**
   - Redis caching
   - Message queue for frames
   - CDN for video delivery
   - Microservices architecture

## 📞 Support & Maintenance

### Logging
- Structured logs with timestamps
- Different log levels (INFO, WARNING, ERROR)
- Database connection logs
- Authentication logs

### Error Handling
- Try-catch blocks in critical sections
- Descriptive error messages
- HTTP status codes follow REST standards
- Graceful degradation

### Dependencies
- Keep packages updated
- Pin versions in requirements.txt
- Test before major updates

---

**Built with ❤️ using FastAPI, MediaPipe, and MongoDB**
