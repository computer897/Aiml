# Authentication Testing Guide

## ✅ Fixed Issues

The following authentication problems have been resolved:

1. **MongoDB ObjectId Conversion**: Fixed user ID conversion from ObjectId to string
2. **Token Generation**: Ensured JWT tokens use string user IDs
3. **User Lookup**: Fixed database queries to properly handle ObjectId
4. **Error Handling**: Added better error messages for database connection issues

## 🔧 Prerequisites

### Option 1: With MongoDB (Full Functionality)
```powershell
# Start MongoDB
.\start-mongodb.ps1

# Or manually
Start-Service MongoDB
```

### Option 2: Without MongoDB (Testing Only)
You'll receive helpful error messages indicating MongoDB is needed.

## 🧪 Testing Authentication

### Method 1: Using the Frontend (Recommended)

1. **Open the Application**
   ```
   http://localhost:5173
   ```

2. **Register a New User**
   - Click "Sign Up"
   - Fill in:
     - Name: Test Student
     - Email: student@test.com
     - Password: test123 (min 6 characters)
     - Role: Student
   - Click "Create Account"

3. **Login**
   - Use the credentials you just created
   - Email: student@test.com
   - Password: test123
   - Click "Sign In"

4. **Success Indicators**
   - You should be redirected to the dashboard
   - Your name should appear in the header
   - No error messages

### Method 2: Using API Directly (Advanced)

#### Test Registration

```powershell
# Register a student
$body = @{
    name = "John Doe"
    email = "john@example.com"
    password = "password123"
    role = "student"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

Write-Output $response
```

Expected Response:
```json
{
    "message": "User registered successfully",
    "user_id": "65abc123def456...",
    "role": "student"
}
```

#### Test Login

```powershell
# Login
$loginBody = @{
    email = "john@example.com"
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://127.0.0.1:8000/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody

Write-Output $loginResponse

# Save token for later use
$token = $loginResponse.access_token
```

Expected Response:
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
        "id": "65abc123def456...",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "student"
    }
}
```

#### Test Protected Route

```powershell
# Use token to access protected route
$headers = @{
    "Authorization" = "Bearer $token"
}

$protectedResponse = Invoke-RestMethod -Uri "http://127.0.0.1:8000/class/student/classes" `
    -Method GET `
    -Headers $headers

Write-Output $protectedResponse
```

### Method 3: Using API Documentation

1. **Open Swagger UI**
   ```
   http://127.0.0.1:8000/docs
   ```

2. **Test Registration**
   - Expand `POST /auth/register`
   - Click "Try it out"
   - Fill in the request body:
     ```json
     {
       "name": "Test User",
       "email": "test@example.com",
       "password": "test123",
       "role": "student"
     }
     ```
   - Click "Execute"
   - Check response (should be 201 Created)

3. **Test Login**
   - Expand `POST /auth/login`
   - Click "Try it out"
   - Fill in credentials:
     ```json
     {
       "email": "test@example.com",
       "password": "test123"
     }
     ```
   - Click "Execute"
   - Copy the `access_token` from response

4. **Authorize**
   - Click the "Authorize" button at top
   - Paste token in format: `Bearer <your_token>`
   - Click "Authorize"
   - Now you can test protected endpoints!

## 🐛 Common Errors & Solutions

### Error: "Database connection error"
**Cause**: MongoDB is not running
**Solution**: 
```powershell
Start-Service MongoDB
# Or install MongoDB using MONGODB_SETUP.md
```

### Error: "Email already registered"
**Cause**: User already exists in database
**Solution**: 
- Use a different email
- Or use existing credentials to login

### Error: "Invalid email or password"
**Cause**: Wrong credentials or user doesn't exist
**Solution**: 
- Check your email and password
- Register first if you haven't already

### Error: "Could not validate credentials"
**Cause**: Invalid or expired JWT token
**Solution**: 
- Login again to get a new token
- Tokens expire after 24 hours by default

## 📊 Verify Backend Status

```powershell
# Check if backend is running
Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -InformationLevel Quiet

# Check backend health
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health"

# View backend logs
# Check the terminal where backend is running
```

## ✨ What's Working Now

✅ User registration with proper ObjectId handling
✅ User login with JWT token generation  
✅ Token validation for protected routes
✅ Proper error messages when MongoDB is not connected
✅ String conversion for all user IDs
✅ Role-based access control (student/teacher)

## 🎯 Next Steps

1. **Install MongoDB** (if not already done)
   - See [MONGODB_SETUP.md](MONGODB_SETUP.md)
   - Run `.\start-mongodb.ps1`

2. **Test Complete Flow**
   - Register → Login → Access Dashboard

3. **Create Both User Types**
   - Register a Student account
   - Register a Teacher account
   - Test both dashboards

## 🚀 Production Considerations

For production deployment:

1. **Change Secret Key**: Update `SECRET_KEY` in `.env`
2. **Use HTTPS**: Enable SSL/TLS
3. **MongoDB Auth**: Enable authentication on MongoDB
4. **Password Policy**: Increase minimum password length
5. **Rate Limiting**: Add rate limiting to prevent brute force
6. **Token Expiry**: Adjust token expiration based on security needs

---

**Last Updated**: February 7, 2026  
**Status**: ✅ All authentication issues fixed
