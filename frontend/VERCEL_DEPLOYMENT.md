# Vercel Deployment Guide - Frontend

Deploy the Virtual Classroom React frontend to Vercel.

## Quick Start (Dashboard)

1. Open [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. In **Project Settings**, set:

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

4. Add environment variables:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://aiml-1-rjdv.onrender.com` |
| `VITE_SOCKET_URL` | `https://aiml-signaling.onrender.com` |

5. Deploy

## Why this works

- `vercel.json` in this folder configures Vite build/output for Vercel.
- SPA fallback routing is enabled so direct route loads (like `/login` or `/teacher-dashboard`) do not 404.
- API calls continue to use `VITE_API_URL` so frontend and backend can stay on different hosts.

## CLI Deploy (Optional)

```bash
cd frontend
npm i -g vercel
vercel
vercel --prod
```

When prompted by CLI:
- Set the project root to `frontend`
- Add the same `VITE_*` environment variables

## Environment Variable Notes

- Variables must start with `VITE_` to be available in the browser build.
- After changing env vars in Vercel, trigger a redeploy.

## Troubleshooting

### Blank page or broken route refresh

- Confirm `frontend/vercel.json` is included in the deployed commit.
- Confirm project root is set to `frontend`.

### API request failures

- Verify `VITE_API_URL` value in Vercel project settings.
- Verify backend CORS allows your Vercel domain.
- Redeploy after env var changes.

### WebSocket/signaling issues

- Verify `VITE_SOCKET_URL` points to the signaling server.
- Ensure signaling server allows the Vercel frontend origin.

## Recommended next step

After first deploy, add your Vercel URL to backend CORS allowlist if requests are blocked.
