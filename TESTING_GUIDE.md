# Quick Test Guide - Engagement-Based Attendance System

## 🚀 Quick Start

### 1. Start Backend Servers

```bash
# Terminal 1 - FastAPI Backend
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 10000

# Terminal 2 - Socket.io Signaling Server
cd backend
node server.js

# Terminal 3 - Frontend
cd frontend
npm run dev
```

---

## ✅ Verification Checklist

### Step 1: Verify 24-Hour Retention is Enabled

```bash
# Check backend config
cat backend/app/config.py | grep attendance_retention_hours
# Should show: attendance_retention_hours: int = 24
```

✅ **Expected:** `attendance_retention_hours: int = 24`

---

### Step 2: Test Student Face Detection

1. **Login as Student**
   - Go to `http://localhost:5173`
   - Create student account or login
   - Join a class

2. **Verify Face Detection Models Load**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for: `✓ Face-api.js models loaded successfully`

3. **Check Face Detection Running**
   - Allow camera access
   - Every 5 seconds, console should show engagement updates
   - Look for: `[useEngagementDetection] face detected: true`

**Test Cases:**

| Scenario | Expected Engagement Status |
|----------|----------------------------|
| Face clearly visible | `attentive` |
| Multiple people in frame | `distracted` |
| Turn away from camera | `not-detected` |
| Cover camera | `not-detected` |

---

### Step 3: Monitor Backend Engagement Updates

**Check API logs:**
```bash
# In backend terminal, you should see:
✓ Attendance started for student John Doe in session session456
Metadata processed for student student789: face=True, attention=87, engagement=45.2%
```

**Test API directly:**
```bash
# Get attendance metadata (requires authentication)
curl -X GET http://localhost:10000/attendance/live/class123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected response:**
```json
{
  "class_id": "class123",
  "class_title": "Machine Learning 101",
  "is_active": true,
  "student_count": 1,
  "students": [
    {
      "student_id": "student789",
      "student_name": "John Doe",
      "face_detected": true,
      "engagement_percentage": 45.2,
      "is_active": true
    }
  ]
}
```

---

### Step 4: Test Teacher Dashboard

1. **Login as Teacher**
   - Create teacher account
   - Create a class
   - Start the class

2. **Open Teacher Dashboard**
   - Navigate to Teacher Dashboard
   - Select your class
   - You should see:
     - **Live Engagement Panel** (if class is active)
     - **Attendance Table** (after class ends)

3. **Verify Live Engagement Panel**
   - Shows students currently in class
   - Green dots for active students
   - Updates every 5 seconds
   - Shows engagement percentage

**Screenshot - Live Panel:**
```
┌──────────────────────────────────────┐
│ Live Engagement - 3 students active  │
├──────────────────────────────────────┤
│ 🟢 John Doe        87%  "attentive"  │
│ 🟡 Jane Smith      45%  "not-detected"│
│ 🟢 Alex Johnson    92%  "attentive"  │
└──────────────────────────────────────┘
```

---

### Step 5: Test Attendance Calculation

**Simulate Different Engagement Levels:**

1. **High Engagement (Should be PRESENT)**
   - Face detected for 45+ minutes out of 60-minute class
   - Expected: ≥60% = **PRESENT**

2. **Low Engagement (Should be ABSENT)**
   - Face detected for only 10 minutes out of 60-minute class
   - Expected: <60% = **ABSENT**

**Test by manually updating MongoDB:**
```javascript
// Connect to MongoDB
use virtual_classroom

// Update a student's engagement time
db.attendance.updateOne(
  { session_id: "session456", student_id: "student789" },
  {
    $set: {
      engagement_duration_seconds: 2700,  // 45 minutes = 2700 seconds
      total_class_duration_seconds: 3600  // 60 minutes = 3600 seconds
    }
  }
)

// Calculate: 2700/3600 = 0.75 = 75% → PRESENT ✅
```

---

### Step 6: End Class and Finalize Attendance

1. **Teacher clicks "End Class"** in classroom
2. Backend calls `finalize_class_attendance()`
3. Attendance status calculated for each student
4. Records saved to `attendance_reports` collection

**Verify in MongoDB:**
```javascript
db.attendance_reports.find({ class_id: "class123" }).pretty()
```

**Expected output:**
```javascript
{
  "class_id": "class123",
  "session_id": "session456",
  "student_id": "student789",
  "student_name": "John Doe",
  "section": "CS-A",
  "attendance_status": "present",  // or "absent"
  "engagement_time_seconds": 2700,
  "engagement_ratio": 0.75,
  "engagement_percentage": 75.0,
  "class_duration_seconds": 3600,
  "expires_at": ISODate("2026-03-30T11:00:00Z")  // 24 hours later
}
```

---

### Step 7: View Attendance Report in Dashboard

Teacher Dashboard should now show:

```
┌──────────────┬─────────┬─────────────────┬─────────┬────────────┐
│ Name         │ Section │ Engagement Time │ Status  │ Engagement │
├──────────────┼─────────┼─────────────────┼─────────┼────────────┤
│ John Doe     │ CS-A    │ 45 min          │ PRESENT │ 75% █████▒ │
│ Jane Smith   │ CS-A    │ 27 min          │ ABSENT  │ 45% ███▒▒▒ │
│ Alex Johnson │ CS-B    │ 55 min          │ PRESENT │ 92% ██████ │
└──────────────┴─────────┴─────────────────┴─────────┴────────────┘
```

**Color verification:**
- ✅ PRESENT status = Green badge
- ❌ ABSENT status = Red badge
- ⚠️ Progress bar = Green (>80%), Yellow (60-80%), Red (<60%)

---

### Step 8: Test CSV Download

1. **Click "Download CSV" button** in Attendance Table
2. File should download as: `attendance_class123_session456.csv`

**Expected CSV format:**
```csv
Name,Section,Engagement Time,Status,Engagement Percentage,Class Date
John Doe,CS-A,45 min,PRESENT,75.0,2026-03-29
Jane Smith,CS-A,27 min,ABSENT,45.0,2026-03-29
Alex Johnson,CS-B,55 min,PRESENT,92.0,2026-03-29
```

---

### Step 9: Verify 24-Hour Expiration

**Check TTL index exists:**
```javascript
db.attendance_reports.getIndexes()
```

**Expected output includes:**
```javascript
{
  "name": "attendance_report_ttl_idx",
  "key": { "expires_at": 1 },
  "expireAfterSeconds": 0
}
```

**Simulate expiration (for testing):**
```javascript
// Set expires_at to past date
db.attendance_reports.updateOne(
  { session_id: "session456" },
  { $set: { expires_at: new Date("2026-03-28T10:00:00Z") } }
)

// Wait 60 seconds (MongoDB TTL runs every 60 seconds)
// Document should be automatically deleted
```

**Verify deletion:**
```javascript
db.attendance_reports.find({ session_id: "session456" })
// Should return empty result after 60 seconds
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Face Detection Not Working

**Symptoms:**
- Console shows: `Face models failed to load`
- Engagement status always shows `not-detected`

**Solutions:**
1. Check models directory exists:
   ```bash
   ls -la frontend/public/models
   # Should contain: tiny_face_detector_model-weights_manifest.json, etc.
   ```

2. Verify HTTPS (required for camera):
   - Use `https://localhost:5173` or
   - Configure Vite for HTTPS

3. Check browser console for CORS errors

---

### Issue 2: Engagement Time Not Increasing

**Symptoms:**
- Face detected but `engagement_percentage` stays at 0%

**Debug:**
```javascript
// Check browser console
console.log('Metadata sent:', metadata)

// Check backend logs
# Should see: "Metadata processed for student..."
```

**Solutions:**
1. Verify `/attendance/start` was called when student joined
2. Check `frame_interval_seconds` setting matches frontend
3. Ensure MongoDB is running: `mongosh --eval "db.stats()"`

---

### Issue 3: Teacher Dashboard Shows "No Data"

**Symptoms:**
- Dashboard loads but attendance table is empty

**Debug:**
```bash
# Check if reports exist in database
mongosh virtual_classroom
db.attendance_reports.find().count()
```

**Solutions:**
1. Ensure class has ended (attendance finalized)
2. Verify teacher owns the class (check `teacher_id`)
3. Check session_id matches between frontend and backend
4. Look for expired reports (if >24 hours old)

---

### Issue 4: CSV Download Fails

**Symptoms:**
- Button disabled or shows error

**Debug:**
```javascript
// Check browser console
// Error message should indicate the issue
```

**Solutions:**
1. Ensure `classId` and `sessionId` are present
2. Verify backend route is accessible: `/attendance/export/{class_id}/{session_id}`
3. Check CORS headers allow blob downloads

---

## 📊 Success Metrics

Your system is working correctly if:

✅ Face detection runs every 5 seconds
✅ Backend logs show metadata being processed
✅ Live engagement panel updates in real-time
✅ Engagement percentage increases when face detected
✅ Final attendance status matches threshold (≥60% = PRESENT)
✅ Attendance table displays all students correctly
✅ CSV download contains accurate data
✅ Reports expire after 24 hours

---

## 🧪 Complete Test Scenario

**Full end-to-end test:**

1. **Setup (5 min)**
   - Start all 3 servers
   - Create teacher account
   - Create 3 student accounts

2. **Create Class (2 min)**
   - Teacher creates "Test Class"
   - Set duration: 10 minutes

3. **Start Class (1 min)**
   - Teacher starts class
   - Verify live engagement panel appears

4. **Students Join (2 min)**
   - 3 students join class
   - Allow camera access
   - Verify faces detected

5. **Monitor Engagement (10 min)**
   - Student 1: Face visible entire time (100% engagement)
   - Student 2: Face visible for 6 minutes (60% engagement)
   - Student 3: Face visible for 3 minutes (30% engagement)
   - Teacher monitors live panel

6. **End Class (1 min)**
   - Teacher clicks "End Class"
   - Wait for attendance calculation

7. **Verify Results**
   - Student 1: PRESENT ✅ (100% ≥ 60%)
   - Student 2: PRESENT ✅ (60% ≥ 60%)
   - Student 3: ABSENT ❌ (30% < 60%)

8. **Download CSV**
   - Verify CSV contains all 3 students
   - Check data accuracy

9. **Wait 24 Hours**
   - Records should auto-delete from database
   - Dashboard should show "No data" for this session

---

## 🎯 Next Steps

Once all tests pass:

1. **Deploy to Production**
   - Set up production MongoDB
   - Configure production URLs
   - Enable HTTPS
   - Deploy backend to cloud (Heroku, AWS, etc.)
   - Deploy frontend to Vercel/Netlify

2. **Monitor System**
   - Set up logging (Winston, Sentry)
   - Monitor MongoDB disk usage
   - Track API response times
   - Monitor face detection success rate

3. **Gather Feedback**
   - Test with real students
   - Adjust threshold if needed
   - Improve UI based on usage
   - Add analytics dashboard

---

## 📞 Support

If you encounter issues not covered here:

1. Check backend logs: `backend/logs/app.log`
2. Check MongoDB logs: `mongod.log`
3. Check browser console for frontend errors
4. Review full documentation: `ATTENDANCE_SYSTEM_GUIDE.md`

---

**Happy Testing! 🎉**
