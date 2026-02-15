# AI Monitor Virtual Classroom - Production Architecture

## Overview
A production-ready AI-powered virtual classroom system with real-time face attendance tracking, similar to Google Meet but with enhanced AI monitoring capabilities.

---

## Database Schema (MongoDB)

### Collections

#### 1. `users`
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  password_hash: String (required),
  role: "student" | "teacher",
  college_name: String (required),
  department_name: String (required),
  profile_picture: String (optional),
  google_id: String (optional - for OAuth),
  terms_accepted: Boolean (default: false),
  terms_accepted_at: DateTime,
  notification_preferences: {
    class_reminders: Boolean,
    announcements: Boolean,
    messages: Boolean
  },
  created_at: DateTime,
  updated_at: DateTime
}
```

#### 2. `classes`
```javascript
{
  _id: ObjectId,
  class_id: String (required, unique - user-friendly ID),
  title: String (required),
  description: String,
  teacher_id: String (ref: users._id),
  teacher_name: String,
  college_name: String (required),
  department_name: String (required),
  schedule_time: DateTime,
  duration_minutes: Number,
  is_active: Boolean,
  is_finished: Boolean,
  started_at: DateTime,
  ended_at: DateTime,
  enrolled_students: [String] (array of user IDs),
  session_id: String (current session),
  created_at: DateTime,
  updated_at: DateTime
}
```

#### 3. `join_requests`
```javascript
{
  _id: ObjectId,
  class_id: String (ref: classes.class_id),
  student_id: String (ref: users._id),
  student_name: String,
  student_email: String,
  status: "pending" | "accepted" | "rejected",
  requested_at: DateTime,
  responded_at: DateTime,
  responded_by: String (teacher ID)
}
```

#### 4. `attendance`
```javascript
{
  _id: ObjectId,
  student_id: String (ref: users._id),
  student_name: String,
  class_id: String (ref: classes.class_id),
  session_id: String,
  started_at: DateTime,
  ended_at: DateTime,
  status: "present" | "absent" | "in_progress",
  engagement_percentage: Number,
  face_detection_count: Number,
  total_frames_analyzed: Number,
  camera_off_duration: Number (seconds),
  engagement_scores: [{
    timestamp: DateTime,
    score: Number,
    face_detected: Boolean
  }]
}
```

#### 5. `documents`
```javascript
{
  _id: ObjectId,
  class_id: String (ref: classes.class_id),
  teacher_id: String (ref: users._id),
  title: String,
  description: String,
  file_url: String,
  file_name: String,
  file_type: String,
  file_size: Number,
  uploaded_at: DateTime,
  download_count: Number,
  viewed_by: [String] (array of user IDs)
}
```

#### 6. `announcements`
```javascript
{
  _id: ObjectId,
  class_id: String (ref: classes.class_id),
  teacher_id: String (ref: users._id),
  teacher_name: String,
  title: String,
  content: String,
  priority: "normal" | "important" | "urgent",
  created_at: DateTime,
  seen_by: [String] (array of user IDs),
  notifications_sent: Boolean
}
```

#### 7. `notifications`
```javascript
{
  _id: ObjectId,
  user_id: String (ref: users._id),
  type: "announcement" | "join_request" | "class_started" | "document",
  title: String,
  message: String,
  reference_id: String (document/announcement/class ID),
  is_read: Boolean,
  created_at: DateTime
}
```

---

## Backend API Routes

### Authentication (`/auth`)
- `POST /auth/register` - Register new user (with college/department)
- `POST /auth/login` - Login with email/password
- `POST /auth/google` - Google OAuth login
- `GET /auth/me` - Get current user profile
- `PUT /auth/profile` - Update user profile
- `PUT /auth/password` - Update password
- `POST /auth/accept-terms` - Accept terms and conditions

### Classes (`/class`)
- `POST /class/create` - Create new class (teacher only)
- `GET /class/teacher/classes` - Get teacher's classes
- `GET /class/student/classes` - Get enrolled classes
- `GET /class/student/available` - Get available classes to join
- `GET /class/{class_id}` - Get class details
- `PUT /class/{class_id}` - Update class (teacher only)
- `DELETE /class/{class_id}` - Delete class (teacher only)
- `POST /class/{class_id}/activate` - Start class session
- `POST /class/{class_id}/deactivate` - End class session
- `POST /class/{class_id}/enroll` - Enroll student

### Join Requests (`/join-request`)
- `POST /join-request/{class_id}` - Submit join request (student)
- `GET /join-request/pending/{class_id}` - Get pending requests (teacher)
- `POST /join-request/{request_id}/accept` - Accept join request
- `POST /join-request/{request_id}/reject` - Reject join request
- `GET /join-request/status/{class_id}` - Check request status (student)

### Attendance (`/attendance`)
- `POST /attendance/start` - Start attendance tracking
- `POST /attendance/frame` - Submit face detection frame
- `POST /attendance/end` - End attendance tracking
- `GET /attendance/report/{class_id}` - Get class attendance report
- `GET /attendance/download/{class_id}` - Download attendance (CSV/Excel)
- `GET /attendance/student/{student_id}` - Get student history

### Documents (`/documents`)
- `POST /documents/upload` - Upload document (teacher)
- `GET /documents/class/{class_id}` - Get class documents
- `GET /documents/{doc_id}/download` - Download document
- `DELETE /documents/{doc_id}` - Delete document (teacher)

### Announcements (`/announcements`)
- `POST /announcements/create` - Create announcement (teacher)
- `GET /announcements/class/{class_id}` - Get class announcements
- `POST /announcements/{ann_id}/seen` - Mark as seen
- `GET /announcements/{ann_id}/stats` - Get seen count (teacher)

### Notifications (`/notifications`)
- `GET /notifications` - Get user notifications
- `POST /notifications/{id}/read` - Mark as read
- `POST /notifications/read-all` - Mark all as read
- `GET /notifications/unread-count` - Get unread count

### WebSocket (`/ws`)
- `/ws/class/{class_id}` - Real-time class events
  - Join requests (teacher)
  - Class started/ended
  - Participant joined/left
  - Screen sharing status

---

## Frontend Structure

```
frontend/src/
├── components/
│   ├── common/           # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   └── Toast.jsx
│   ├── auth/             # Authentication components
│   │   ├── LoginForm.jsx
│   │   ├── SignUpForm.jsx
│   │   └── GoogleAuthButton.jsx
│   ├── classroom/        # Classroom components
│   │   ├── VideoGrid.jsx
│   │   ├── ControlBar.jsx
│   │   ├── ParticipantsList.jsx
│   │   ├── JoinRequestModal.jsx
│   │   └── WaitingRoom.jsx
│   ├── dashboard/        # Dashboard components
│   │   ├── ClassCard.jsx
│   │   ├── StatsCard.jsx
│   │   └── AnnouncementCard.jsx
│   └── layout/
│       ├── Header.jsx
│       ├── Sidebar.jsx
│       └── DashboardLayout.jsx
├── pages/
│   ├── Login.jsx
│   ├── SignUp.jsx
│   ├── TermsAcceptance.jsx    # First-time terms screen
│   ├── StudentDashboard.jsx
│   ├── TeacherDashboard.jsx
│   ├── Classroom.jsx
│   └── Settings.jsx
├── services/
│   ├── api.js            # API client
│   ├── auth.js           # Auth utilities
│   ├── webrtc.js         # WebRTC handling
│   ├── faceDetection.js  # Face detection
│   └── socket.js         # WebSocket connection
├── context/
│   ├── AuthContext.jsx   # Auth state
│   ├── ThemeContext.jsx  # Theme state
│   └── NotificationContext.jsx
├── hooks/
│   ├── useAuth.js
│   ├── usePWAInstall.js
│   └── useWebRTC.js
└── utils/
    ├── constants.js
    └── helpers.js
```

---

## Key Feature Implementations

### 1. Terms & Conditions Flow
- Show terms acceptance screen on first app load
- Store acceptance in localStorage + database
- Block app access until accepted
- Request camera/mic permissions after acceptance

### 2. Join Request System (Google Meet Style)
- Student clicks "Join Class"
- WebSocket sends request to teacher
- Teacher sees popup with Accept/Reject buttons
- Student waits in waiting room
- On accept: Student enters classroom
- On reject: Student sees rejection message

### 3. Camera Toggle (AI Still Active)
- Toggle only affects video visibility to others
- Internal camera stream continues for AI tracking
- Face detection metadata continues being sent
- UI shows "Camera Off" state but AI notes "camera_off_duration"

### 4. College/Department Isolation
- All class queries filtered by user's college/department
- Teachers can only create classes in their college/department
- Students can only see/join classes in their college/department

### 5. PWA Installation
- Valid manifest.json with proper icons
- Service worker with offline support
- beforeinstallprompt handling
- Custom install button in header

---

## Implementation Priority

### Phase 1: Core Fixes (Must Have)
1. PWA manifest and service worker fixes
2. Auth system with college/department
3. Terms acceptance flow
4. Settings page fixes

### Phase 2: Google Meet Features
1. Join request system with WebSocket
2. Camera toggle with AI still active
3. Waiting room UI
4. Class management (create/edit/delete)

### Phase 3: Enhancements
1. Document upload/download
2. Announcements with notifications
3. Attendance download (CSV/Excel)
4. UI/UX improvements

### Phase 4: Optimization
1. WebRTC performance
2. Database indexing
3. Production deployment
4. Security hardening

---

## Branding Changes

### Before
- Name: "VC Room"
- Logo text: "VC Room"

### After
- Name: "AI Monitor"
- Tagline: "Virtual Classroom"
- Clean professional logo

### UI Removals
- AI Plan option (teacher)
- Notes option (teacher - keep for students)
- Chat option (student)
- Name display in header
- Sun/moon theme toggle
- "500+ users" badge on login

### UI Additions
- Compact "Welcome" text in header
- Clean app logo on login
- Short app description
- Install App button (PWA)
