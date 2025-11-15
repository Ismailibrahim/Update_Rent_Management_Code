# 🚀 Quick Start - One Command Deployment

## Deploy in One Command

### Windows
```bash
DEPLOY.bat
```

### Linux/Mac
```bash
chmod +x DEPLOY.sh && ./DEPLOY.sh
```

---

## ⚡ What It Does

The deployment script automatically:

1. ✅ Checks all prerequisites
2. ✅ Configures production environment
3. ✅ Installs dependencies
4. ✅ Runs database migrations
5. ✅ Builds frontend
6. ✅ Starts all services
7. ✅ Performs health checks

**Result:** Your app is live and ready! 🎉

---

## 📋 Before First Run

1. **Edit `DEPLOY.bat` or `DEPLOY.sh`** and set:
   - Database credentials
   - Your domain (if deploying to internet)

2. **Create database:**
   ```sql
   CREATE DATABASE quotation_system;
   ```

3. **Run deployment:**
   ```bash
   DEPLOY.bat  # Windows
   ./DEPLOY.sh # Linux/Mac
   ```

---

## 🌐 Production Deployment

### Cloud (Vercel + Railway)
- Set environment variables in platform settings
- Deploy via Git push (auto-deploy)

### VPS Server
1. SSH into server
2. Clone repository
3. Run `./DEPLOY.sh`
4. Configure Nginx/Apache
5. Set up SSL

### Docker
```bash
docker-compose -f docker-compose.production.yml up -d
```

---

## ✅ Verification

After deployment:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Health Check: http://localhost:8000/api/health

---

**For detailed instructions, see:** `ONE-COMMAND-DEPLOY.md`

