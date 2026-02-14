# AI-Based Attendance & Engagement Tracking System

## Overview

This system provides ethical, privacy-focused AI attendance and engagement tracking for the Virtual Classroom application. All face detection runs locally in the browser - no video or images are ever sent to the server.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Student Browser                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Camera Stream                        ││
│  │  ┌─────────────┐      ┌─────────────────────────────┐  ││
│  │  │  Track A    │      │      Track B                │  ││
│  │  │  (WebRTC)   │      │  (Local Attendance)         │  ││
│  │  │             │      │                             │  ││
│  │  │ - Visible   │      │ - face-api.js processing    │  ││
│  │  │   to peers  │      │ - Runs every 3 seconds      │  ││
│  │  │ - Can be    │      │ - Stays active even when    │  ││
│  │  │   toggled   │      │   camera is "off" for peers │  ││
│  │  │   off       │      │                             │  ││
│  │  └─────────────┘      └──────────────┬──────────────┘  ││
│  │                                      │                  ││
│  │                              Metadata Only              ││
│  │                              (no video/images)          ││
│  └──────────────────────────────│──────────────────────────┘│
└─────────────────────────────────│───────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │  POST /attendance/metadata   │
                    │                             │
                    │  {                          │
                    │    face_detected: true,     │
                    │    multiple_faces: false,    │
                    │    attention_score: 85,     │
                    │    timestamp: "...",        │
                    │    processing: "client-side"│
                    │  }                          │
                    └─────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │        FastAPI Backend       │
                    │                             │
                    │  - Update engagement time   │
                    │  - Calculate attendance %   │
                    │  - Broadcast via WebSocket  │
                    └─────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   Teacher Dashboard (Live)   │
                    │                             │
                    │  - See all students status  │
                    │  - Engagement percentages   │
                    │  - Export to CSV            │
                    └─────────────────────────────┘
```

## Privacy & Security Features

### 1. Consent-Based Tracking
- Students see a **ConsentModal** before joining class
- Modal clearly explains:
  - Camera will be used for attendance
  - Processing happens locally in browser
  - Only metadata is transmitted
- If declined → Cannot join class
- No hidden tracking

### 2. Browser-Side Processing
- Uses **face-api.js** (TinyFaceDetector model)
- All AI processing happens in the browser
- No raw video/images leave the device
- Only boolean/numeric metadata sent to server

### 3. Data Minimization
Metadata sent to server:
```json
{
  "student_id": "...",
  "class_id": "...",
  "face_detected": true,
  "multiple_faces": false,
  "attention_score": 85,
  "timestamp": "2024-01-15T10:30:00Z",
  "processing_location": "client-side"
}
```

What we **DO NOT** collect:
- Raw video footage
- Facial images or biometric data
- Face embeddings or recognition data
- Screen recordings

## Dual-Track Camera System

### Track A: WebRTC Video (Peer-visible)
- Controlled by the "Camera On/Off" button
- When OFF, peers see avatar placeholder
- Managed by WebRTC peer connections

### Track B: Attendance Video (Local only)
- Runs independently of Track A
- Stays active for attendance even when camera appears "off"
- Shows "Attendance Tracking Active" indicator
- Transparent UI - no deception

## Implementation Details

### Frontend Files

| File | Purpose |
|------|---------|
| `components/ConsentModal.jsx` | Privacy consent dialog |
| `services/faceDetection.js` | face-api.js wrapper service |
| `pages/Classroom.jsx` | Integrated dual-track logic |
| `components/EngagementList.jsx` | Teacher live dashboard |

### Backend Files

| File | Purpose |
|------|---------|
| `models.py` | AttendanceMetadata Pydantic model |
| `routes/attendance_routes.py` | /metadata endpoint, CSV export |

### Key Functions

#### Frontend
```javascript
// Face detection (browser-side)
import { createFaceTracker, generateAttendanceMetadata } from './services/faceDetection'

const tracker = createFaceTracker(videoElement, (detection) => {
  const metadata = generateAttendanceMetadata(studentId, classId, detection)
  attendanceAPI.submitMetadata(metadata) // Only metadata, no video
}, 3000)

await tracker.start()
```

#### Backend
```python
# Metadata endpoint (no images)
@router.post("/metadata")
async def process_metadata(metadata: AttendanceMetadata, ...):
    # Update engagement time
    # Broadcast to teacher via WebSocket
    # No video/images stored
```

## Screen Share Behavior

When teacher shares screen:
1. `RTCPeerConnection.replaceTrack()` swaps video
2. Students see shared screen instead of teacher video
3. Student attendance tracking **continues** locally
4. When share stops, camera track restored

## Teacher Dashboard Features

- **Live attendance list** with real-time status
- **Present/Absent indicators** with colors
- **Engagement percentage** per student
- **Attention score** from face position analysis
- **Multiple faces alert** (potential cheating)
- **Export to CSV** button

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/attendance/start` | Start session |
| `POST` | `/attendance/metadata` | Submit detection metadata |
| `POST` | `/attendance/end` | End session |
| `GET` | `/attendance/live/{class_id}` | Live attendance data |
| `GET` | `/attendance/report/{class_id}/{session_id}` | Session report |
| `GET` | `/attendance/export/{class_id}/{session_id}` | CSV export |

## Configuration

Face detection interval: 3000ms (every 3 seconds)

Attendance threshold: Configurable in `backend/app/config.py`
- Default: 75% engagement = PRESENT
- Below threshold = ABSENT

## Ethical Guidelines

1. **Transparency**: Always show when tracking is active
2. **Consent**: Require explicit opt-in before tracking
3. **Data minimization**: Collect only what's needed
4. **Local processing**: No cloud facial recognition
5. **No biometrics**: No face embeddings stored
6. **User control**: Students can leave at any time
