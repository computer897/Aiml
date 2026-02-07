# MongoDB Setup Guide for Virtual Classroom

## 📥 Download MongoDB

### Windows Installation

1. **Download MongoDB Community Server**
   - Visit: https://www.mongodb.com/try/download/community
   - Select: **Windows x64**
   - Version: **7.0 or later** (recommended)
   - Package: **MSI**
   - Click **Download**

## 🔧 Installation Steps

### Option 1: Complete Installation (Recommended)

1. **Run the MSI installer**
   - Double-click the downloaded `.msi` file
   - Click "Next" on the welcome screen

2. **Accept License Agreement**
   - Check "I accept the terms in the License Agreement"
   - Click "Next"

3. **Choose Setup Type**
   - Select **Complete** installation
   - Click "Next"

4. **Service Configuration**
   - ✅ Keep "Install MongoDB as a Service" **checked**
   - Service Name: `MongoDB`
   - Data Directory: `C:\Program Files\MongoDB\Server\7.0\data\`
   - Log Directory: `C:\Program Files\MongoDB\Server\7.0\log\`
   - Click "Next"

5. **Install MongoDB Compass** (Optional)
   - MongoDB Compass is a GUI tool for MongoDB
   - You can uncheck this if you prefer command-line only
   - Click "Next"

6. **Install**
   - Click "Install" and wait for completion
   - Click "Finish"

### Option 2: Custom Data Directory

If you want to use a custom location for database files:

```powershell
# Create data directory
New-Item -ItemType Directory -Path "D:\mongodb\data" -Force
New-Item -ItemType Directory -Path "D:\mongodb\log" -Force

# Create config file
@"
systemLog:
  destination: file
  path: D:\mongodb\log\mongod.log
storage:
  dbPath: D:\mongodb\data
net:
  port: 27017
  bindIp: 127.0.0.1
"@ | Out-File -FilePath "D:\mongodb\mongod.cfg" -Encoding UTF8
```

## 🚀 Starting MongoDB

### If Installed as Service (Recommended)

MongoDB should start automatically. To verify:

```powershell
# Check if service is running
Get-Service MongoDB

# Start service if stopped
Start-Service MongoDB

# Stop service (when needed)
Stop-Service MongoDB
```

### Manual Start (If not installed as service)

```powershell
# Navigate to MongoDB bin directory
cd "C:\Program Files\MongoDB\Server\7.0\bin"

# Start MongoDB with default settings
.\mongod.exe --dbpath "C:\Program Files\MongoDB\Server\7.0\data"

# OR with custom config
.\mongod.exe --config "D:\mongodb\mongod.cfg"
```

## ✅ Verify Installation

### Method 1: PowerShell Connection Test

```powershell
# Test if MongoDB is listening on port 27017
Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet
# Should return: True
```

### Method 2: MongoDB Shell

```powershell
# Open MongoDB shell
cd "C:\Program Files\MongoDB\Server\7.0\bin"
.\mongosh.exe

# In the MongoDB shell, run:
show dbs
db.version()
exit
```

### Method 3: Python Test

```powershell
# From your project backend directory
cd "d:\Gilbert\NEW PROJECT\AlML\backend"
& "D:/Gilbert/NEW PROJECT/AlML/.venv/Scripts/python.exe" -c "from pymongo import MongoClient; client = MongoClient('mongodb://localhost:27017'); print('✅ MongoDB Connected!'); print('Databases:', client.list_database_names())"
```

## 🔐 Initial Database Setup (Optional)

Create the database and initial collections:

```powershell
cd "C:\Program Files\MongoDB\Server\7.0\bin"
.\mongosh.exe
```

Then in MongoDB shell:

```javascript
// Switch to virtual_classroom database
use virtual_classroom

// Create collections
db.createCollection("users")
db.createCollection("classes")
db.createCollection("attendance")

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true })
db.classes.createIndex({ "teacher_id": 1 })
db.classes.createIndex({ "code": 1 }, { unique: true })
db.attendance.createIndex({ "class_id": 1, "student_id": 1 })

// Verify collections
show collections

// Exit
exit
```

## 🎯 Configure Your Application

Your application is already configured to connect to MongoDB. The configuration is in:

**File**: `backend/app/config.py`

```python
mongodb_url: str = "mongodb://localhost:27017"
database_name: str = "virtual_classroom"
```

## 🔄 Restart Backend After MongoDB Setup

Once MongoDB is installed and running:

```powershell
# Kill existing backend process
Get-Process python | Where-Object {$_.Path -like "*AlML*"} | Stop-Process -Force

# Start backend again
cd "d:\Gilbert\NEW PROJECT\AlML\backend"
& "D:/Gilbert/NEW PROJECT/AlML/.venv/Scripts/python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Or simply restart the backend terminal.

## 🛠️ Troubleshooting

### MongoDB Service Won't Start

```powershell
# Check Windows Event Viewer for errors
eventvwr.msc
# Navigate to: Windows Logs > Application

# Common fix: Remove lock file
Remove-Item "C:\Program Files\MongoDB\Server\7.0\data\mongod.lock" -Force
Start-Service MongoDB
```

### Port 27017 Already in Use

```powershell
# Find process using port 27017
Get-NetTCPConnection -LocalPort 27017 | Select-Object OwningProcess
Get-Process -Id <ProcessId>

# Kill the process
Stop-Process -Id <ProcessId> -Force
```

### Connection Refused Error

1. Verify MongoDB service is running: `Get-Service MongoDB`
2. Check firewall isn't blocking port 27017
3. Ensure `bindIp` is set to `127.0.0.1` or `0.0.0.0` in config

## 📊 MongoDB Compass (GUI Tool)

If you installed MongoDB Compass:

1. Open **MongoDB Compass**
2. Connection String: `mongodb://localhost:27017`
3. Click **Connect**
4. Explore your `virtual_classroom` database visually

## 🌐 Alternative: MongoDB Atlas (Cloud Solution)

If you prefer a cloud database:

1. Visit: https://www.mongodb.com/cloud/atlas/register
2. Create free account (512MB free tier)
3. Create a cluster
4. Get connection string (replace username/password)
5. Update `backend/.env` file:

```env
MONGODB_URL=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/virtual_classroom?retryWrites=true&w=majority
```

## ✨ Quick Start Script

Save this as `start-mongodb.ps1`:

```powershell
# Check if MongoDB service exists
$service = Get-Service MongoDB -ErrorAction SilentlyContinue

if ($service) {
    if ($service.Status -eq "Running") {
        Write-Host "✅ MongoDB is already running" -ForegroundColor Green
    } else {
        Write-Host "🔄 Starting MongoDB service..." -ForegroundColor Yellow
        Start-Service MongoDB
        Start-Sleep -Seconds 2
        Write-Host "✅ MongoDB started successfully" -ForegroundColor Green
    }
} else {
    Write-Host "❌ MongoDB service not found. Please install MongoDB first." -ForegroundColor Red
    Write-Host "Visit: https://www.mongodb.com/try/download/community" -ForegroundColor Cyan
}

# Verify connection
$connected = Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet
if ($connected) {
    Write-Host "✅ MongoDB is accessible on port 27017" -ForegroundColor Green
} else {
    Write-Host "❌ Cannot connect to MongoDB on port 27017" -ForegroundColor Red
}
```

Run with: `.\start-mongodb.ps1`

## 📝 Summary

1. ✅ Download MongoDB Community Server
2. ✅ Install with "Install as Service" option
3. ✅ Verify service is running: `Get-Service MongoDB`
4. ✅ Test connection: `Test-NetConnection localhost -Port 27017`
5. ✅ Restart your backend server
6. ✅ Application should now connect successfully!

---

**Support**: If you encounter issues, check the MongoDB documentation at https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/
