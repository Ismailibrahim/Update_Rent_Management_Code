# Login Troubleshooting Guide

## Current Server Status

**Backend**: http://localhost:8000 ✅ RUNNING
**Frontend**: http://localhost:3001 ✅ RUNNING (Turbo mode)

## How to Login

1. **Open your browser** and go to: **http://localhost:3001/login**

2. **Enter credentials:**
   - Username: `admin`
   - Password: `password`

3. **Click "Sign in"**

## Debugging Steps

### Step 1: Open Browser Console
1. Press **F12** to open Developer Tools
2. Click on the **Console** tab
3. Try logging in
4. Look for these messages:
   - 🔐 Login attempt
   - 📡 Response status
   - 📦 Response data
   - ✅ Login successful OR ❌ Login failed

### Step 2: Check Network Tab
1. Open **Network** tab in Developer Tools (F12)
2. Try logging in
3. Look for a request to `http://localhost:8000/api/auth/login`
4. Click on it and check:
   - **Status**: Should be 200
   - **Response**: Should have `token` and `user` data

### Common Issues & Solutions

#### Issue 1: "Cannot connect to server"
**Solution**: Backend not running
```bash
cd D:\Sandbox\HT_Quote\quotation-system
php artisan serve --port=8000
```

#### Issue 2: Wrong port
**Frontend is on port 3001** (not 3000)
- Use: http://localhost:3001/login

#### Issue 3: CORS error in console
**Solution**: Already configured, but if you see it:
```bash
cd D:\Sandbox\HT_Quote\quotation-system
php artisan config:clear
php artisan serve --port=8000
```

#### Issue 4: "Invalid credentials"
**Check you're using:**
- Username: `admin` (lowercase)
- Password: `password` (lowercase)

#### Issue 5: Nothing happens when clicking login
**Check console** for JavaScript errors

## Test Backend Directly

Open Command Prompt and run:
```bash
curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"password\"}"
```

**Expected response:**
```json
{
  "user": {...},
  "token": "...",
  "message": "Login successful"
}
```

## Current Configuration

### Backend (Laravel)
- Port: **8000**
- API URL: http://localhost:8000/api
- Auth endpoint: http://localhost:8000/api/auth/login
- CORS: Enabled for all origins

### Frontend (Next.js)
- Port: **3001** (Turbo mode)
- Login URL: http://localhost:3001/login
- Dashboard: http://localhost:3001/dashboard

## What Should Happen

1. **Enter credentials** → Click Sign in
2. **Console shows**: 🔐 Login attempt
3. **API call** to backend
4. **Console shows**: 📡 Response status: 200
5. **Console shows**: 📦 Response data with token
6. **Console shows**: ✅ Login successful
7. **Redirect** to dashboard

## Still Not Working?

### Check This Checklist:
- [ ] Backend running on port 8000
- [ ] Frontend running on port 3001
- [ ] Using correct URL: http://localhost:3001/login
- [ ] Using correct credentials: admin / password
- [ ] Browser console open (F12)
- [ ] No JavaScript errors in console
- [ ] Network tab shows 200 response

### Get Console Output
1. Open browser console (F12)
2. Try to login
3. Copy ALL console messages
4. Share them to diagnose the issue

### Manual Test
Try this in browser console (F12 → Console tab):
```javascript
fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({username: 'admin', password: 'password'})
}).then(r => r.json()).then(console.log)
```

Should print the user and token.

## Quick Restart

If all else fails:
1. Close all terminal windows
2. Double-click: `D:\Sandbox\HT_Quote\START-ALL.bat`
3. Wait 5 seconds
4. Go to: http://localhost:3000/login
5. Try again