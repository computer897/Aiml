# Render Deployment Guide

This guide walks you through deploying the **Virtual Classroom** frontend application to [Render](https://render.com).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Prepare Your Project](#prepare-your-project)
3. [Deploy to Render](#deploy-to-render)
4. [Environment Variables](#environment-variables)
5. [Custom Domain (Optional)](#custom-domain-optional)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- A [Render account](https://dashboard.render.com/register) (free tier available)
- Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket)
- Node.js 18+ installed locally for testing

---

## Prepare Your Project

### 1. Verify Build Command

Ensure `package.json` has the correct build script:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### 2. Add a render.yaml (Optional - For Blueprint Deploys)

Create a `render.yaml` file in the project root for Infrastructure as Code deployment:

```yaml
services:
  - type: web
    name: virtual-classroom-frontend
    runtime: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: NODE_VERSION
        value: 18
    headers:
      - path: /*
        name: Cache-Control
        value: public, max-age=31536000, immutable
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

### 3. Ensure SPA Routing Works

For single-page applications, create a `_redirects` file in the `public/` folder (already exists in your project):

```
/*    /index.html   200
```

Or add rewrite rules in `render.yaml` as shown above.

---

## Deploy to Render

### Method 1: Static Site (Recommended for Frontend)

1. **Log in to Render Dashboard**
   - Go to [dashboard.render.com](https://dashboard.render.com)

2. **Create a New Static Site**
   - Click **New +** → **Static Site**

3. **Connect Your Repository**
   - Select your Git provider (GitHub, GitLab, or Bitbucket)
   - Authorize Render to access your repositories
   - Select the `frontend` repository

4. **Configure Build Settings**

   | Setting | Value |
   |---------|-------|
   | **Name** | `virtual-classroom` (or your preferred name) |
   | **Branch** | `main` (or your default branch) |
   | **Root Directory** | Leave blank (or specify if in a monorepo) |
   | **Build Command** | `npm install && npm run build` |
   | **Publish Directory** | `dist` |

5. **Advanced Settings (Optional)**
   - Add environment variables if needed
   - Set Node version: Add `NODE_VERSION` = `18`

6. **Click "Create Static Site"**
   - Render will automatically build and deploy your application
   - Your site will be available at `https://your-site-name.onrender.com`

### Method 2: Blueprint Deploy (Using render.yaml)

1. Create the `render.yaml` file as shown above
2. Go to Render Dashboard → **New +** → **Blueprint**
3. Connect your repository
4. Render will automatically detect and deploy based on `render.yaml`

---

## Environment Variables

If your app requires environment variables (e.g., API URLs), configure them in Render:

### Setting Environment Variables

1. Go to your Static Site in the Render Dashboard
2. Navigate to **Environment** tab
3. Add your variables:

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `VITE_API_URL` | `https://api.yourdomain.com` | Backend API endpoint |
| `VITE_SOCKET_URL` | `wss://api.yourdomain.com` | WebSocket server URL |
| `NODE_VERSION` | `18` | Node.js version for build |

> **Note:** In Vite, environment variables must be prefixed with `VITE_` to be exposed to the client.

### Using Environment Variables in Code

Access them in your React code:

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'ws://localhost:5000';
```

---

## Custom Domain (Optional)

### Adding a Custom Domain

1. Go to your Static Site → **Settings** → **Custom Domains**
2. Click **Add Custom Domain**
3. Enter your domain (e.g., `classroom.yourdomain.com`)
4. Update your DNS settings:
   - For apex domain: Add an `A` record pointing to Render's IP
   - For subdomain: Add a `CNAME` record pointing to `your-site.onrender.com`

### SSL Certificate

Render automatically provisions free SSL certificates via Let's Encrypt for custom domains.

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Build Fails - "Cannot find module"

**Solution:** Ensure all dependencies are in `package.json`:
```bash
npm install
npm run build
```

#### 2. Blank Page After Deploy

**Cause:** SPA routing not configured properly.

**Solution:** Ensure the rewrite rule exists:
- Check `public/_redirects` file contains: `/*    /index.html   200`
- Or configure routes in `render.yaml`

#### 3. API Requests Failing

**Cause:** CORS issues or incorrect API URL.

**Solution:**
- Verify `VITE_API_URL` is set correctly in environment variables
- Ensure your backend allows requests from your Render domain

#### 4. Environment Variables Not Working

**Cause:** Variables not prefixed with `VITE_` or not rebuilt after change.

**Solution:**
- Prefix all client-side variables with `VITE_`
- Trigger a manual deploy after adding/changing environment variables

#### 5. Old Version Showing After Deploy

**Cause:** Browser cache or CDN cache.

**Solution:**
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Clear browser cache
- Add cache-busting headers in `render.yaml`

### View Build Logs

1. Go to your Static Site in Render Dashboard
2. Click on **Events** or **Logs** tab
3. Review build output for errors

---

## Deployment Checklist

- [ ] Code pushed to Git repository
- [ ] `npm run build` works locally without errors
- [ ] Environment variables configured in Render
- [ ] `_redirects` file in `public/` folder for SPA routing
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active

---

## Quick Commands Reference

```bash
# Test build locally before deploying
npm run build
npm run preview

# Check for lint errors
npm run lint
```

---

## Useful Links

- [Render Static Site Docs](https://render.com/docs/static-sites)
- [Render Environment Variables](https://render.com/docs/environment-variables)
- [Render Custom Domains](https://render.com/docs/custom-domains)
- [Vite Build Documentation](https://vitejs.dev/guide/build.html)

---

## Support

If you encounter issues:

1. Check Render's [status page](https://status.render.com)
2. Review [Render documentation](https://render.com/docs)
3. Contact Render support via their dashboard

---

**Happy Deploying! 🚀**
