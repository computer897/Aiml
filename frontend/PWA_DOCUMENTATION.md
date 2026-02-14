# VC Room - Progressive Web App (PWA) Documentation

## Overview

VC Room is now a fully-featured Progressive Web App (PWA) that can be installed on:
- **Android** devices (Chrome, Edge, Samsung Internet)
- **iOS** devices (Safari - "Add to Home Screen")
- **Desktop** (Windows, macOS, Linux - Chrome, Edge)

## Features

### 1. Installable App
Users can install VC Room as a standalone app that:
- Opens without browser UI (address bar, tabs)
- Has its own app icon and splash screen
- Appears in the app switcher/taskbar
- Can be pinned to home screen or dock

### 2. Offline Support
- Offline fallback page when network is unavailable
- Static assets are cached for faster loading
- Network-first strategy for API requests

### 3. Service Worker
The service worker provides:
- Smart caching strategies
- Background sync for attendance data
- Push notification support (ready for future use)
- Automatic updates

### 4. WebRTC Compatibility
The PWA is fully compatible with real-time features:
- ✅ Camera and microphone access
- ✅ WebRTC peer-to-peer connections
- ✅ WebSocket real-time updates
- ✅ Face detection (face-api.js)
- ✅ Screen sharing

## Files Added

```
frontend/
├── public/
│   ├── manifest.json          # PWA manifest configuration
│   ├── service-worker.js      # Service worker with caching strategies
│   ├── offline.html           # Offline fallback page
│   ├── logo.svg               # App icon (SVG format)
│   ├── generate-icons.js      # Script to generate PNG icons
│   └── icons/
│       └── README.md          # Icon generation instructions
└── src/
    ├── hooks/
    │   └── usePWAInstall.js   # PWA installation hooks
    └── components/
        └── PWAInstallBanner.jsx # Install prompt UI components
```

## Generating PNG Icons

For optimal PWA support across all platforms, generate PNG icons:

### Option 1: Using Node.js (Recommended)
```bash
cd frontend/public
npm install sharp
node generate-icons.js
```

### Option 2: Online Tools
1. Visit https://www.pwabuilder.com/imageGenerator
2. Upload `frontend/public/logo.svg`
3. Download and extract icons to `frontend/public/icons/`

### Option 3: Using ImageMagick
```bash
cd frontend/public
for size in 72 96 128 144 152 192 384 512; do
  convert logo.svg -resize ${size}x${size} icons/icon-${size}x${size}.png
done
```

## Required Icon Sizes

| Size | Purpose |
|------|---------|
| 72x72 | Android (legacy) |
| 96x96 | Android, Windows tile |
| 128x128 | Chrome Web Store |
| 144x144 | Windows tile |
| 152x152 | iOS (iPad) |
| 192x192 | Android (maskable) |
| 384x384 | High-DPI Android |
| 512x512 | Android splash screen (maskable) |

## Testing the PWA

### Chrome DevTools
1. Open DevTools (F12)
2. Go to **Application** tab
3. Check **Manifest** section for valid configuration
4. Check **Service Workers** section for registration status
5. Use **Lighthouse** for PWA audit

### Install Testing
1. Deploy to HTTPS (required for PWA)
2. Visit the site in Chrome/Edge
3. Look for install prompt or browser install button
4. Click "Install" and verify standalone mode

### Offline Testing
1. Open DevTools > Application > Service Workers
2. Check "Offline" checkbox
3. Reload the page
4. Verify offline.html is shown

## Configuration

### Manifest (`public/manifest.json`)
```json
{
  "name": "VC Room - Smart Virtual Classroom",
  "short_name": "VC Room",
  "display": "standalone",
  "theme_color": "#1e3a5f",
  "background_color": "#ffffff",
  "start_url": "/"
}
```

### Theme Color
The theme color `#1e3a5f` (navy blue) is used for:
- Browser toolbar color on mobile
- Windows title bar color
- Splash screen background

### Caching Strategy
| Resource Type | Strategy |
|---------------|----------|
| Navigation | Network-first with offline fallback |
| API requests | Network-first (never cache) |
| Static assets | Cache-first with background update |
| WebRTC/WebSocket | Never cached (bypassed) |

## Security Requirements

PWA features require:
- **HTTPS** connection (or localhost for development)
- Valid SSL certificate
- Proper CORS headers for cross-origin requests

## Browser Support

| Browser | Install | Offline | Push |
|---------|---------|---------|------|
| Chrome (Android) | ✅ | ✅ | ✅ |
| Chrome (Desktop) | ✅ | ✅ | ✅ |
| Edge | ✅ | ✅ | ✅ |
| Safari (iOS) | ✅* | ✅ | ❌ |
| Safari (macOS) | ✅ | ✅ | ❌ |
| Firefox | ❌ | ✅ | ✅ |

*iOS uses "Add to Home Screen" instead of install prompt

## Troubleshooting

### Install prompt not showing
1. Ensure HTTPS is used
2. Check manifest is valid (DevTools > Application > Manifest)
3. Verify service worker is registered
4. Note: Install prompt may be rate-limited by browser

### Service worker not updating
1. Check DevTools > Application > Service Workers
2. Click "Update" or "skipWaiting"
3. Clear site data if needed

### Camera not working
1. Ensure camera permission is granted
2. Check HTTPS is enabled
3. Verify `getUserMedia` is called correctly

## Components

### PWAInstallBanner
Displays the install prompt UI:
```jsx
import { PWAInstallBanner } from './components/PWAInstallBanner'
// Automatically shows when app is installable
<PWAInstallBanner />
```

### OfflineIndicator
Shows offline/online status:
```jsx
import { OfflineIndicator } from './components/PWAInstallBanner'
<OfflineIndicator />
```

### UpdateBanner
Shows when new version is available:
```jsx
import { UpdateBanner } from './components/PWAInstallBanner'
<UpdateBanner />
```

### usePWAInstall Hook
```jsx
import { usePWAInstall } from './hooks/usePWAInstall'

const { isInstallable, isInstalled, promptInstall } = usePWAInstall()

if (isInstallable) {
  return <button onClick={promptInstall}>Install App</button>
}
```

## Deployment Checklist

- [ ] Generate PNG icons from logo.svg
- [ ] Deploy to HTTPS
- [ ] Verify manifest loads correctly
- [ ] Test service worker registration
- [ ] Test install prompt
- [ ] Test offline mode
- [ ] Run Lighthouse PWA audit
- [ ] Test on Android device
- [ ] Test on iOS device
- [ ] Test on desktop browsers
