# 🚀 Quick Start Guide

## Prerequisites Check
- [ ] Python 3.8+ installed
- [ ] MongoDB running
- [ ] Virtual environment activated

## Installation (5 minutes)

```bash
# 1. Navigate to backend folder
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Configure environment
# Edit .env file with your settings

# 6. Start server
python run.py
```

## Quick Test

```bash
# Open new terminal and test:
curl http://localhost:8000/health
```

## Access Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## First API Call

```bash
# Register a user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "teacher"
  }'
```

## Run Automated Tests

```bash
# Make sure server is running, then:
python test_api.py
```

## Common Commands

```bash
# Start server
python run.py

# Start with auto-reload
python main.py

# Run tests
python test_api.py

# Install new package
pip install package-name
pip freeze > requirements.txt
```

## File Reference

| File | Purpose |
|------|---------|
| `main.py` | Main application |
| `run.py` | Quick start script |
| `test_api.py` | Test suite |
| `README.md` | Full documentation |
| `API_TESTING.md` | API examples |
| `PROJECT_OVERVIEW.md` | Technical details |

## Important URLs

- API Root: http://localhost:8000
- Health: http://localhost:8000/health
- Docs: http://localhost:8000/docs
- MongoDB: mongodb://localhost:27017

## Need Help?

1. Check logs in terminal
2. Visit /docs for interactive API testing
3. Read README.md for detailed info
4. Check MongoDB connection
5. Verify .env configuration

## Project Status

✅ Authentication (JWT)
✅ User Management
✅ Class Creation
✅ Face Detection (MediaPipe)
✅ Attendance Tracking
✅ Real-time Updates (WebSocket)
✅ Attendance Reports

## Next Steps

1. ✅ Server running
2. ⬜ Test with `test_api.py`
3. ⬜ Register users via /docs
4. ⬜ Create a class
5. ⬜ Test with real webcam frames
6. ⬜ Connect frontend

---

**🎓 Virtual Classroom Backend - Ready to Go!**
