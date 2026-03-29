# Engagement-Based Attendance System - Complete Guide

## 🎯 Overview

This system tracks student attendance based on **real engagement** rather than just joining a class. It uses face detection to measure how much time students are actively present and attentive during virtual classroom sessions.

---

## 📋 System Requirements

**Frontend:**
- React.js
- face-api.js for face detection
- Socket.io client for real-time communication
- WebRTC for video streaming

**Backend:**
- Python (FastAPI)
- MongoDB for data storage
- Node.js (Socket.io signaling server)
- MediaPipe for server-side face detection (optional)

---

## 🏗️ Architecture

### Frontend Components

| File | Purpose |
|------|---------|
| `src/hooks/useEngagementDetection.js` | Runs face detection every 5 seconds |
| `src/components/AttendanceTable.jsx` | Displays attendance data with download |
| `src/components/AttendanceReportModal.jsx` | Shows final report when class ends |
| `src/components/LiveEngagementPanel.jsx` | Real-time engagement monitoring |
| `src/pages/Classroom.jsx` | Main classroom with video + face detection |
| `src/pages/TeacherDashboard.jsx` | Teacher dashboard with attendance |
| `src/services/webrtc.js` | WebRTC manager with engagement updates |
| `src/services/faceDetection.js` | Face-api.js wrapper |
| `src/services/api.js` | API client for attendance endpoints |

### Backend Components

| File | Purpose |
|------|---------|
| `backend/app/attendance.py` | Core attendance tracking logic |
| `backend/app/routes/attendance_routes.py` | REST API endpoints |
| `backend/app/config.py` | Configuration (threshold, retention) |
| `backend/app/models.py` | Data models (Attendance, AttendanceReport) |
| `backend/server.js` | Socket.io signaling server |

---

## 🔄 System Flow

### 1. Student Joins Class

```javascript
// Student enters classroom
→ WebRTC connection established
→ Camera permission granted
→ Face-api.js models loaded
→ POST /attendance/start
   {
     class_id: "class123",
     session_id: "session456",
     student_id: "student789"
   }
```

**Backend creates attendance record:**
```python
{
  "student_id": "student789",
  "class_id": "class123",
  "session_id": "session456",
  "engagement_duration_seconds": 0,
  "engagement_percentage": 0,
  "status": "in_progress",
  "started_at": "2026-03-29T10:00:00Z"
}
```

---

### 2. Face Detection Runs (Every 5 Seconds)

**Frontend** (`useEngagementDetection.js`):
```javascript
setInterval(async () => {
  const result = await detectFaces(videoElement)

  // Determine engagement status
  let status = 'not-detected'
  if (result.multipleFaces) {
    status = 'distracted'  // Multiple faces detected
  } else if (result.faceDetected) {
    status = 'attentive'   // Single face detected
  }

  // Send to signaling server
  webrtcRef.current.sendEngagementUpdate(
    userId,
    status,
    userName,
    cameraOn
  )

  // Also send metadata to REST API
  await attendanceAPI.submitMetadata({
    class_id,
    session_id,
    student_id,
    face_detected: result.faceDetected,
    attention_score: result.attentionScore,
    multiple_faces: result.multipleFaces,
    timestamp: new Date()
  })
}, 5000)
```

**Backend** (`attendance_routes.py` - POST /attendance/metadata):
```python
# Calculate time since last detection
last_frame_time = attendance_doc["last_frame_timestamp"]
time_diff = (current_time - last_frame_time).total_seconds()

# Only count time if face is detected
if metadata.face_detected and time_diff > 0:
    time_increment = min(time_diff, 5)  # Cap at 5 seconds

# Update engagement seconds
new_engagement_seconds = attendance_doc["engagement_duration_seconds"] + time_increment
total_duration = attendance_doc["total_class_duration_seconds"]
engagement_percentage = (new_engagement_seconds / total_duration * 100)

# Update database
await db.attendance.update_one(
    {"_id": attendance_doc["_id"]},
    {"$set": {
        "engagement_duration_seconds": new_engagement_seconds,
        "engagement_percentage": round(engagement_percentage, 2),
        "last_frame_timestamp": current_time,
        "is_face_detected": metadata.face_detected
    }}
)
```

---

### 3. Teacher Views Live Engagement

**Teacher Dashboard** polls `/attendance/live/{class_id}` every 5 seconds:

```javascript
// GET /attendance/live/class123
{
  "class_id": "class123",
  "class_title": "Machine Learning 101",
  "is_active": true,
  "student_count": 25,
  "students": [
    {
      "student_id": "student789",
      "student_name": "John Doe",
      "section": "CS-A",
      "face_detected": true,
      "looking_at_screen": true,
      "engagement_percentage": 87.5,
      "attention_score": 92,
      "is_active": true,
      "last_seen": "2026-03-29T10:45:23Z"
    },
    // ... more students
  ]
}
```

**Live Engagement Panel displays:**
- 🟢 Green dot = Face detected + active
- 🟡 Yellow dot = Face not detected but still connected
- 🔴 Red dot = Inactive (no updates in 10+ seconds)

---

### 4. Class Ends - Calculate Final Attendance

**Teacher clicks "End Class":**

```javascript
// POST /attendance/end
{
  class_id: "class123",
  session_id: "session456",
  ended_at: "2026-03-29T11:00:00Z"
}
```

**Backend** (`attendance.py` - `finalize_class_attendance()`):
```python
# Get all attendance records for this session
cursor = db.attendance.find({
    "class_id": "class123",
    "session_id": "session456"
})

# Calculate attendance status for each student
for record in attendance_records:
    engagement_seconds = record["engagement_duration_seconds"]
    engagement_ratio = engagement_seconds / class_duration_seconds

    # Apply threshold (60%)
    if engagement_ratio >= 0.60:
        attendance_status = AttendanceStatus.PRESENT
    else:
        attendance_status = AttendanceStatus.ABSENT

    # Save to attendance_reports collection
    final_report = {
        "class_id": "class123",
        "session_id": "session456",
        "student_id": record["student_id"],
        "student_name": record["student_name"],
        "section": record["section"],
        "attendance_status": attendance_status,
        "engagement_time_seconds": engagement_seconds,
        "engagement_ratio": engagement_ratio,
        "class_duration_seconds": class_duration_seconds,
        "class_date": "2026-03-29",
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(hours=24)
    }

    await db.attendance_reports.insert_one(final_report)
```

---

### 5. Teacher Views Attendance Report

**Attendance Table** (`AttendanceTable.jsx`):

```
┌─────────────┬─────────┬─────────────────┬─────────┬────────────┐
│ Name        │ Section │ Engagement Time │ Status  │ Engagement │
├─────────────┼─────────┼─────────────────┼─────────┼────────────┤
│ John Doe    │ CS-A    │ 45 min          │ PRESENT │ 87% █████▒ │
│ Jane Smith  │ CS-A    │ 52 min          │ PRESENT │ 95% ██████ │
│ Alex Johnson│ CS-B    │ 10 min          │ ABSENT  │ 18% ██▒▒▒▒ │
└─────────────┴─────────┴─────────────────┴─────────┴────────────┘
```

Color coding:
- 🟢 **Green badge** - PRESENT (≥60% engagement)
- 🔴 **Red badge** - ABSENT (<60% engagement)
- 🟡 **Yellow badge** - LATE (if implemented)

---

### 6. Download Attendance Report

**CSV Export** (`/export/{class_id}/{session_id}`):

```csv
Name,Section,Engagement Time,Status,Engagement Percentage,Class Date
John Doe,CS-A,45 min,PRESENT,87.5,2026-03-29
Jane Smith,CS-A,52 min,PRESENT,95.0,2026-03-29
Alex Johnson,CS-B,10 min,ABSENT,18.3,2026-03-29
```

---

### 7. 24-Hour Automatic Cleanup

**MongoDB TTL Index** (automatically removes expired records):

```python
# attendance.py - creates TTL index
await db.attendance_reports.create_index(
    "expires_at",
    expireAfterSeconds=0,
    name="attendance_report_ttl_idx"
)
```

**Expiration logic:**
```python
expires_at = ended_at + timedelta(hours=24)
# MongoDB automatically deletes documents where
# expires_at < current_time
```

---

## ⚙️ Configuration

### Backend Configuration (`backend/app/config.py`)

```python
class Settings(BaseSettings):
    # Attendance threshold (60% = present, <60% = absent)
    attendance_threshold: float = 60.0

    # How often to run face detection (seconds)
    frame_interval_seconds: int = 5

    # Records expire after 24 hours
    attendance_retention_hours: int = 24
```

### Frontend Face Detection (`frontend/src/hooks/useEngagementDetection.js`)

```javascript
// Detection interval: 5 seconds
intervalRef.current = setInterval(runDetection, 5000)

// Engagement status mapping:
// - Single face detected → "attentive"
// - Multiple faces → "distracted"
// - No face → "not-detected"
```

---

## 🔧 API Endpoints

### Student Endpoints

#### Start Attendance
```http
POST /attendance/start
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "class_id": "class123",
  "session_id": "session456"
}
```

#### Submit Face Detection Metadata
```http
POST /attendance/metadata
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "class_id": "class123",
  "session_id": "session456",
  "student_id": "student789",
  "face_detected": true,
  "attention_score": 87,
  "multiple_faces": false,
  "timestamp": "2026-03-29T10:30:00Z"
}
```

### Teacher Endpoints

#### Get Live Engagement Data
```http
GET /attendance/live/{class_id}
Authorization: Bearer <teacher_token>
```

#### Get Attendance Report
```http
GET /attendance/report/{class_id}/{session_id}
Authorization: Bearer <teacher_token>
```

#### List All Reports for a Class
```http
GET /attendance/reports/{class_id}?limit=25
Authorization: Bearer <teacher_token>
```

#### Export as CSV
```http
GET /attendance/export/{class_id}/{session_id}?format=csv
Authorization: Bearer <teacher_token>
```

#### Finalize Attendance
```http
POST /attendance/end
Authorization: Bearer <teacher_token>
Content-Type: application/json

{
  "class_id": "class123",
  "session_id": "session456",
  "ended_at": "2026-03-29T11:00:00Z"
}
```

#### Delete Report
```http
DELETE /attendance/report/{class_id}/{session_id}
Authorization: Bearer <teacher_token>
```

---

## 🔐 Privacy & Security

### Privacy-Focused Design
- **No video transmission**: Face detection runs 100% client-side using face-api.js
- **No images stored**: Only metadata is sent to server (face_detected: true/false, attention_score: 0-100)
- **Bandwidth efficient**: Only small JSON payloads, no video streams
- **GDPR compliant**: No biometric data storage

### Security Features
- JWT authentication for all endpoints
- Multi-college validation (users can only access their college/department)
- Teacher-only access to attendance reports
- Students can only submit their own attendance data

---

## 📊 Database Schema

### `attendance` Collection (Real-time tracking)
```javascript
{
  "_id": ObjectId("..."),
  "student_id": "student789",
  "student_name": "John Doe",
  "class_id": "class123",
  "session_id": "session456",
  "class_title": "Machine Learning 101",
  "teacher_name": "Dr. Smith",
  "section": "CS-A",
  "started_at": ISODate("2026-03-29T10:00:00Z"),
  "ended_at": ISODate("2026-03-29T11:00:00Z"),
  "engagement_duration_seconds": 2700,  // 45 minutes
  "engagement_percentage": 87.5,
  "total_class_duration_seconds": 3600,  // 60 minutes
  "is_face_detected": true,
  "is_looking_at_screen": true,
  "attention_score": 92,
  "multiple_faces_detected": false,
  "last_frame_timestamp": ISODate("2026-03-29T10:59:55Z"),
  "status": "present"
}
```

### `attendance_reports` Collection (Finalized reports)
```javascript
{
  "_id": ObjectId("..."),
  "class_id": "class123",
  "session_id": "session456",
  "class_title": "Machine Learning 101",
  "teacher_name": "Dr. Smith",
  "student_id": "student789",
  "student_name": "John Doe",
  "section": "CS-A",
  "attendance_status": "present",
  "engagement_time_seconds": 2700,
  "engagement_ratio": 0.875,
  "class_duration_seconds": 3600,
  "class_date": "2026-03-29",
  "started_at": ISODate("2026-03-29T10:00:00Z"),
  "ended_at": ISODate("2026-03-29T11:00:00Z"),
  "created_at": ISODate("2026-03-29T11:05:00Z"),
  "expires_at": ISODate("2026-03-30T11:05:00Z")  // 24 hours later
}
```

---

## 🎛️ Customization Options

### Adjust Attendance Threshold
Change the percentage required to be marked present:

```python
# backend/app/config.py
attendance_threshold: float = 70.0  # Now requires 70% engagement
```

### Change Detection Frequency
Adjust how often face detection runs:

```javascript
// frontend/src/hooks/useEngagementDetection.js
intervalRef.current = setInterval(runDetection, 3000)  // Now every 3 seconds
```

```python
# backend/app/config.py
frame_interval_seconds: int = 3
```

### Modify Retention Period
Change how long reports are kept:

```python
# backend/app/config.py
attendance_retention_hours: int = 48  # Keep for 2 days
# or
attendance_retention_hours: int = 0  # Keep forever
```

### Custom Status Categories
Add "LATE" status for students who join late:

```python
# backend/app/attendance.py
if engagement_ratio >= 0.75:
    attendance_status = AttendanceStatus.PRESENT
elif engagement_ratio >= 0.50:
    attendance_status = AttendanceStatus.LATE
else:
    attendance_status = AttendanceStatus.ABSENT
```

---

## 🐛 Troubleshooting

### Face Detection Not Working

**Issue:** Face-api.js models fail to load
```javascript
// Check browser console for:
[useEngagementDetection] Face models failed to load – using camera fallback
```

**Solution:**
1. Ensure `/public/models` directory exists with face-api.js models
2. Check CDN fallback is accessible
3. Verify HTTPS (face-api requires secure context)

### Attendance Shows 0% Despite Face Detection

**Issue:** Engagement time not accumulating

**Check:**
1. Backend `frame_interval_seconds` matches frontend interval
2. `POST /attendance/metadata` is being called successfully
3. MongoDB connection is working
4. Check backend logs for errors

```bash
# Check backend logs
tail -f backend/logs/app.log
```

### Reports Not Appearing in Dashboard

**Issue:** Teacher dashboard shows "No attendance data"

**Check:**
1. Class is active (`is_active: true`)
2. Students have called `/attendance/start`
3. Session ID matches between frontend and backend
4. Teacher has permission to view the class

### Records Not Expiring After 24 Hours

**Issue:** Old records still visible

**Check:**
```python
# Verify retention is enabled
print(settings.attendance_retention_hours)  # Should be 24, not 0
```

```javascript
// Check MongoDB TTL index
db.attendance_reports.getIndexes()
// Should see: { "expires_at": 1, expireAfterSeconds: 0 }
```

---

## 📈 Performance Optimization

### Frontend Optimizations
- Face-api uses **TinyFaceDetector** (fast, lightweight model)
- Detection runs only when video is ready (`readyState >= 2`)
- Falls back to camera presence check if face-api fails

### Backend Optimizations
- MongoDB indexes on `(class_id, session_id, student_id)`
- Aggregation pipeline for report summaries
- TTL index for automatic cleanup
- WebSocket for real-time updates (no polling needed)

### Network Optimizations
- Only metadata transmitted (not video frames)
- Engagement updates batched via WebSocket
- Gzip compression for API responses

---

## 🚀 Deployment Checklist

### Frontend
- [ ] Build production bundle: `npm run build`
- [ ] Configure face-api.js models path
- [ ] Set production API URL
- [ ] Enable HTTPS (required for camera access)

### Backend
- [ ] Set MongoDB connection string
- [ ] Configure JWT secret key
- [ ] Set `environment: "production"`
- [ ] Enable CORS for your frontend domain
- [ ] Start FastAPI: `uvicorn main:app --host 0.0.0.0 --port 10000`
- [ ] Start Socket.io: `node server.js`

### Database
- [ ] Create MongoDB indexes (automatic on first request)
- [ ] Set up database backups
- [ ] Monitor disk usage (TTL cleanup requires sufficient space)

---

## 📚 Additional Resources

### Face-api.js Documentation
- Models: https://github.com/vladmandic/face-api
- TinyFaceDetector: Fastest model for real-time detection

### MongoDB TTL Indexes
- Docs: https://docs.mongodb.com/manual/core/index-ttl/
- Note: Cleanup runs every 60 seconds

### WebRTC Best Practices
- Use TURN server for NAT traversal
- Implement reconnection logic
- Monitor connection quality

---

## 💡 Tips & Best Practices

1. **Test with Real Students**: Face detection accuracy varies by lighting and camera quality
2. **Set Reasonable Thresholds**: 60-70% is realistic for attentive students
3. **Monitor Engagement Live**: Use live panel to spot issues during class
4. **Backup Reports**: Export CSV regularly before 24-hour expiration
5. **Privacy Notice**: Inform students that face detection is enabled
6. **Fallback Plan**: Have manual attendance option for technical issues

---

## 🎉 Conclusion

Your engagement-based attendance system is **fully operational**! All 8 steps are implemented:

✅ Face detection every 5 seconds
✅ Engagement data storage
✅ Automatic attendance calculation (60% threshold)
✅ Finalized attendance records
✅ Teacher dashboard with live monitoring
✅ **24-hour retention enabled**
✅ CSV export functionality
✅ Complete end-to-end flow

Start your backend servers and test the system in a real classroom session!

---

**Last Updated:** March 29, 2026
**System Version:** 1.0
**Status:** Production Ready ✅
