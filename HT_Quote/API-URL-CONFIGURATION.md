# 🔧 API URL Configuration Guide

## ✅ **YES - It Will Automatically Switch!**

Your app **now automatically** changes from localhost to production API URL based on environment variables.

---

## 🎯 **How It Works**

### **Development (Local)**
When `NEXT_PUBLIC_API_URL` is **NOT set**:
- ✅ Uses `http://localhost:8000/api` (default)
- ✅ Works automatically for local development
- ✅ No configuration needed for local testing

### **Production**
When you set `NEXT_PUBLIC_API_URL` environment variable:
- ✅ Automatically uses your production API URL
- ✅ No code changes needed
- ✅ Works immediately after setting the variable

---

## 📝 **Configuration**

### **Option 1: Local Development (`.env.local`)**

Create `quotation-frontend/.env.local`:

```env
# For local development (optional - defaults to localhost)
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### **Option 2: Production Deployment**

#### **Vercel / Netlify / Other Platforms:**
Set environment variable in your hosting platform:
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

#### **Docker / Self-Hosted:**
Create `.env.production` or set environment variable:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

#### **Build-Time:**
Next.js embeds `NEXT_PUBLIC_*` variables at **build time**, so:
1. Set the environment variable
2. Run `npm run build`
3. Deploy - it will use the production URL!

---

## 🔍 **What Was Fixed**

### **Before:**
```typescript
// ❌ Hardcoded - always uses localhost
const API_BASE_URL = 'http://localhost:8000/api';
```

### **After:**
```typescript
// ✅ Uses environment variable, falls back to localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
```

### **Files Updated:**
1. ✅ `quotation-frontend/src/lib/api.ts` - Main API configuration
2. ✅ `quotation-frontend/src/lib/health-monitor.ts` - Health checks
3. ✅ File upload function - Logo uploads

---

## 🚀 **Deployment Steps**

### **Step 1: Set Environment Variable**

**For Vercel:**
1. Go to your project settings
2. Environment Variables
3. Add: `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com/api`
4. Redeploy

**For Other Platforms:**
- Set `NEXT_PUBLIC_API_URL` in your platform's environment variables
- Rebuild and deploy

### **Step 2: Verify**

After deployment, check browser console:
- Open browser DevTools (F12)
- Check Network tab
- API calls should go to your production URL (not localhost)

---

## ⚠️ **Important Notes**

### **Build-Time Variables**
- `NEXT_PUBLIC_*` variables are embedded at **build time**
- You must **rebuild** after changing environment variables
- Changes take effect on next deployment

### **Runtime Variables (NOT USED)**
- Regular environment variables (without `NEXT_PUBLIC_`) don't work in browser
- Always use `NEXT_PUBLIC_` prefix for client-side variables

### **Testing Production Locally**
```bash
# Build with production API URL
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api npm run build
npm start
```

---

## ✅ **Verification Checklist**

Before production launch:
- [ ] Set `NEXT_PUBLIC_API_URL` in production environment
- [ ] Build frontend with production environment variables
- [ ] Test that API calls go to production URL (check Network tab)
- [ ] Verify health checks work with production URL
- [ ] Test file uploads work with production URL

---

## 🎉 **Summary**

**Yes! Your app will automatically switch from localhost to production when you:**

1. ✅ Set `NEXT_PUBLIC_API_URL` environment variable in production
2. ✅ Rebuild the frontend (`npm run build`)
3. ✅ Deploy

**No code changes needed** - it's all automatic! 🚀

---

**Last Updated:** 2025-01-28

