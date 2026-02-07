# Virtual Classroom Backend API

A complete FastAPI backend system for virtual classroom management with AI-powered attendance tracking using face detection and real-time engagement monitoring.

## 🎯 Features

### User Management
- **JWT Authentication** - Secure token-based authentication
- **Role-Based Access** - Separate roles for teachers and students
- **User Registration & Login** - Email/password authentication

### Classroom Management
- **Create Classes** - Teachers can create and schedule classes
- **Join Classes** - Students join using unique class IDs
- **Class Activation** - Start/stop class sessions

### AI-Powered Attendance
- **Face Detection** - Real-time face detection using MediaPipe
- **Engagement Tracking** - Monitors if student is looking at screen
- **Smart Attendance** - Attendance based on engagement percentage (not binary)
- **Configurable Threshold** - Default 75% engagement required for "Present"

### Real-Time Features
- **WebSocket Support** - Live engagement updates for teachers
- **Frame Processing** - Processes student webcam frames every 3 seconds
- **Live Dashboard** - Teachers see real-time student engagement

### Reporting
- **Attendance Reports** - Comprehensive reports per class session
- **Student History** - Individual attendance history
- **Engagement Metrics** - Detailed engagement statistics

## 🏗️ Architecture

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py              # Configuration and settings
│   ├── database.py            # MongoDB connection
│   ├── models.py              # Pydantic models
│   ├── auth.py                # JWT authentication
│   ├── face_detection.py      # MediaPipe face detection
│   ├── attendance.py          # Attendance tracking logic
│   ├── websocket.py           # WebSocket connection manager
│   └── routes/
│       ├── __init__.py
│       ├── auth_routes.py     # /auth endpoints
│       ├── class_routes.py    # /class endpoints
│       └── attendance_routes.py  # /attendance endpoints
├── main.py                    # FastAPI application entry point
├── requirements.txt           # Python dependencies
├── .env                       # Environment variables
└── README.md                  # This file
```

## 📋 Prerequisites

- Python 3.8 or higher
- MongoDB 4.4 or higher
- Webcam (for students)

## 🚀 Installation

### 1. Clone and Navigate
```bash
cd backend
```

### 2. Create Virtual Environment
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Set Up MongoDB

#### Option A: Local MongoDB
Download and install MongoDB from [mongodb.com](https://www.mongodb.com/try/download/community)

#### Option B: MongoDB Atlas (Cloud)
1. Create free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create cluster and get connection string
3. Update `.env` with your connection string

### 5. Configure Environment
Create a `.env` file (or use the provided one):

```env
# Database
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=virtual_classroom

# JWT Security
SECRET_KEY=your-secure-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Server
HOST=0.0.0.0
PORT=8000

# Attendance Settings
ATTENDANCE_THRESHOLD=75.0
FRAME_INTERVAL_SECONDS=3
```

**⚠️ IMPORTANT**: Change `SECRET_KEY` to a secure random string in production!

Generate a secure key:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 🎮 Running the Server

### Development Mode
```bash
python main.py
```

### Production Mode with Uvicorn
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔌 API Endpoints

### Authentication (`/auth`)

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "role": "student"  // or "teacher"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": { ... }
}
```

### Classroom Management (`/class`)

#### Create Class (Teacher Only)
```http
POST /class/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "class_id": "CS101-2024",
  "title": "Introduction to Computer Science",
  "description": "Beginner CS course",
  "schedule_time": "2024-03-15T10:00:00",
  "duration_minutes": 60
}
```

#### Join Class (Student)
```http
POST /class/{class_id}/join
Authorization: Bearer <token>
```

#### Activate Class Session (Teacher)
```http
POST /class/{class_id}/activate
Authorization: Bearer <token>
```

### Attendance (`/attendance`)

#### Start Attendance Session (Student)
```http
POST /attendance/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "class_id": "CS101-2024",
  "session_id": "CS101-2024_20240315_100000"
}
```

#### Submit Frame for Analysis
```http
POST /attendance/frame
Authorization: Bearer <token>
Content-Type: application/json

{
  "session_id": "CS101-2024_20240315_100000",
  "student_id": "user_id_here",
  "frame_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

#### Get Attendance Report (Teacher)
```http
GET /attendance/report/{class_id}/{session_id}
Authorization: Bearer <token>
```

### WebSocket Connection

#### Connect to Live Updates
```javascript
const ws = new WebSocket(
  'ws://localhost:8000/attendance/ws/{class_id}?token=<jwt_token>'
);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Engagement update:', data);
};
```

## 🧠 How Attendance Works

### 1. **Face Detection**
- Uses MediaPipe Face Mesh for accurate face detection
- Detects 468 facial landmarks in real-time
- Works in various lighting conditions

### 2. **Engagement Analysis**
Every frame is analyzed for:
- ✅ **Face Present**: Is there a face in the frame?
- ✅ **Looking at Screen**: Is the student facing forward?
- ✅ **Engagement Time**: Total time student was engaged

### 3. **Attendance Calculation**
```python
engagement_percentage = (engagement_time / total_class_time) * 100

if engagement_percentage >= 75%:
    status = "PRESENT"
else:
    status = "ABSENT"
```

### 4. **Real-Time Updates**
- Student webcam sends frames every 3 seconds
- Backend analyzes each frame immediately
- Teacher dashboard receives live updates via WebSocket
- Engagement percentage updates in real-time

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: Bcrypt encryption
- **Role-Based Access**: Separate teacher/student permissions
- **Protected Routes**: Token verification on all endpoints
- **CORS Configured**: Prevent unauthorized access

## 🎛️ Configuration Options

### Attendance Threshold
Change in `.env`:
```env
ATTENDANCE_THRESHOLD=80.0  # Require 80% engagement
```

### Frame Interval
```env
FRAME_INTERVAL_SECONDS=5  # Process frames every 5 seconds
```

### JWT Token Expiry
```env
ACCESS_TOKEN_EXPIRE_MINUTES=720  # 12 hours
```

## 🧪 Testing the API

### Using cURL

**Register a teacher:**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teacher John",
    "email": "teacher@school.com",
    "password": "password123",
    "role": "teacher"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@school.com",
    "password": "password123"
  }'
```

## 📊 Database Schema

### Users Collection
```javascript
{
  "_id": ObjectId,
  "name": String,
  "email": String,
  "password_hash": String,
  "role": "student" | "teacher",
  "created_at": DateTime
}
```

### Classes Collection
```javascript
{
  "_id": ObjectId,
  "class_id": String,  // Unique identifier
  "title": String,
  "description": String,
  "teacher_id": String,
  "teacher_name": String,
  "schedule_time": DateTime,
  "duration_minutes": Number,
  "is_active": Boolean,
  "enrolled_students": [String],
  "created_at": DateTime
}
```

### Attendance Collection
```javascript
{
  "_id": ObjectId,
  "student_id": String,
  "student_name": String,
  "class_id": String,
  "session_id": String,
  "started_at": DateTime,
  "ended_at": DateTime,
  "total_class_duration_seconds": Number,
  "engagement_duration_seconds": Number,
  "last_frame_timestamp": DateTime,
  "is_face_detected": Boolean,
  "is_looking_at_screen": Boolean,
  "engagement_percentage": Number,
  "status": "present" | "absent" | "in_progress"
}
```

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: Could not connect to MongoDB
```
**Solution**: Ensure MongoDB is running:
```bash
# Check MongoDB status
mongod --version

# Start MongoDB (Windows)
net start MongoDB

# Start MongoDB (Linux/Mac)
sudo systemctl start mongod
```

### MediaPipe Installation Issues
```
Error: No module named 'mediapipe'
```
**Solution**: Install with specific version:
```bash
pip install mediapipe==0.10.9
```

### WebSocket Connection Failed
**Solution**: Check CORS settings in `main.py` and ensure frontend origin is allowed.

## 📈 Performance Tips

1. **Frame Rate**: Adjust `FRAME_INTERVAL_SECONDS` based on network speed
2. **Image Size**: Compress images on frontend before sending
3. **MongoDB Indexing**: Create indexes on frequently queried fields
4. **Connection Pooling**: Adjust MongoDB connection pool size

## 🔄 Workflow Example

### Teacher Workflow:
1. Register as teacher
2. Login and get JWT token
3. Create class with class_id
4. Activate class session
5. Connect to WebSocket for live monitoring
6. View real-time engagement updates
7. Deactivate class when done
8. Generate attendance report

### Student Workflow:
1. Register as student
2. Login and get JWT token
3. Join class using class_id
4. Wait for teacher to activate class
5. Start attendance session
6. Send webcam frames every 3 seconds
7. End attendance session
8. View personal attendance history

## 📝 License

This project is for educational purposes.

## 👨‍💻 Support

For issues or questions:
1. Check API documentation at `/docs`
2. Review logs in console
3. Verify MongoDB connection
4. Check JWT token validity

## 🚀 Production Deployment

### Environment Variables
- Change `SECRET_KEY` to secure random value
- Update `MONGODB_URL` to production database
- Set `allow_origins` in CORS to specific domains
- Use HTTPS for all connections
- Enable MongoDB authentication

### Recommended Hosting
- **API**: Railway, Heroku, AWS, Google Cloud
- **Database**: MongoDB Atlas (managed)
- **WebSocket**: Ensure hosting supports WebSocket connections

---

**Built with FastAPI, MediaPipe, and MongoDB** 🚀
