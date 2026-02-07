# ✅ Setup Verification & Final Checklist

## 📋 Pre-Flight Checklist

Before running the system, verify all requirements are met:

### System Requirements
- [ ] **Python 3.8+** installed (`python --version`)
- [ ] **Node.js 16+** installed (`node --version`)
- [ ] **npm** installed (`npm --version`)
- [ ] **MongoDB** installed OR MongoDB Atlas account
- [ ] **Webcam** connected and working
- [ ] **Modern browser** (Chrome/Edge/Firefox)

---

## 🔧 Installation Verification

### Backend Setup

#### 1. Virtual Environment
```bash
cd backend
python -m venv venv
```

**Verify:**
- [ ] `venv/` folder created in `backend/` directory
- [ ] Contains `Scripts/` folder (Windows) or `bin/` (Mac/Linux)

#### 2. Activate Environment
```bash
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

**Verify:**
- [ ] Command prompt shows `(venv)` prefix
- [ ] Example: `(venv) C:\...>\backend>`

#### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

**Expected output:**
```
Successfully installed fastapi-0.109.0 
uvicorn-0.27.0 
mediapipe-0.10.9 
opencv-python-4.9.0.80 
motor-3.3.2 
python-jose-3.3.0 
passlib-1.7.4 
...
```

**Verify:**
- [ ] No errors during installation
- [ ] All packages listed in `requirements.txt` installed
- [ ] Check: `pip list` shows all packages

**Common issues:**
- If `mediapipe` fails: Update pip first (`pip install --upgrade pip`)
- If `opencv` fails: Install Visual C++ Redistributable
- If any package fails: Try `pip install <package_name>` individually

#### 4. Environment Variables
Create `.env` file in `backend/` directory:
```bash
MONGO_URL=mongodb://localhost:27017
DATABASE_NAME=virtual_classroom
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200
```

**Verify:**
- [ ] `.env` file exists in `backend/` folder
- [ ] Contains all 5 variables
- [ ] `MONGO_URL` points to your MongoDB instance
- [ ] `SECRET_KEY` is changed from default

#### 5. MongoDB Connection
Start MongoDB:
```bash
# Local MongoDB (Windows)
net start MongoDB

# Or check if already running
tasklist | findstr mongo
```

**Alternative - MongoDB Atlas (Cloud):**
1. Create free cluster at https://www.mongodb.com/cloud/atlas
2. Get connection string
3. Update `MONGO_URL` in `.env`:
   ```
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
   ```

**Verify:**
- [ ] MongoDB is running (local or cloud)
- [ ] Can connect to MongoDB
- [ ] Test: `python -c "from pymongo import MongoClient; print(MongoClient('mongodb://localhost:27017').server_info())"`

#### 6. Start Backend
```bash
python main.py
```

**Expected output:**
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     ✓ Connected to MongoDB
INFO:     ✓ Database: virtual_classroom
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**Verify:**
- [ ] No errors in console
- [ ] See "✓ Connected to MongoDB"
- [ ] Server running on port 8000
- [ ] Open http://localhost:8000 in browser
- [ ] Should see: `{"message": "Virtual Classroom API", "status": "running"}`
- [ ] API docs at http://localhost:8000/docs work

**Common issues:**
- Port 8000 in use: Change port in `main.py` or kill process
- MongoDB connection failed: Check MongoDB is running and `MONGO_URL` is correct
- Import errors: Ensure virtual environment is activated

---

### Frontend Setup

#### 1. Install Dependencies
```bash
cd frontend
npm install
```

**Expected output:**
```
added 245 packages, and audited 246 packages in 15s
...
found 0 vulnerabilities
```

**Verify:**
- [ ] No errors during installation
- [ ] `node_modules/` folder created
- [ ] `package-lock.json` created
- [ ] Total packages around 200-300

**Common issues:**
- If errors occur: Delete `node_modules/` and `package-lock.json`, run `npm install` again
- If still fails: Try `npm cache clean --force` first

#### 2. Start Frontend
```bash
npm run dev
```

**Expected output:**
```
  VITE v5.0.8  ready in 450 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

**Verify:**
- [ ] No errors in console
- [ ] Server running on port 5173
- [ ] Open http://localhost:5173 in browser
- [ ] Login page loads
- [ ] UI looks correct (blue gradient, form fields)

**Common issues:**
- Port 5173 in use: Vite will automatically try 5174, 5175, etc.
- Blank page: Check browser console (F12) for errors
- API errors: Ensure backend is running on port 8000

---

## 🧪 Functional Testing

### Test 1: Authentication

#### Register Teacher
1. Open http://localhost:5173
2. Click "Sign Up"
3. Fill form:
   - Name: `Test Teacher`
   - Email: `teacher@test.com`
   - Password: `password123`
   - Role: **Teacher**
4. Click "Sign Up"

**Expected:**
- [ ] Form submits without errors
- [ ] Redirects to Teacher Dashboard
- [ ] See welcome message: "Welcome, Test Teacher!"
- [ ] See "Create Classroom" button

**Verify backend logs:**
```
INFO: ✓ User registered: teacher@test.com (teacher)
INFO: ✓ User logged in: teacher@test.com
```

#### Register Student (Incognito Window)
1. Open **new incognito window**: http://localhost:5173
2. Click "Sign Up"
3. Fill form:
   - Name: `Test Student`
   - Email: `student@test.com`
   - Password: `password123`
   - Role: **Student**
4. Click "Sign Up"

**Expected:**
- [ ] Form submits without errors
- [ ] Redirects to Student Dashboard
- [ ] See "Join Classroom by ID" section

---

### Test 2: Create Classroom (Teacher)

1. In teacher window, click **"Create Classroom"**
2. Fill modal:
   - Class ID: `TEST101`
   - Title: `Test Class`
   - Description: `Testing face detection`
   - Schedule: Select any future date/time
   - Duration: `60` minutes
3. Click "Create Classroom"

**Expected:**
- [ ] Alert: "Classroom 'Test Class' created successfully!"
- [ ] Modal closes
- [ ] Class appears in dashboard (if list is implemented)

**Verify backend logs:**
```
INFO: ✓ Class created: TEST101 by teacher Test Teacher
```

**Verify MongoDB:**
```bash
# Open MongoDB shell or Compass
use virtual_classroom
db.classes.find()
```
Should see the TEST101 class document.

---

### Test 3: Start Class (Teacher)

1. Click **"Start Class"** button
2. Should navigate to classroom view

**Expected:**
- [ ] URL changes to `/classroom/TEST101`
- [ ] Classroom UI loads
- [ ] See class title: "Test Class"
- [ ] Engagement panel visible (left sidebar)
- [ ] Initially empty (no students)
- [ ] Video controls at bottom

**Verify backend logs:**
```
INFO: ✓ Class TEST101 activated with session TEST101_20250101_120000
```

---

### Test 4: Join Class (Student)

1. In student window, in "Join Classroom by ID" section
2. Enter Class ID: `TEST101`
3. Click "Join"

**Expected:**
- [ ] Alert: "Successfully enrolled in class!"
- [ ] Class appears in "Your Enrolled Classes"
- [ ] Class card shows "Test Class"
- [ ] Click on class card navigates to classroom

**Verify backend logs:**
```
INFO: ✓ Student Test Student joined class TEST101
```

---

### Test 5: Face Detection (Student)

1. In student classroom view
2. Click **Video Camera** button (bottom controls)
3. Browser prompts for camera permission
4. Click "Allow"

**Expected:**
- [ ] Webcam feed appears in center (mirrored)
- [ ] Video button turns green
- [ ] Green badge appears: "Attendance Active"
- [ ] Your face is visible in feed

**Verify browser console (F12):**
- [ ] No errors
- [ ] Every 3 seconds, should see: `POST http://localhost:8000/attendance/frame`
- [ ] Status: 200 OK

**Verify backend logs:**
```
INFO: ✓ Attendance started for student Test Student in class TEST101
INFO: Face detected: True
INFO: Looking at screen: True
INFO: Engagement updated: 100.0%
```

---

### Test 6: Real-Time Updates (Teacher)

1. Switch to teacher window
2. Look at **Engagement Panel** (left sidebar)

**Expected:**
- [ ] Student "Test Student" appears in list
- [ ] Engagement bar shows percentage (0-100%)
- [ ] Green dot if face is detected
- [ ] Percentage updates every ~3 seconds
- [ ] Engagement increases when student looks at camera

**Try these:**
- Student **looks at camera** → Engagement should increase
- Student **looks away** → Engagement should stop increasing
- Student **leaves frame** → Green dot disappears
- Student **returns** → Green dot reappears, engagement resumes

**Verify backend logs:**
```
INFO: WebSocket connected: class TEST101
INFO: Broadcasting engagement update to 1 clients
```

---

### Test 7: Attendance Report

1. In student window, click **"Leave"** button
2. Confirm "Are you sure?"
3. Student returns to dashboard
4. In teacher window, click **"Leave"** button
5. Teacher returns to dashboard

**Expected:**
- [ ] Student successfully leaves
- [ ] Teacher successfully leaves
- [ ] Teacher Dashboard shows **Attendance Table**
- [ ] Table contains row for "Test Student"
- [ ] Shows engagement percentage (e.g., 85%)
- [ ] Shows status: "Present" (if ≥75%) or "Absent" (if <75%)

**Verify backend logs:**
```
INFO: ✓ Attendance ended for Test Student
INFO: Final engagement: 85.0% (Status: present)
```

**Verify MongoDB:**
```bash
db.attendance.find()
```
Should see attendance record with:
- `student_name: "Test Student"`
- `class_id: "TEST101"`
- `engagement_percentage: 85.0`
- `status: "present"`
- Array of `frames` with detection results

---

## 🔍 Debug Mode

### Enable Verbose Logging

#### Backend
In `main.py`, change:
```python
logging.basicConfig(level=logging.DEBUG)  # Change from INFO to DEBUG
```

#### Frontend
In browser console (F12), enable verbose logs:
```javascript
localStorage.setItem('debug', 'true')
```

### Check Network Traffic

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Perform actions (login, join class, enable camera)
4. Check requests:
   - `POST /auth/login` → Should return token
   - `POST /class/TEST101/join` → Should return success
   - `POST /attendance/start` → Should return attendance_id
   - `POST /attendance/frame` → Should return 200 OK every 3 seconds
   - `WS /attendance/ws/TEST101` → Should show "101 Switching Protocols"

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Import could not be resolved"
**Cause:** Virtual environment not activated in VS Code  
**Solution:**
1. Press `Ctrl+Shift+P`
2. Type "Python: Select Interpreter"
3. Choose `./backend/venv/Scripts/python.exe`

### Issue 2: "Module not found: mediapipe"
**Cause:** Package not installed  
**Solution:**
```bash
cd backend
venv\Scripts\activate
pip install mediapipe==0.10.9
```

### Issue 3: "Cannot connect to MongoDB"
**Cause:** MongoDB not running  
**Solution:**
```bash
# Windows
net start MongoDB

# Or use MongoDB Compass to start
```

### Issue 4: "Webcam not working"
**Cause:** Permission denied or camera in use  
**Solution:**
- Check browser permissions: chrome://settings/content/camera
- Close other apps using camera (Zoom, Teams)
- Try different browser (Chrome/Edge recommended)

### Issue 5: "Face not detected"
**Cause:** Poor lighting or wrong angle  
**Solution:**
- Improve lighting on your face
- Sit 50-100cm from camera
- Look directly at camera
- Check backend logs for detection details

### Issue 6: "WebSocket connection failed"
**Cause:** Backend not running or CORS issue  
**Solution:**
- Verify backend is running on port 8000
- Check CORS in `main.py`:
  ```python
  allow_origins=["http://localhost:5173"]
  ```

### Issue 7: "Token expired"
**Cause:** JWT token older than 30 days  
**Solution:**
- Logout and login again
- Token automatically refreshes

### Issue 8: "Port already in use"
**Cause:** Another process using port 8000 or 5173  
**Solution:**
```bash
# Windows - Find and kill process
netstat -ano | findstr :8000
taskkill /PID <process_id> /F
```

---

## ✅ Final Verification Checklist

### Backend
- [ ] Virtual environment activated
- [ ] All dependencies installed (`pip list` shows all packages)
- [ ] `.env` file configured
- [ ] MongoDB running and connected
- [ ] Server starts without errors on port 8000
- [ ] API docs accessible at http://localhost:8000/docs
- [ ] Root endpoint returns JSON response

### Frontend
- [ ] Dependencies installed (node_modules/ exists)
- [ ] Dev server starts without errors on port 5173
- [ ] Login page loads correctly
- [ ] UI elements render (buttons, forms, gradients)
- [ ] Browser console shows no errors

### Integration
- [ ] Can register as teacher
- [ ] Can register as student
- [ ] Can login with registered credentials
- [ ] Teacher can create classroom
- [ ] Student can join classroom by Class ID
- [ ] Teacher can start class session
- [ ] Student can join classroom session
- [ ] Student camera turns on successfully
- [ ] Webcam feed displays correctly
- [ ] Frames submitted every 3 seconds (check Network tab)
- [ ] Backend processes frames (check backend logs)
- [ ] Teacher sees student in engagement panel
- [ ] Engagement percentage updates in real-time
- [ ] WebSocket connection stable
- [ ] Leave classroom ends attendance
- [ ] Attendance report shows correct data

### Face Detection
- [ ] Face detected when looking at camera
- [ ] Green indicator shows when detected
- [ ] Engagement increases when looking
- [ ] Engagement stops when looking away
- [ ] Detection resumes when returning to camera
- [ ] Backend logs show detection details
- [ ] Engagement percentage accurate

### Database
- [ ] MongoDB connected
- [ ] Users collection populated
- [ ] Classes collection populated
- [ ] Attendance collection populated
- [ ] All data persists after restart

---

## 🎯 Performance Benchmarks

### Expected Performance
- **Backend startup**: < 3 seconds
- **Frontend build**: < 1 minute
- **Login response**: < 500ms
- **Class creation**: < 1 second
- **Face detection**: < 100ms per frame
- **WebSocket latency**: < 50ms
- **Frame submission**: < 200ms

### Resource Usage
- **Backend RAM**: ~200-400 MB
- **Frontend RAM**: ~100-200 MB
- **MongoDB RAM**: ~100-300 MB
- **CPU**: < 10% idle, < 50% during face detection

---

## 📊 Success Criteria

**System is ready when:**

✅ **All backend endpoints return 200 OK**  
✅ **Frontend loads without console errors**  
✅ **Can complete full teacher workflow**  
✅ **Can complete full student workflow**  
✅ **Face detection works accurately**  
✅ **Real-time updates function properly**  
✅ **Attendance reports show correct data**  
✅ **MongoDB stores all data persistently**  

---

## 🚀 Ready to Launch!

If all checkboxes are marked ✅, your Virtual Classroom System is **fully operational**.

### Quick Start Commands

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Browser:**
```
http://localhost:5173
```

---

## 📞 Need Help?

If issues persist after following this guide:

1. **Check logs**: Backend console and browser console (F12)
2. **Review documentation**: 
   - `README.md` - Main documentation
   - `QUICKSTART.md` - Quick setup
   - `INTEGRATION_SUMMARY.md` - Integration details
   - `backend/README.md` - Backend specifics
3. **Verify prerequisites**: Python version, Node version, MongoDB status
4. **Test individually**: Backend first, then frontend, then integration
5. **Check MongoDB**: Ensure data is being stored correctly

---

## 🎓 Happy Teaching!

Your AI-powered Virtual Classroom System is ready to revolutionize online education! 🚀📚✨

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
