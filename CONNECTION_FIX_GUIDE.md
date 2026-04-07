# Frontend-Backend Connection Fix Guide

## Current Status Analysis

### Frontend (React + Vite)
- ✅ Vite env variables configured
- ✅ API service with retry logic exists
- ✅ WebSocket support (native WebSocket for attendance)
- ✅ Socket.IO configured for separate signaling server
- ✅ Keep-alive ping implemented

### Backend (FastAPI)
- ✅ CORS configured
- ✅ Health check endpoint
- ✅ Ping endpoint for keep-alive
- ⚠️ Missing real-time Socket.IO integration

### Gap: Real-time Updates
The backend needs Socket.IO support to broadcast attendance/engagement updates to classrooms in real-time.

---

## CRITICAL ISSUE: Separate Signaling Server

Current architecture uses **2 backends**:
1. **FastAPI** (main: `https://aiml-1-rjdv.onrender.com`) - REST API + WebSocket
2. **Node.js Server** (signaling: `https://aiml-signaling.onrender.com`) - Socket.IO for WebRTC

**Problem**: If signaling server is down, students can't join.

**Solution**: Consolidate Socket.IO into FastAPI backend.

---

## Implementation Steps

### 1. Update Environment Variables ✅ (Already Done)

Frontend `.env.production`:
```
VITE_API_URL=https://aiml-1-rjdv.onrender.com
VITE_SOCKET_URL=https://aiml-1-rjdv.onrender.com
```

### 2. Create Socket.IO Service (Frontend)

Create `frontend/src/services/socketIO.js`:
- Centralized socket connection
- Auto-reconnect with exponential backoff
- Event listeners for class updates
- Room management

### 3. Add Socket.IO to FastAPI (Backend)

Install python-socketio and python-engineio:
```bash
pip install python-socketio python-engineio uvicorn[standard]
```

Create `backend/app/socket_events.py`:
- Handle client connections
- Manage classroom rooms
- Broadcast attendance/engagement updates
- Handle disconnections

### 4. Update Classroom Component

Replace native WebSocket with centralized Socket.IO service:
- Subscribe to real-time updates
- Proper disconnect handling
- Error recovery

### 5. Keep-Alive Mechanism

- Ping every 30 seconds
- Prevent Render "sleeping" (free tier issue)
- Silent failures (don't interrupt classroom)

---

## Files to Create/Update

### Frontend
- `frontend/src/services/socketIO.js` (NEW)
- `frontend/src/pages/Classroom.jsx` (UPDATE)
- `frontend/.env.production` (UPDATE)

### Backend
- `backend/app/socket_events.py` (NEW)
- `backend/main.py` (UPDATE - add Socket.IO)
- `backend/requirements.txt` (UPDATE - Socket.IO deps)

---

## Testing Checklist

- [ ] Students can join without Socket.IO connection errors
- [ ] No continuous "fetch failed" in console
- [ ] Real-time attendance updates appear
- [ ] Drop connection = graceful reconnect (not app crash)
- [ ] 10 students connect simultaneously = no errors
- [ ] Mobile + Desktop work identically
- [ ] Server keeps-alive after 30 minutes idle

