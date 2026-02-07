# MongoDB Startup Script for Virtual Classroom
# This script checks if MongoDB is running and starts it if needed

Write-Host "`n=== MongoDB Startup Check ===" -ForegroundColor Cyan

# Check if MongoDB service exists
$service = Get-Service MongoDB -ErrorAction SilentlyContinue

if ($service) {
    Write-Host "`n[1/3] Checking MongoDB service..." -ForegroundColor Yellow
    
    if ($service.Status -eq "Running") {
        Write-Host "✅ MongoDB service is already running" -ForegroundColor Green
    } else {
        Write-Host "🔄 MongoDB service is stopped. Starting..." -ForegroundColor Yellow
        try {
            Start-Service MongoDB
            Start-Sleep -Seconds 3
            $service = Get-Service MongoDB
            if ($service.Status -eq "Running") {
                Write-Host "✅ MongoDB service started successfully" -ForegroundColor Green
            } else {
                Write-Host "❌ Failed to start MongoDB service" -ForegroundColor Red
                exit 1
            }
        } catch {
            Write-Host "❌ Error starting MongoDB: $_" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "`n❌ MongoDB service not found" -ForegroundColor Red
    Write-Host "📥 Please install MongoDB first using one of these methods:`n" -ForegroundColor Yellow
    Write-Host "   1. Download from: https://www.mongodb.com/try/download/community" -ForegroundColor Cyan
    Write-Host "   2. Or install via Chocolatey: choco install mongodb" -ForegroundColor Cyan
    Write-Host "   3. Or install via winget: winget install MongoDB.Server" -ForegroundColor Cyan
    Write-Host "`n📖 See MONGODB_SETUP.md for detailed instructions`n" -ForegroundColor Yellow
    exit 1
}

# Verify MongoDB is accessible on port 27017
Write-Host "`n[2/3] Testing MongoDB connection..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

$connected = Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue

if ($connected) {
    Write-Host "✅ MongoDB is accessible on port 27017" -ForegroundColor Green
} else {
    Write-Host "❌ Cannot connect to MongoDB on port 27017" -ForegroundColor Red
    Write-Host "⚠️  Try: Stop-Service MongoDB; Start-Service MongoDB" -ForegroundColor Yellow
    exit 1
}

# Test Python connection to MongoDB
Write-Host "`n[3/3] Testing database connection from Python..." -ForegroundColor Yellow

$pythonPath = "D:/Gilbert/NEW PROJECT/AlML/.venv/Scripts/python.exe"
$backendPath = "d:\Gilbert\NEW PROJECT\AlML\backend"

if (Test-Path $pythonPath) {
    try {
        Push-Location $backendPath
        $result = & $pythonPath -c "from pymongo import MongoClient; client = MongoClient('mongodb://localhost:27017', serverSelectionTimeoutMS=5000); client.admin.command('ping'); print('SUCCESS')" 2>&1
        Pop-Location
        
        if ($result -like "*SUCCESS*") {
            Write-Host "✅ Python can connect to MongoDB successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Python connection test inconclusive" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Could not test Python connection" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Python virtual environment not found, skipping Python test" -ForegroundColor Yellow
}

Write-Host "`n" + ("=" * 50) -ForegroundColor Cyan
Write-Host "✅ MongoDB is ready!" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Cyan

Write-Host "`n🚀 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Restart your backend server" -ForegroundColor White
Write-Host "   2. The application should now connect to MongoDB" -ForegroundColor White
Write-Host "   3. Check backend logs for 'Database connected successfully'`n" -ForegroundColor White
