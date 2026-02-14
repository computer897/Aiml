# Netlify Deployment Guide - Frontend

Deploy the Virtual Classroom React frontend to Netlify.

---

## Quick Start

### Option 1: Connect GitHub (Recommended)

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Connect GitHub and select your repository
3. Configure:

   | Setting | Value |
   |---------|-------|
   | **Base directory** | `frontend` |
   | **Build command** | `npm ci && npm run build` |
   | **Publish directory** | `frontend/dist` |

4. Add environment variables (click **Show advanced**):

   | Variable | Value |
   |----------|-------|
   | `VITE_API_URL` | `https://virtual-classroom-api.onrender.com` (FastAPI backend) |
   | `VITE_SOCKET_URL` | `https://aiml-signaling.onrender.com` (Socket.IO signaling server - DIFFERENT from API) |
   | `NODE_VERSION` | `18` |

   > **Important:** The `VITE_SOCKET_URL` must point to the Node.js Socket.IO signaling server (`server.js`), NOT the FastAPI backend. These are deployed as separate services.

5. Click **Deploy site**

---

### Option 2: Netlify CLI

```bash
# Install CLI
npm install -g netlify-cli

# Login
netlify login

# Build and deploy
cd frontend
npm ci && npm run build
netlify deploy --prod --dir=dist
```

---

## Configuration Files

### netlify.toml

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

### public/_redirects

```
/*    /index.html   200
```

This ensures SPA routing works correctly.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL (Render) |
| `VITE_SOCKET_URL` | No | WebSocket URL for real-time features |
| `NODE_VERSION` | No | Node.js version (default: 18) |

> **Important**: All client-side variables must be prefixed with `VITE_`

### Setting Variables

1. Go to **Site settings** → **Environment variables**
2. Click **Add a variable**
3. Enter key and value
4. **Redeploy** for changes to take effect

---

## Custom Domain

1. Go to **Domain settings** → **Add custom domain**
2. Enter your domain (e.g., `app.yourdomain.com`)
3. Configure DNS:
   - **Subdomain**: CNAME → `your-site.netlify.app`
   - **Apex domain**: Use Netlify DNS or ALIAS record
4. HTTPS is automatically enabled

---

## Build Hooks (CI/CD)

Create a build hook for external triggers:

1. Go to **Site settings** → **Build & deploy** → **Build hooks**
2. Click **Add build hook**
3. Use the URL to trigger deploys:
   ```bash
   curl -X POST -d '{}' https://api.netlify.com/build_hooks/YOUR_HOOK_ID
   ```

---

## Troubleshooting

### Build Fails

```bash
# Verify locally first
npm ci && npm run build
```

Check:
- All dependencies in `package.json`
- `NODE_VERSION` environment variable set

### Blank Page

Ensure redirect rules exist:
- `public/_redirects` file present
- Or `[[redirects]]` in `netlify.toml`

### API Errors

1. Verify `VITE_API_URL` is correct
2. Check backend CORS allows your Netlify domain
3. Open DevTools → Network tab for details

### Old Content After Deploy

- Hard refresh: `Ctrl + Shift + R`
- Or: **Deploys** → Select deploy → **Clear cache and retry**

---

## Deploy Preview

Netlify creates preview URLs for pull requests:

- Each PR gets a unique URL: `deploy-preview-123--your-site.netlify.app`
- Useful for testing changes before merging

---

## Useful Commands

```bash
# List sites
netlify sites:list

# Open site
netlify open:site

# Open admin
netlify open:admin

# View deploy status
netlify status

# View logs
netlify logs
```

---

## Links

- [Netlify Docs](https://docs.netlify.com/)
- [Vite Deploy Guide](https://vitejs.dev/guide/static-deploy.html#netlify)
- [Netlify CLI Reference](https://cli.netlify.com/)
