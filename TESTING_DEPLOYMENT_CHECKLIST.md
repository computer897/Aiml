# 🧪 Complete Testing & Deployment Checklist

## Phase 1: Local Development Testing

### 1. Backend Setup & Verification

```bash
# Terminal 1: Start Backend
cd backend
python main.py
```

**Expected Output:**
```
[Socket.IO] All event handlers registered successfully
Starting Virtual Classroom Backend...
Database connected successfully
Starting server on 0.0.0.0:8000 (env=development)
```

**Verify in browser:**
```
GET http://localhost:8000/
GET http://localhost:8000/health
GET http://localhost:8000/ping
```

---

### 2. Frontend Setup & Verification

```bash
# Terminal 2: Start Frontend
cd frontend
npm install  # if not done
npm run dev
```

**Expected Output:**
```
VITE v5.4.21 dev server running at:
  Local:   http://localhost:5173/
```

**Check in browser DevTools console:**
```
[API] Configured API Base URL: http://localhost:8000
[SocketIO] Configured with base URL: http://localhost:8000
```

---

### 3. Connection Test

**Scenario: Teacher joins classroom**

1. Open http://localhost:5173/
2. Login as teacher
3. Navigate to classroom
4. Open DevTools (F12) → Console

**Expected logs:**
```
[SocketIO] ✅ Connected: <socket-id>
[SocketIO] Joining classroom: {classId, userId, role}
[API] Request (attempt 1/3): GET /class/<classId>
[API] Response Success: class data loaded
```

**UI should show:**
- Video player area
- "Waiting for students to join..."
- No error messages

---

### 4. Real-time Join Test

**Scenario: Student joins (in same or different browser)**

1. Login as student
2. Join same classroom
3. Watch teacher's screen

**Expected logs (Student Browser):**
```
[SocketIO] ✅ Connected: <socket-id-2>
[SocketIO] Joining classroom: {role: "student"}
```

**Expected logs (Teacher Browser):**
```
student-joined event received
```

**UI should show:**
- Student appears in participants list
- Student video feed appears
- Attendance count updates (0 → 1)

---

### 5. Real-time Engagement Test

**Scenario: Engagement metrics broadcast**

1. Both teacher and student in classroom
2. Developer simulates engagement update:

```javascript
// In teacher console:
const { emit } = await import('/src/services/socketIO.js')
emit('engagement-update', {
  classId: 'test-class',
  userId: 'student-123',
  engagementLevel: 0.95,
  faceDetected: true
})
```

**Expected**: Teacher console shows update immediately

---

## Phase 2: Deployment Testing

### Prerequisites

- [ ] Code committed and pushed to GitHub
- [ ] Backend Render service created
- [ ] Frontend Vercel/Netlify deployment configured
- [ ] MongoDB connection string available

### Backend Deployment

**Step 1: Update Render Service**

1. Go to Render dashboard → Select backend service
2. Configure build command:
   ```
   pip install -r requirements.txt
   ```
3. Configure start command:
   ```
   uvicorn main:socket_app --host 0.0.0.0 --port $PORT
   ```
4. Set environment variables:
   ```
   MONGODB_URL=<your-connection-string>
   ENVIRONMENT=production
   FRONTEND_URL=https://your-frontend-url.com
   ```

**Step 2: Deploy**
- Trigger manual deploy or push code to GitHub
- Wait for deployment (~2-3 minutes)

**Step 3: Verify**
```bash
# Get your service URL from Render (e.g., https://aiml-1-rjdv.onrender.com)

# Test health endpoint
curl https://aiml-1-rjdv.onrender.com/health

# Test ping
curl https://aiml-1-rjdv.onrender.com/ping

# Expected responses:
# {"status": "healthy", "database": "connected", ...}
# {"status": "pong", "timestamp": "..."}
```

---

### Frontend Deployment

**Step 1: Update Environment Variables**

On Vercel/Netlify under Build Settings:

```
VITE_API_URL=https://aiml-1-rjdv.onrender.com
VITE_SOCKET_URL=https://aiml-1-rjdv.onrender.com
```

**Step 2: Deploy**

- Trigger redeploy to apply new environment variables
- Wait for build and deployment

**Step 3: Verify**

1. Open your frontend in browser
2. Open DevTools → Console
3. Look for:
   ```
   [API] Configured API Base URL: https://aiml-1-rjdv.onrender.com
   [SocketIO] Configured with base URL: https://aiml-1-rjdv.onrender.com
   ```

**No warnings** about VITE_SOCKET_URL being unset = ✅

---

## Phase 3: End-to-End Testing

### Test 1: Single Student Join (5 min)

**Steps:**
1. Login as teacher, start classroom
2. Login as different user (student), join same classroom
3. Watch for real-time updates

**Success Criteria:**
- [ ] Student appears in attendance list
- [ ] No "Socket connection failed" errors
- [ ] No API fetch errors
- [ ] Engagement data flows in real-time

---

### Test 2: Multiple Students (10 min)

**Steps:**
1. Open classroom in 5 different browser tabs
2. Join as student in each tab (simulate 5 concurrent joins)
3. Observe teacher dashboard

**Success Criteria:**
- [ ] All 5 students appear simultaneously
- [ ] No race conditions or duplicate entries
- [ ] Attendance count = 5
- [ ] No server errors in backend logs

---

### Test 3: Network Disconnect Recovery (5 min)

**Steps:**
1. Student joins classroom
2. In browser DevTools → Network tab → Throttle to "Offline"
3. Wait 5 seconds
4. Resume network
5. Observe auto-reconnect

**Success Criteria:**
- [ ] Console shows "Disconnected: io client namespace disconnect"
- [ ] Within 5 seconds, shows "Connected: <new-socket-id>"
- [ ] UI remains responsive during disconnect
- [ ] No manual intervention needed

---

### Test 4: Long Duration (30 min)

**Steps:**
1. Start classroom with 3+ students
2. Let run for 30 minutes
3. Check console for errors
4. Look for excessive logging

**Success Criteria:**
- [ ] No "fetch failed" errors after 30 min
- [ ] Ping keeps server alive (no Render sleep)
- [ ] Memory usage stable (no leaks)
- [ ] Real-time updates continue working

---

### Test 5: Mobile (10 min)

**Steps:**
1. Test on iPhone/Android in classroom
2. Join as student
3. Test real-time updates
4. Test disconnect/reconnect

**Success Criteria:**
- [ ] Connects successfully
- [ ] Real-time updates work
- [ ] No additional errors vs desktop
- [ ] UI responsive on mobile

---

## Phase 4: Performance Testing

### Load Test: 20 Students

```bash
# Simulate 20 concurrent joins
for i in {1..20}; do
  # Browser automation script here
done
```

**Expected Results:**
- [ ] All 20 connect within 30 seconds
- [ ] No timeouts
- [ ] No memory spikes
- [ ] CPU usage < 80%

---

### Keep-Alive Test: 24 Hours

**Setup:**
- Leave classroom idle for 24 hours
- Monitor Render service logs

**Expected Results:**
- [ ] Server doesn't sleep
- [ ] Ping endpoint responds
- [ ] Can still join after 24h

---

## Issue Resolution Guide

| Issue | Symptom | Solution |
|-------|---------|----------|
| Connection refused | "Cannot connect to server" | Verify backend is running, check URL |
| Socket errors | "[SocketIO] ❌ Connection Error" | Check CORS, verify Socket.IO enabled |
| Missing updates | Attendance doesn't update | Verify onAttendanceUpdate subscribed, check room join |
| Frequent reconnects | Multiple "Disconnected/Connected" | Check backend stability, verify MongoDB |
| CORS errors | "Access-Control-Allow-Origin" | Verify CORS middleware includes frontend URL |
| Timeout errors | "Request timed out" | Increase timeout, check network latency |

---

## Checklist: Ready for Production

- [ ] All Phase 1 tests pass locally
- [ ] Backend deployed to Render
- [ ] Frontend deployed with correct env vars
- [ ] Both services use SAME backend URL
- [ ] Health endpoints responding
- [ ] 10+ concurrent students tested
- [ ] Network failure recovery tested
- [ ] 30+ minute idle tested
- [ ] Mobile device tested
- [ ] Console has no critical errors
- [ ] Database backups configured
- [ ] Error monitoring set up (Sentry/etc)
- [ ] Performance monitoring set up (New Relic/etc)

---

## Quick Reference: Common Commands

```bash
# Backend
python main.py                                    # Start backend
curl http://localhost:8000/health                # Check health
curl http://localhost:8000/ping                  # Keep-alive test

# Frontend
npm run dev                                       # Start dev
npm run build                                     # Build for production
npm run preview                                   # Preview production build

# Debugging
# Browser DevTools → Console for [SocketIO] and [API] logs
# Look for [SocketIO] ✅ Connected for successful connection

# MongoDB
# Check MongoDB connection: MONGODB_URL env var
# Verify: mongosh "<MONGODB_URL>"
```

---

## Performance Benchmarks (Goals)

| Metric | Target | Acceptable |
|--------|--------|----------|
| Student join latency | < 500ms | < 2s |
| Engagement update latency | < 100ms | < 500ms |
| Connection stability (30 min) | 0 disconnects | < 2 disconnects |
| Concurrent students | 50+ | 30+ |
| Memory per student | < 2MB | < 5MB |
| CPU usage (10 students) | < 20% | < 50% |

