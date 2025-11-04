# URGENT: Frontend Server Not Responding

## Problem
- Pages are not loading (login, dashboard, etc.)
- Browser shows blank/Google homepage instead of your app

## Solution: Restart Frontend Server

### Step 1: Kill ALL Node Processes
Open PowerShell and run:
```powershell
Get-Process node | Stop-Process -Force
```

### Step 2: Clear Next.js Cache
```powershell
cd d:\Sandbox\HT_Quote\quotation-frontend
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
```

### Step 3: Restart Frontend
```powershell
cd d:\Sandbox\HT_Quote\quotation-frontend
npm run dev
```

Wait for message: "Ready on http://localhost:3000"

### Step 4: Test in Browser
1. Open: http://localhost:3000 (should show blue page with "ROOT PAGE WORKS!")
2. Try: http://localhost:3000/test (should show yellow page)
3. Try: http://localhost:3000/login (should show login form with red banner)

If still not working, the terminal should show errors.

