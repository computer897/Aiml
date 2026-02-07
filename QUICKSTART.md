# Quick Start Guide - Virtual Classroom System

## Prerequisites
- **Python 3.8+** installed
- **Node.js 16+** and npm installed
- **MongoDB** running locally (or MongoDB Atlas connection string)
- **Modern browser** (Chrome/Edge recommended for webcam support)

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Clone/Navigate to Project
```bash
cd "d:\Gilbert\NEW PROJECT\AlML"
```

### Step 2: Setup Backend
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo MONGO_URL=mongodb://localhost:27017 > .env
echo DATABASE_NAME=virtual_classroom >> .env
echo SECRET_KEY=your-super-secret-key-change-this-in-production >> .env
echo ALGORITHM=HS256 >> .env
echo ACCESS_TOKEN_EXPIRE_MINUTES=43200 >> .env

# Start backend server
python main.py
```

Backend will start at: **http://localhost:8000**
API docs at: **http://localhost:8000/docs**

### Step 3: Setup Frontend (New Terminal)
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will start at: **http://localhost:5173**

---

## 🧪 Test the System

### 1. Register Teacher Account
- Open browser: `http://localhost:5173`
- Click "Sign Up"
- Fill details:
  - Name: `Dr. Sarah Johnson`
  - Email: `teacher@test.com`
  - Password: `password123`
  - Role: **Teacher**
- Click "Sign Up"

### 2. Create Classroom
- You'll be redirected to Teacher Dashboard
- Click **"Create Classroom"**
- Fill in:
  - Class ID: `MATH101` (unique identifier)
  - Title: `Advanced Mathematics`
  - Description: `Introduction to Calculus and Integration`
  - Schedule Time: Select any future date/time
  - Duration: `60` minutes
- Click **"Create Classroom"**

### 3. Start Class Session
- Click **"Start Class"** button
- You'll enter the virtual classroom
- Teacher view shows engagement panel (initially empty)

### 4. Register Student Account (New Incognito Window)
- Open **new incognito window**: `http://localhost:5173`
- Click "Sign Up"
- Fill details:
  - Name: `John Doe`
  - Email: `student@test.com`
  - Password: `password123`
  - Role: **Student**
- Click "Sign Up"

### 5. Join Class as Student
- You'll be redirected to Student Dashboard
- In "Join Classroom by ID" section, enter: `MATH101`
- Click **"Join"**
- Class will appear in "Your Enrolled Classes"
- Click on the class card
- You'll enter the virtual classroom

### 6. Test Face Detection 📸
- In student classroom, click the **Video Camera** button (bottom controls)
- **Allow camera access** when prompted
- You should see:
  - Your webcam feed (mirrored)
  - Green badge: "Attendance Active"
  - Your face being captured every 3 seconds

### 7. Monitor Engagement (Teacher Window)
- Switch to teacher window
- Look at **Engagement Panel** (left sidebar)
- You should see:
  - Student name: "John Doe"
  - Real-time engagement percentage (0-100%)
  - Green dot if face is detected
  - Status updates as student looks at/away from camera

### 8. Leave and Check Attendance
- Student: Click **"Leave"** button
- Teacher: Go back to **Teacher Dashboard**
- Check **Attendance Table**:
  - Shows "John Doe"
  - Engagement percentage
  - Status: **Present** (if ≥75%) or **Absent** (if <75%)

---

## 🎯 Key Features to Test

### Face Detection
- ✅ **Looking at screen**: Face centered, looking at camera → Engagement increases
- ✅ **Looking away**: Turn head away → Engagement stops increasing
- ✅ **Leave frame**: Move out of camera view → No face detected
- ✅ **Return**: Come back → Face detection resumes

### Real-time Updates
- ✅ Teacher sees updates **instantly** (WebSocket)
- ✅ Engagement bar updates every 3 seconds
- ✅ Multiple students can join simultaneously

### Attendance Calculation
```
Engagement % = (Time with face detected / Total time in class) × 100

Example:
- Joined at: 2:00 PM
- Left at: 2:10 PM (10 minutes = 600 seconds)
- Face detected for: 8 minutes (480 seconds)
- Engagement: (480/600) × 100 = 80%
- Status: Present ✓ (≥75%)
```

---

## 🔍 Verify Backend is Working

### Check API Endpoints
Open browser: `http://localhost:8000/docs`

You should see **Swagger UI** with endpoints:
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/classes/create`
- POST `/api/classes/join`
- POST `/api/attendance/start`
- POST `/api/attendance/submit-frame`
- GET `/api/attendance/report/{class_id}`
- WS `/api/ws/{class_id}`

### Test with cURL
```bash
# Register user
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@test.com\",\"password\":\"pass123\",\"name\":\"Test User\",\"role\":\"student\"}"

# Login
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"test@test.com\",\"password\":\"pass123\"}"
```

---

## 📁 Project Structure

```
AlML/
├── backend/
│   ├── main.py                 # FastAPI entry point
│   ├── requirements.txt        # Python dependencies
│   ├── .env                    # Environment variables
│   ├── app/
│   │   ├── config.py           # Settings
│   │   ├── database.py         # MongoDB connection
│   │   ├── models.py           # Data models
│   │   ├── auth.py             # JWT authentication
│   │   ├── face_detection.py  # MediaPipe face detection
│   │   ├── attendance.py       # Attendance tracking
│   │   ├── websocket.py        # WebSocket manager
│   │   └── routes/
│   │       ├── auth_routes.py
│   │       ├── class_routes.py
│   │       └── attendance_routes.py
│   └── uploads/                # Uploaded images (created automatically)
│
├── frontend/
│   ├── package.json            # Node dependencies
│   ├── vite.config.js          # Vite configuration
│   ├── index.html              # Entry HTML
│   ├── src/
│   │   ├── main.jsx            # React entry
│   │   ├── App.jsx             # Main app component
│   │   ├── services/
│   │   │   └── api.js          # API service layer (NEW)
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Login page
│   │   │   ├── SignUp.jsx      # Registration
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── TeacherDashboard.jsx
│   │   │   └── Classroom.jsx   # Virtual classroom with webcam
│   │   ├── components/
│   │   │   ├── AttendanceTable.jsx
│   │   │   ├── ChatPanel.jsx
│   │   │   ├── EngagementList.jsx
│   │   │   └── ...
│   │   └── data/
│   │       └── mockData.js     # Mock data (still used for chat/doubts)
│   └── ...
│
└── FRONTEND_INTEGRATION_COMPLETE.md  # Detailed documentation
```

---

## 🛠️ Troubleshooting

### Backend won't start
```bash
# Check Python version (must be 3.8+)
python --version

# Check MongoDB connection
# If using local MongoDB, ensure it's running
# If using MongoDB Atlas, verify MONGO_URL in .env

# Check port 8000 is not in use
netstat -ano | findstr :8000
```

### Frontend won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version (must be 16+)
node --version

# Check port 5173 is not in use
netstat -ano | findstr :5173
```

### Webcam not working
- **Chrome/Edge**: Go to `chrome://settings/content/camera` and allow access
- **Firefox**: Click lock icon in address bar → Permissions → Camera → Allow
- **Check**: Is camera being used by another app? Close Zoom/Teams/Skype
- **Test**: Visit `https://webcamtests.com/` to verify camera works

### Face detection not accurate
- **Lighting**: Ensure good lighting on your face
- **Distance**: Sit 50-100cm from camera
- **Angle**: Look directly at camera (not from side)
- **Backend logs**: Check console for detection details
  ```
  Face detected: True
  Looking at screen: True
  Engagement updated: 75.5%
  ```

### MongoDB connection failed
```bash
# Option 1: Install MongoDB locally
# Download from: https://www.mongodb.com/try/download/community
# Start service: net start MongoDB

# Option 2: Use MongoDB Atlas (Cloud)
# 1. Create free cluster at https://www.mongodb.com/cloud/atlas
# 2. Get connection string
# 3. Update MONGO_URL in backend/.env
#    Example: mongodb+srv://user:pass@cluster.mongodb.net/
```

### WebSocket connection failed
- Check backend is running on port 8000
- Verify CORS settings in `backend/main.py`:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["http://localhost:5173"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```

---

## 📊 Expected Behavior

### During Class
1. **Student joins** → Attendance starts automatically
2. **Camera on** → Frames submitted every 3 seconds
3. **Teacher sees** → Real-time engagement updates (WebSocket)
4. **Engagement increases** → When face is detected and looking at screen
5. **Engagement pauses** → When looking away or face not detected
6. **Student leaves** → Attendance ends, final engagement calculated

### Engagement Thresholds
- **90-100%**: Excellent (looking at screen almost entire time)
- **75-89%**: Good (present, mostly engaged)
- **50-74%**: Moderate (present but distracted)
- **25-49%**: Low (barely engaged)
- **0-24%**: Very low (not looking at screen)

### Attendance Status
- **Present**: Engagement ≥ 75%
- **Absent**: Engagement < 75%

---

## 🎓 Usage Tips

### For Teachers
1. **Create class ahead of time** (schedule for later)
2. **Start class** when ready to teach
3. **Monitor engagement** in real-time during lecture
4. **View reports** after class ends
5. **Export data** (future enhancement)

### For Students
1. **Join class** before it starts
2. **Turn on camera** immediately (to mark attendance)
3. **Keep camera on** throughout session
4. **Look at screen** (not phone or other window)
5. **Don't leave** early (affects engagement %)

### Best Practices
- ✅ Good lighting (face clearly visible)
- ✅ Quiet environment (minimal distractions)
- ✅ Stable internet connection
- ✅ Fully charged device (long sessions)
- ✅ Close unnecessary apps (free up camera)

---

## 📈 What's Next?

### Completed ✅
- Full backend with face detection
- Frontend integration with real APIs
- Webcam capture and frame submission
- Real-time engagement tracking
- Attendance reports
- Authentication and authorization

### Future Enhancements 🚀
- [ ] Real-time chat (currently mock data)
- [ ] Doubts system backend
- [ ] Teacher notes backend
- [ ] Video recording
- [ ] Screen sharing
- [ ] Breakout rooms
- [ ] Quizzes and polls
- [ ] Attendance export (CSV/PDF)
- [ ] Analytics dashboard
- [ ] Mobile app (React Native)

---

## 🆘 Need Help?

### Resources
- **Backend API Docs**: `http://localhost:8000/docs`
- **Detailed Guide**: `FRONTEND_INTEGRATION_COMPLETE.md`
- **Backend Readme**: `backend/README.md`
- **API Testing Guide**: `backend/API_TESTING.md`

### Common Issues
1. **Port already in use**: Change port in `main.py` (backend) or `vite.config.js` (frontend)
2. **Database errors**: Verify MongoDB is running and connection string is correct
3. **CORS errors**: Check `allow_origins` includes frontend URL
4. **Token expired**: Login again (tokens last 30 days)

### Debugging
```bash
# Backend logs
cd backend
python main.py  # Watch console output

# Frontend logs
# Open browser console (F12)
# Check Network tab for API calls
# Check Console tab for errors
```

---

## ✅ Success!

If you can:
1. ✅ Register and login as teacher and student
2. ✅ Create a classroom
3. ✅ Join classroom as student
4. ✅ Turn on camera and see webcam feed
5. ✅ See real-time engagement updates (teacher)
6. ✅ View attendance report with engagement %

**Then your Virtual Classroom system is working perfectly! 🎉**

---

## 🚀 Ready to Start

Run these two commands in separate terminals:

**Terminal 1 (Backend):**
```bash
cd backend
venv\Scripts\activate
python main.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Then open browser: **http://localhost:5173**

**Happy Teaching! 📚**
