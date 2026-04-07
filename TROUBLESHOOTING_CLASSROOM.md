# Troubleshooting: Classroom Creation & Start Issues

## Issue 1: "Create Classroom" Button Won't Submit

### Check These in Order:

#### Step 1: Browser Console (F12)
1. Press **F12** and go to **Console** tab
2. Try to create a classroom
3. Look for red errors starting with `[API]` or `Error:`
4. **Share the error with me**

#### Step 2: Network Tab (F12)
1. Press **F12** and go to **Network** tab
2. Try to create a classroom
3. Look for a request like `POST /class/create` or similar
4. Click on it and check:
   - **Status Code**: Should be 201 (success) or 200
   - **Response**: Should have classroom data
5. **Share the status code and response**

#### Step 3: Verify Required Fields
Make sure you're entering:
- ✅ Class ID (generated automatically)
- ✅ Class Title (required)
- ✅ Schedule Date (required)
- ✅ Schedule Time (required)

#### Step 4: Check Backend Health
1. Open a new tab and visit: `https://aiml-1-rjdv.onrender.com/health`
2. You should see: `{"status": "connected"}`
3. If it shows an error, the **backend is down**

---

## Issue 2: "Start Class" Shows White Space

### Likely Causes:

#### Problem A: Classroom Not Initialized
- The component loads but never renders
- **Fix**: Add this to browser console:
  ```javascript
  console.log('Classroom component mounted')
  ```

#### Problem B: Missing Video/Camera
- The component needs camera permissions
- **Fix**: When prompted, click "Allow" for camera/microphone

#### Problem C: API Returns Wrong Data
- Backend creates class but response is malformed
- **Fix**: Check Network tab → `/class/{id}/activate` response

---

## How to Report the Issue

**Please provide:**

1. **Screenshot of browser console errors** (F12 → Console)
2. **Network request details** (F12 → Network → look for failed requests)
3. **Backend health check result** (visit `/health` endpoint)
4. **What you see exactly** when it shows "white space"

---

## Common Fixes

### Fix 1: Clear Cache & Reload
```bash
Ctrl+Shift+Delete (Windows)
Cmd+Shift+Delete (Mac)
```
- Select "All time"
- Check "Cookies and cached images"
- Clear data
- Reload the page

### Fix 2: Check Environment Variable
- Verify backend URL is correct in `.env.production`
- Should be: `https://aiml-1-rjdv.onrender.com`

### Fix 3: Restart Backend
If you control the backend, restart it on Render:
1. Go to Dashboard
2. Click your service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait 2-3 minutes for it to boot up

---

## Expected Behavior

### Creating a Classroom ✅
1. Fill form → Click "Create Classroom"
2. Should see "Creating..." temporarily
3. Should see success notification
4. Should refresh dashboard showing new class

### Starting a Class ✅
1. Click "Start Class" button
2. Should see loading spinner (2-3 seconds)
3. Should navigate to `/classroom/{classId}`
4. Should show permission dialog for camera
5. Click "Allow" → Should see video/classroom interface

---

## Still Not Working?

If issues persist, share:
- Browser console errors (screenshot of red text)
- Network tab response (what the API says)
- Backend health status
- What device/browser you're using

Then I can provide specific fixes!
