# API Testing Guide

Quick reference for testing all endpoints.

## 1. Register Users

### Register Teacher
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Prof. Smith",
    "email": "teacher@school.com",
    "password": "teacher123",
    "role": "teacher"
  }'
```

### Register Student
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "student@school.com",
    "password": "student123",
    "role": "student"
  }'
```

## 2. Login

### Teacher Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@school.com",
    "password": "teacher123"
  }'
```

Save the `access_token` from response!

### Student Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@school.com",
    "password": "student123"
  }'
```

## 3. Create Class (Teacher)

```bash
curl -X POST http://localhost:8000/class/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN" \
  -d '{
    "class_id": "CS101-2024",
    "title": "Introduction to Programming",
    "description": "Learn Python basics",
    "schedule_time": "2024-03-15T10:00:00",
    "duration_minutes": 60
  }'
```

## 4. Get Class Info

```bash
curl -X GET http://localhost:8000/class/CS101-2024 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 5. Join Class (Student)

```bash
curl -X POST http://localhost:8000/class/CS101-2024/join \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN"
```

## 6. Activate Class (Teacher)

```bash
curl -X POST http://localhost:8000/class/CS101-2024/activate \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

Note the `session_id` from response!

## 7. Start Attendance (Student)

```bash
curl -X POST http://localhost:8000/attendance/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -d '{
    "class_id": "CS101-2024",
    "session_id": "YOUR_SESSION_ID"
  }'
```

## 8. Submit Frame (Student)

```bash
curl -X POST http://localhost:8000/attendance/frame \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -d '{
    "session_id": "YOUR_SESSION_ID",
    "student_id": "YOUR_STUDENT_ID",
    "frame_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

## 9. Get Attendance Report (Teacher)

```bash
curl -X GET "http://localhost:8000/attendance/report/CS101-2024/YOUR_SESSION_ID" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

## 10. WebSocket Connection (JavaScript)

```javascript
// Teacher connects to monitor class
const token = "YOUR_TEACHER_TOKEN";
const classId = "CS101-2024";

const ws = new WebSocket(
  `ws://localhost:8000/attendance/ws/${classId}?token=${token}`
);

ws.onopen = () => {
  console.log("Connected to engagement tracking");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Update:", data);
  
  if (data.type === "engagement_update") {
    console.log(`Student: ${data.data.student_name}`);
    console.log(`Face detected: ${data.data.is_face_detected}`);
    console.log(`Looking at screen: ${data.data.is_looking_at_screen}`);
    console.log(`Engagement: ${data.data.engagement_percentage}%`);
  }
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

ws.onclose = () => {
  console.log("Disconnected");
};
```

## Testing with Python

### Setup
```python
import requests
import json

BASE_URL = "http://localhost:8000"
```

### Register and Login
```python
# Register teacher
teacher_data = {
    "name": "Prof. Smith",
    "email": "teacher@school.com",
    "password": "teacher123",
    "role": "teacher"
}
response = requests.post(f"{BASE_URL}/auth/register", json=teacher_data)
print(response.json())

# Login
login_data = {
    "email": "teacher@school.com",
    "password": "teacher123"
}
response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
teacher_token = response.json()["access_token"]
print(f"Teacher Token: {teacher_token}")
```

### Create Class
```python
headers = {"Authorization": f"Bearer {teacher_token}"}
class_data = {
    "class_id": "CS101-2024",
    "title": "Introduction to Programming",
    "schedule_time": "2024-03-15T10:00:00",
    "duration_minutes": 60
}
response = requests.post(f"{BASE_URL}/class/create", json=class_data, headers=headers)
print(response.json())
```

## Testing Frame Processing

### Capture Webcam Frame (Python)
```python
import cv2
import base64

# Capture frame from webcam
cap = cv2.VideoCapture(0)
ret, frame = cap.read()
cap.release()

if ret:
    # Encode frame to JPEG
    _, buffer = cv2.imencode('.jpg', frame)
    frame_base64 = base64.b64encode(buffer).decode('utf-8')
    
    # Send to API
    frame_data = {
        "session_id": "YOUR_SESSION_ID",
        "student_id": "YOUR_STUDENT_ID",
        "frame_base64": f"data:image/jpeg;base64,{frame_base64}"
    }
    
    headers = {"Authorization": f"Bearer {student_token}"}
    response = requests.post(
        f"{BASE_URL}/attendance/frame",
        json=frame_data,
        headers=headers
    )
    print(response.json())
```

## Expected Response Examples

### Successful Login
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Alice Johnson",
    "email": "student@school.com",
    "role": "student"
  }
}
```

### Frame Processing Response
```json
{
  "message": "Frame processed successfully",
  "face_detected": true,
  "looking_at_screen": true,
  "engagement_percentage": 85.5,
  "engagement_seconds": 3078
}
```

### Attendance Report
```json
{
  "class_id": "CS101-2024",
  "class_title": "Introduction to Programming",
  "total_students": 25,
  "present_count": 22,
  "absent_count": 3,
  "attendance_records": [
    {
      "student_id": "...",
      "student_name": "Alice Johnson",
      "engagement_percentage": 85.5,
      "status": "present"
    }
  ]
}
```

## Common Issues

### 401 Unauthorized
- Token expired or invalid
- Missing Authorization header
- Solution: Login again to get new token

### 403 Forbidden
- Wrong role for endpoint (e.g., student accessing teacher endpoint)
- Not enrolled in class
- Solution: Check user role and class enrollment

### 404 Not Found
- Class ID doesn't exist
- Session not found
- Solution: Verify class_id and session_id

### 400 Bad Request
- Invalid data format
- Missing required fields
- Solution: Check request body matches schema
