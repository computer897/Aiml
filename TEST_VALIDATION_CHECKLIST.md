# Test Validation Checklist - Face Detection & Attendance Fix

## ✅ Quick Test Guide

### Setup
1. Start backend: `uvicorn main:socket_app --host 0.0.0.0 --port 8000`
2. Start frontend: `npm run dev`
3. Open teacher and student windows side-by-side

---

## Test Scenarios

### Test 1: ✅ Student Joins with Camera ON
**Expected**: Shows as PRESENT (green indicator)

Steps:
1. Teacher: Joins classroom
2. Student: Joins classroom with camera ON
3. Check: EngagementList shows student with green dot
4. Check: Console shows `is_face_detected: true`
5. Verify: Browser logs show face detected

**Pass Criteria**:
- ✓ Student appears in EngagementList with isPresent=true
- ✓ Green indicator visible
- ✓ Console shows `status: 'attentive'`
- ✓ Teacher sees real-time update

---

### Test 2: ✅ Student Toggles Camera OFF
**Expected**: Student STILL shows as PRESENT (if face visible)

Steps:
1. Student: Camera ON, face visible in classroom
2. Teacher: Confirms student showing PRESENT
3. Student: Clicks camera toggle → videoOn=false
4. Check: Student's video disappears to others (but not to themselves)
5. Check: EngagementList still shows PRESENT
6. Verify: Backend continues face detection on attendanceVideoRef

**Pass Criteria**:
- ✓ Camera display OFF to others
- ✓ Student STILL shows PRESENT (green)
- ✓ Face detection continues
- ✓ Console shows face still detected

**Key Point**: Camera visibility ≠ presence status

---

### Test 3: ✅ Student Looks Away
**Expected**: Shows as ABSENT (red indicator)

Steps:
1. Student: Camera ON, initially looking at screen
2. Teacher: Confirms PRESENT
3. Student: Turns head away (or covers camera)
4. Wait: 5 seconds (face detection interval)
5. Check: EngagementList updates to ABSENT

**Pass Criteria**:
- ✓ No face detected → status='not-detected'
- ✓ isPresent becomes false
- ✓ Red indicator appears on teacher's side
- ✓ Console shows `status: 'not-detected'`

---

### Test 4: ✅ Multiple Faces (Cheating Detection)
**Expected**: Shows PRESENT but marked as 'distracted'

Steps:
1. Student: Another person enters frame
2. Face detection detects 2 faces
3. Wait: 5 seconds
4. Check: Still shows PRESENT but with status='distracted'
5. Check: Teacher can see this in logs

**Pass Criteria**:
- ✓ isPresent=true (still present, but distracted)
- ✓ status='distracted' logged
- ✓ Can be viewed in engagement panel

---

### Test 5: ✅ Network Disconnection & Recovery
**Expected**: Graceful handling

Steps:
1. Student: Joined and showing PRESENT
2. Toggle: Browser DevTools → Disconnect network
3. Wait: 5 seconds
4. Restore: Network connection
5. Check: Engagement updates resume

**Pass Criteria**:
- ✓ No crashes
- ✓ Auto-reconnect works (via Socket.IO)
- ✓ Face detection resumes after reconnect

---

### Test 6: ✅ Attendance Report Generation
**Expected**: Correct present/absent status

Steps:
1. Complete Test 1 & 2 scenario (student joins, toggles camera)
2. Teacher: Ends class
3. Check: Attendance report generated
4. Verify: Student marked as PRESENT (because face was detected)

**Pass Criteria**:
- ✓ Report shows student as PRESENT
- ✓ `face_detected_at_least_once: true`
- ✓ `engagement_percentage >= 75%` (threshold)

---

## Console Logs to Check

### Student Console (Face Detection)
```javascript
[useEngagementDetection] Status changed: {
  studentId: "student_123",
  oldStatus: "not-detected",
  newStatus: "attentive",
  faceDetected: true,
  isPresent: true
}
```

### Teacher Console (Receiving Updates)
```javascript
[Classroom] Engagement update: {
  student_id: "student_123",
  student_name: "John Doe",
  status: "attentive",
  is_present: true,
  is_face_detected: true,
  resolved_isPresent: true
}
```

### Backend Logs
```
[Socket.IO] received engagement-update from student: {
  studentId: "student_123",
  status: "attentive",
  isPresent: true,
  cameraOn: true
}
[Socket.IO] broadcasting engagement-update to teacher with:
{
  student_id: "student_123",
  is_present: true,
  is_face_detected: true,
  status: "attentive"
}
```

---

## Field Mapping Verification

### What Student Sends
```javascript
{
  studentId: "123",
  status: "attentive",        // 'attentive'|'distracted'|'not-detected'
  studentName: "John",
  cameraOn: true,             // May differ from face detection
  isPresent: true,            // Computed: status !== 'not-detected'
  timestamp: Date.now()
}
```

### What Backend Broadcasts
```json
{
  "student_id": "123",                          // ← Teacher reads this
  "student_name": "John",                       // ← Teacher reads this
  "status": "attentive",                        // ← For debugging
  "is_present": true,                           // ← CRITICAL: is face detected?
  "is_face_detected": true,                     // ← CRITICAL: true if status != 'not-detected'
  "cameraOn": true,                             // ← May differ from is_present
  "timestamp": "2026-04-14T..."
}
```

### What Teacher Sees (Computed)
```javascript
const isPresent = d.is_present !== false && d.is_face_detected !== false
// Green (PRESENT) if true
// Red (ABSENT) if false
```

---

## Edge Cases to Test

### Edge Case 1: Student joins but camera permission DENIED
- Student: Permission dialog appears
- Click: Deny
- Expected: Face detection cannot run
- Result: Should show as ABSENT (no face detected)

### Edge Case 2: Student camera permission GRANTED but stream fails
- Student: Camera permission granted but getUserMedia fails
- Expected: Face detection should fail gracefully
- Result: Should show as ABSENT

### Edge Case 3: Browser tab loses focus
- Student: Switches to another tab
- Face detection: Should handle paused state
- Expected: Still tracks, but may not detect
- Result: Face detection resumes when tab focused again

### Edge Case 4: Multiple students, rapid join/leave
- Expected: No memory leaks, proper cleanup
- Check: Browser memory usage stable over time

### Edge Case 5: Session timeout
- Student: Idle for extended period (no face detection updates)
- Expected: Should eventually show as ABSENT
- Check: Timeout logic in backend

---

## Performance Metrics to Monitor

After running tests:

1. **Face Detection Interval**: Should be ~5 seconds
2. **Socket.IO Latency**: Should be <200ms per update
3. **CPU Usage**: Should not spike above 30% during face detection
4. **Memory**: Should be stable, no major leaks
5. **Browser Console**: No JS errors or warnings

---

## Rollback Plan

If tests fail:

```bash
# Revert changes
git checkout HEAD~1 backend/app/socket_events.py
git checkout HEAD~1 frontend/src/pages/Classroom.jsx
git checkout HEAD~1 frontend/src/hooks/useEngagementDetection.js

# Or specific revert
git revert <commit-hash>
```

---

## Files Modified

✅ `backend/app/socket_events.py` - Enhanced engagement-update handler
✅ `frontend/src/pages/Classroom.jsx` - Improved WebSocket listener
✅ `frontend/src/hooks/useEngagementDetection.js` - Better logging & clarity

**Documentation**: `FACE_DETECTION_ATTENDANCE_FIX.md`

---

**Status**: Ready for testing
**Date**: 2026-04-14
