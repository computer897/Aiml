# Render Deployment Guide - Backend

Deploy the Virtual Classroom FastAPI backend to Render.

---

## Quick Start

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service**
2. Connect GitHub and select your repository
3. Configure:

   | Setting | Value |
   |---------|-------|
   | **Name** | `virtual-classroom-api` |
   | **Root Directory** | `backend` |
   | **Runtime** | `Python 3` |
   | **Build Command** | `pip install --upgrade pip && pip install -r requirements.txt` |
   | **Start Command** | `gunicorn main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120` |

4. Add environment variables (see below)
5. Click **Create Web Service**

---

## Environment Variables

Required variables to set in Render dashboard:

| Variable | Example | Description |
|----------|---------|-------------|
| `MONGODB_URL` | `mongodb+srv://user:pass@cluster.mongodb.net/` | MongoDB Atlas connection string |
| `DATABASE_NAME` | `virtual_classroom` | Database name |
| `SECRET_KEY` | `your-32-char-secret-key` | JWT signing secret |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token expiration (24 hours) |
| `ENVIRONMENT` | `production` | Environment mode |
| `FRONTEND_URL` | `https://your-app.netlify.app` | Frontend URL for CORS |
| `PYTHON_VERSION` | `3.11.7` | Python version |

### Generate SECRET_KEY

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## MongoDB Atlas Setup

1. **Create Cluster**: [mongodb.com/atlas](https://www.mongodb.com/atlas) → Create free cluster

2. **Create User**: Database Access → Add Database User
   - Set username/password
   - Grant "Read and Write" permission

3. **Allow Network**: Network Access → Add IP Address
   - Click "Allow Access from Anywhere" (0.0.0.0/0)

4. **Get Connection String**: Clusters → Connect → Connect your application
   ```
   mongodb+srv://<username>:<password>@cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

---

## Blueprint Deploy (render.yaml)

The repository includes `render.yaml` for automated deployment:

```yaml
services:
  - type: web
    name: virtual-classroom-api
    runtime: python
    region: oregon
    rootDir: backend
    buildCommand: pip install --upgrade pip && pip install -r requirements.txt
    startCommand: gunicorn main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120
    envVars:
      - key: ENVIRONMENT
        value: production
      - key: MONGODB_URL
        sync: false
      - key: DATABASE_NAME
        value: virtual_classroom
      - key: SECRET_KEY
        generateValue: true
      - key: ALGORITHM
        value: HS256
      - key: ACCESS_TOKEN_EXPIRE_MINUTES
        value: 1440
      - key: FRONTEND_URL
        sync: false
```

To use: **New +** → **Blueprint** → Connect repository

---

## Verify Deployment

### Health Check
```
GET https://your-api.onrender.com/
```

Expected response:
```json
{
  "message": "Welcome to Virtual Classroom API",
  "status": "running",
  "database": "connected"
}
```

### API Documentation
```
https://your-api.onrender.com/docs
```

### Test Authentication
```bash
# Create user
curl -X POST https://your-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST https://your-api.onrender.com/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"
```

---

## Troubleshooting

### Build Fails

**Check logs**: Dashboard → Service → Logs

Common fixes:
- Verify all imports exist in `requirements.txt`
- Test locally: `pip install -r requirements.txt`

### Health Check Failed

Application must:
- Bind to `0.0.0.0:$PORT`
- Respond within 30 seconds

Check start command uses `--bind 0.0.0.0:$PORT`

### Database Connection Error

1. Verify `MONGODB_URL` format
2. Check MongoDB Atlas Network Access allows `0.0.0.0/0`
3. Confirm username/password are correct

### CORS Errors

Update `FRONTEND_URL` environment variable to match your Netlify URL exactly:
- ✅ `https://your-app.netlify.app`
- ❌ `https://your-app.netlify.app/` (no trailing slash)

### Cold Starts (Free Tier)

Free tier instances spin down after 15 minutes of inactivity.

Solutions:
- Use external cron to ping health endpoint every 14 minutes
- Upgrade to paid tier ($7/month) for always-on

---

## Runtime Configuration

### runtime.txt
```
python-3.11.7
```

### Gunicorn Settings

| Flag | Purpose |
|------|---------|
| `--workers 2` | Number of worker processes |
| `--worker-class uvicorn.workers.UvicornWorker` | Async worker for FastAPI |
| `--bind 0.0.0.0:$PORT` | Listen on Render's assigned port |
| `--timeout 120` | Request timeout in seconds |

---

## Scaling (Paid Plans)

| Plan | Workers | Memory | Use Case |
|------|---------|--------|----------|
| Free | 1 | 512MB | Development |
| Starter | 2 | 512MB | Small production |
| Standard | 4+ | 2GB+ | Larger production |

Scale in Dashboard → Service → Settings → Instance Type

---

## Logs & Monitoring

### View Logs
Dashboard → Service → Logs

### Log Levels
Backend uses Python logging:
- `INFO`: General operations
- `WARNING`: Database connection issues
- `ERROR`: Request failures

### Metrics (Paid)
Dashboard → Service → Metrics
- CPU usage
- Memory usage
- Response times

---

## Environment Variable Reference

```env
# Database
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/
DATABASE_NAME=virtual_classroom

# Authentication
SECRET_KEY=your-secret-key-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Server
ENVIRONMENT=production
FRONTEND_URL=https://your-app.netlify.app

# Optional
PYTHON_VERSION=3.11.7
ATTENDANCE_THRESHOLD=75.0
FRAME_INTERVAL_SECONDS=3
```

---

## Links

- [Render Python Docs](https://render.com/docs/python)
- [Render Environment Variables](https://render.com/docs/environment-variables)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [Gunicorn Settings](https://docs.gunicorn.org/en/stable/settings.html)
