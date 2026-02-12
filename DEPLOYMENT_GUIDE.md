# Virtual Classroom - Complete Deployment Guide

This guide covers deploying the **Virtual Classroom** application with:
- **Frontend** → [Netlify](https://netlify.com) (React/Vite Static Site)
- **Backend** → [Render](https://render.com) (FastAPI Python API)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Backend Deployment (Render)](#backend-deployment-render)
4. [Frontend Deployment (Netlify)](#frontend-deployment-netlify)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ A [GitHub](https://github.com) account with your code repository
- ✅ A [MongoDB Atlas](https://www.mongodb.com/atlas) free cluster (or existing MongoDB instance)
- ✅ A [Render](https://render.com) account (free tier available)
- ✅ A [Netlify](https://netlify.com) account (free tier available)
- ✅ Local build verification completed:
  ```bash
  # Frontend
  cd frontend && npm install && npm run build
  
  # Backend
  cd backend && pip install -r requirements.txt
  ```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        PRODUCTION ARCHITECTURE                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐        ┌─────────────────┐                  │
│  │   NETLIFY       │        │   RENDER        │                  │
│  │   (Frontend)    │◄──────►│   (Backend)     │                  │
│  │                 │  API   │                 │                  │
│  │  React/Vite     │ Calls  │  FastAPI        │                  │
│  │  Static Site    │        │  Python API     │                  │
│  └─────────────────┘        └────────┬────────┘                  │
│                                      │                            │
│                                      ▼                            │
│                             ┌─────────────────┐                  │
│                             │ MONGODB ATLAS   │                  │
│                             │ (Database)      │                  │
│                             └─────────────────┘                  │
└──────────────────────────────────────────────────────────────────┘
```

| Component | Platform | URL Pattern |
|-----------|----------|-------------|
| Frontend | Netlify | `https://your-app.netlify.app` |
| Backend API | Render | `https://your-api.onrender.com` |
| Database | MongoDB Atlas | `mongodb+srv://...` |

---

## Backend Deployment (Render)

### Step 1: Set Up MongoDB Atlas

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up or log in

2. **Create a Free Cluster**
   - Click **Build a Cluster** → Select **FREE** tier
   - Choose a cloud provider and region (closest to your users)
   - Click **Create Cluster**

3. **Create Database User**
   - Go to **Database Access** → **Add New Database User**
   - Create a username and password (save these!)
   - Grant **Read and Write** access

4. **Allow Network Access**
   - Go to **Network Access** → **Add IP Address**
   - Click **Allow Access from Anywhere** (0.0.0.0/0) for production
   - Or add Render's IPs for enhanced security

5. **Get Connection String**
   - Go to **Clusters** → Click **Connect** → **Connect your application**
   - Copy the connection string (looks like):
     ```
     mongodb+srv://username:password@cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```

---

### Step 2: Deploy Backend to Render

#### Method A: Manual Deployment (Recommended for First Deploy)

1. **Log in to Render**
   - Go to [dashboard.render.com](https://dashboard.render.com)

2. **Create New Web Service**
   - Click **New +** → **Web Service**

3. **Connect Repository**
   - Connect your GitHub account
   - Select your repository

4. **Configure Build Settings**

   | Setting | Value |
   |---------|-------|
   | **Name** | `virtual-classroom-api` |
   | **Region** | Oregon (or closest to users) |
   | **Branch** | `main` |
   | **Root Directory** | `backend` |
   | **Runtime** | `Python 3` |
   | **Build Command** | `pip install --upgrade pip && pip install -r requirements.txt` |
   | **Start Command** | `gunicorn main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120` |

5. **Set Environment Variables**
   
   Click **Advanced** → **Add Environment Variable**:

   | Key | Value | Description |
   |-----|-------|-------------|
   | `MONGODB_URL` | `mongodb+srv://user:pass@cluster.mongodb.net/` | Your Atlas connection string |
   | `DATABASE_NAME` | `virtual_classroom` | Database name |
   | `SECRET_KEY` | *(generate a random 32+ char string)* | JWT signing key |
   | `ALGORITHM` | `HS256` | JWT algorithm |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token expiration (24 hours) |
   | `ENVIRONMENT` | `production` | Environment flag |
   | `FRONTEND_URL` | `https://your-app.netlify.app` | *(update after frontend deploy)* |
   | `PYTHON_VERSION` | `3.11.7` | Python version |

   > **Generate SECRET_KEY:**
   > ```bash
   > python -c "import secrets; print(secrets.token_urlsafe(32))"
   > ```

6. **Select Instance Type**
   - Choose **Free** for testing or **Starter ($7/mo)** for production

7. **Click "Create Web Service"**
   - Render will build and deploy your backend
   - Note your URL: `https://virtual-classroom-api.onrender.com`

---

#### Method B: Blueprint Deployment (Using render.yaml)

The `render.yaml` file in the repository root enables one-click deployment:

1. Go to Render Dashboard → **New +** → **Blueprint**
2. Connect your repository
3. Render auto-detects `render.yaml` and creates all services
4. Configure environment variables in the dashboard

---

### Step 3: Verify Backend Deployment

1. **Check Health Endpoint**
   ```
   https://your-api.onrender.com/
   ```
   Expected response:
   ```json
   {
     "message": "Welcome to Virtual Classroom API",
     "status": "running",
     "database": "connected"
   }
   ```

2. **Check API Docs**
   ```
   https://your-api.onrender.com/docs
   ```
   FastAPI auto-generates Swagger documentation

3. **View Logs**
   - Go to Render Dashboard → Your Service → **Logs**
   - Check for startup messages and any errors

---

## Frontend Deployment (Netlify)

### Step 1: Prepare Frontend for Production

1. **Update API URL Configuration**
   
   Create/update `.env.production` in the `frontend` folder:
   ```env
   VITE_API_URL=https://virtual-classroom-api.onrender.com
   VITE_SOCKET_URL=wss://virtual-classroom-api.onrender.com
   ```

2. **Verify netlify.toml Configuration**
   
   The `frontend/netlify.toml` should contain:
   ```toml
   [build]
     command = "npm ci && npx vite build"
     publish = "dist"

   [build.environment]
     NODE_VERSION = "18"
     NPM_VERSION = "9"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

3. **Ensure SPA Routing**
   
   The `frontend/public/_redirects` file should contain:
   ```
   /*    /index.html   200
   ```

---

### Step 2: Deploy to Netlify

#### Method A: Connect Git Repository (Recommended)

1. **Log in to Netlify**
   - Go to [app.netlify.com](https://app.netlify.com)

2. **Add New Site**
   - Click **Add new site** → **Import an existing project**

3. **Connect to Git Provider**
   - Select **GitHub** (or GitLab/Bitbucket)
   - Authorize Netlify to access your repositories
   - Select your repository

4. **Configure Build Settings**

   | Setting | Value |
   |---------|-------|
   | **Branch to deploy** | `main` |
   | **Base directory** | `frontend` |
   | **Build command** | `npm ci && npm run build` |
   | **Publish directory** | `frontend/dist` |

5. **Set Environment Variables**
   
   Click **Show advanced** → **New variable**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://virtual-classroom-api.onrender.com` |
   | `VITE_SOCKET_URL` | `wss://virtual-classroom-api.onrender.com` |
   | `NODE_VERSION` | `18` |

6. **Click "Deploy site"**
   - Netlify will build and deploy your frontend
   - Note your URL: `https://random-name.netlify.app`

---

#### Method B: Drag & Drop Deploy

For quick testing without Git integration:

1. **Build Locally**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Upload to Netlify**
   - Go to [app.netlify.com/drop](https://app.netlify.com/drop)
   - Drag the `frontend/dist` folder to the browser

3. **Configure Site Settings**
   - Go to **Site settings** → **Environment variables**
   - Add `VITE_API_URL` and `VITE_SOCKET_URL`
   - Trigger a redeploy

---

#### Method C: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Navigate to frontend folder
cd frontend

# Build the project
npm run build

# Deploy (creates new site or links to existing)
netlify deploy --prod --dir=dist
```

---

### Step 3: Configure Custom Domain (Optional)

1. **Add Custom Domain**
   - Go to **Domain settings** → **Add custom domain**
   - Enter your domain (e.g., `classroom.yourdomain.com`)

2. **Configure DNS**
   - **For subdomain**: Add CNAME record pointing to `your-site.netlify.app`
   - **For apex domain**: Use Netlify DNS or add ALIAS/ANAME record

3. **Enable HTTPS**
   - Netlify automatically provisions SSL certificates
   - Go to **HTTPS** → Verify certificate is active

---

## Post-Deployment Configuration

### Step 1: Update CORS Settings

After deploying the frontend, update the backend's `FRONTEND_URL`:

1. Go to Render Dashboard → Your Backend Service
2. Navigate to **Environment** tab
3. Update `FRONTEND_URL` to your Netlify URL:
   ```
   FRONTEND_URL=https://your-app.netlify.app
   ```
4. Click **Save Changes** (triggers automatic redeploy)

---

### Step 2: Test Full Integration

1. **Open Frontend**
   ```
   https://your-app.netlify.app
   ```

2. **Test Authentication**
   - Create a new account (Sign Up)
   - Log in with created credentials
   - Verify JWT token is received

3. **Test API Calls**
   - Open browser DevTools (F12) → Network tab
   - Verify API calls to backend succeed (200 responses)
   - Check for CORS errors

4. **Test WebSocket (if applicable)**
   - Join a classroom
   - Verify real-time features work

---

### Step 3: Enable Auto-Deploy

Both platforms support automatic deployments:

- **Netlify**: Auto-deploys on every push to the connected branch
- **Render**: Auto-deploys on every push to the connected branch

Configure in respective dashboards under **Deploy settings**.

---

## Troubleshooting

### Backend Issues (Render)

#### 1. "Bootup Error" or Health Check Failed

**Cause**: App not binding to `$PORT` or startup errors.

**Solution**:
- Verify start command uses `0.0.0.0:$PORT`
- Check logs for Python import errors
- Ensure all dependencies are in `requirements.txt`

#### 2. Database Connection Failed

**Cause**: Wrong MongoDB URL or network access blocked.

**Solution**:
- Verify `MONGODB_URL` format (include database name)
- Check MongoDB Atlas → Network Access → Allow `0.0.0.0/0`
- Test connection string locally first

#### 3. Cold Start Delays (Free Tier)

**Cause**: Free tier spins down after 15 minutes of inactivity.

**Solution**:
- Use a cron job to ping the health endpoint
- Upgrade to paid tier for always-on service

---

### Frontend Issues (Netlify)

#### 1. Build Fails

**Common causes**:
- Missing dependencies in `package.json`
- Node version mismatch

**Solution**:
```bash
# Test locally first
npm ci && npm run build
```
Add `NODE_VERSION=18` to environment variables.

#### 2. Blank Page (White Screen)

**Cause**: SPA routing not configured.

**Solution**:
- Verify `public/_redirects` file exists
- Check `netlify.toml` has redirect rule

#### 3. API Calls Fail (CORS Error)

**Cause**: Backend not allowing frontend origin.

**Solution**:
- Update `FRONTEND_URL` in Render to match Netlify URL
- Redeploy backend after changing environment variables

#### 4. Environment Variables Not Working

**Cause**: Not prefixed with `VITE_` or not rebuilt.

**Solution**:
- All client-side env vars must start with `VITE_`
- Clear cache and redeploy after changing variables

---

## Environment Variables Summary

### Backend (Render)

| Variable | Required | Example |
|----------|----------|---------|
| `MONGODB_URL` | Yes | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `DATABASE_NAME` | Yes | `virtual_classroom` |
| `SECRET_KEY` | Yes | `your-secret-key-min-32-chars` |
| `ALGORITHM` | Yes | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Yes | `1440` |
| `ENVIRONMENT` | Yes | `production` |
| `FRONTEND_URL` | Yes | `https://your-app.netlify.app` |
| `PYTHON_VERSION` | No | `3.11.7` |

### Frontend (Netlify)

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_API_URL` | Yes | `https://your-api.onrender.com` |
| `VITE_SOCKET_URL` | No | `wss://your-api.onrender.com` |
| `NODE_VERSION` | No | `18` |

---

## Deployment Checklist

### Pre-Deployment

- [ ] MongoDB Atlas cluster created and accessible
- [ ] Backend builds and runs locally
- [ ] Frontend builds successfully (`npm run build`)
- [ ] All environment variables documented

### Backend (Render)

- [ ] Web service created with correct settings
- [ ] All environment variables set
- [ ] Health check endpoint accessible
- [ ] API documentation available at `/docs`

### Frontend (Netlify)

- [ ] Site deployed and accessible
- [ ] Environment variables configured
- [ ] SPA routing working (refresh any page)
- [ ] API calls successful (no CORS errors)

### Post-Deployment

- [ ] Backend `FRONTEND_URL` updated with Netlify URL
- [ ] Full user flow tested (signup → login → use app)
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificates active

---

## Quick Reference URLs

After deployment, your URLs will be:

| Service | URL |
|---------|-----|
| Frontend | `https://[your-site].netlify.app` |
| Backend API | `https://[your-api].onrender.com` |
| API Docs | `https://[your-api].onrender.com/docs` |
| Health Check | `https://[your-api].onrender.com/` |

---

## Support Resources

- [Netlify Docs](https://docs.netlify.com/)
- [Render Docs](https://render.com/docs)
- [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Vite Docs](https://vitejs.dev/)

---

**Deployment Complete! Your Virtual Classroom is now live.**
