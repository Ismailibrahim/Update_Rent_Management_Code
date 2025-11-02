# Portainer Stack Deployment Guide

This guide will walk you through deploying the Rent Management System using Portainer's Stack deployment feature. Perfect for beginners!

## 📋 Table of Contents

1. [What is Portainer?](#what-is-portainer)
2. [Prerequisites](#prerequisites)
3. [Installation Steps](#installation-steps)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## What is Portainer?

[Portainer](https://www.portainer.io/) is a user-friendly web interface for managing Docker containers. Instead of using command-line Docker commands, you can manage everything through a simple web UI. It's perfect for beginners and professionals alike.

**Key Benefits:**
- ✅ Easy-to-use web interface
- ✅ No need to learn complex Docker commands
- ✅ Visual container management
- ✅ Stack deployment (multiple containers at once)
- ✅ Free for personal use

---

## Prerequisites

Before you begin, make sure you have:

1. **A server or computer** with Docker installed
   - Linux server (Ubuntu, Debian, etc.)
   - Windows Server with Docker
   - macOS with Docker Desktop
   - Cloud server (AWS, DigitalOcean, etc.)

2. **Docker installed** on your server
   - [Install Docker](https://docs.docker.com/get-docker/)
   - Verify installation: `docker --version`

3. **Basic knowledge:**
   - How to access your server (SSH for Linux, Remote Desktop for Windows)
   - Basic understanding of web browsers
   - Your domain name (optional, for production)

---

## Installation Steps

### Step 1: Install Portainer

Open a terminal/command prompt on your server and run:

```bash
# Create a volume for Portainer data
docker volume create portainer_data

# Run Portainer container
docker run -d -p 8000:8000 -p 9443:9443 --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

**What this does:**
- Creates a data volume for Portainer
- Starts Portainer on ports 8000 (HTTP) and 9443 (HTTPS)
- Connects to your Docker installation

### Step 2: Access Portainer

1. Open your web browser
2. Navigate to:
   - **HTTPS (Recommended):** `https://your-server-ip:9443`
   - **HTTP:** `http://your-server-ip:8000`
   
   Replace `your-server-ip` with your actual server IP address

3. **First-time setup:**
   - Create an admin account (username and password)
   - Choose "Get Started" for the free Community Edition

### Step 3: Select Your Environment

- Choose **"Docker"** as your environment
- Portainer will connect to your local Docker installation

---

## Deployment Steps

### Step 1: Prepare Your docker-compose.yml File

You have two options:

#### Option A: Use the Production Stack (Recommended for Production)

Use `docker-compose.yml` combined with `docker-compose.prod.yml`

#### Option B: Use Development Stack (For Testing)

Use `docker-compose.yml` combined with `docker-compose.dev.yml`

**For this guide, we'll use the Production Stack.**

### Step 2: Create a Stack in Portainer

1. **Log into Portainer**
   - Access Portainer at `https://your-server-ip:9443`

2. **Navigate to Stacks**
   - Click **"Stacks"** in the left menu
   - Click **"Add stack"** button (top right)

3. **Configure Stack Settings**
   - **Name:** `rent-management` (or any name you prefer)
   - **Build method:** Select **"Repository"** or **"Web editor"**

### Step 3: Deploy Using Web Editor (Easiest Method)

1. **Select "Web editor"**

2. **Copy the docker-compose.portainer.yml content (Recommended):**
   - This file is optimized for Portainer deployment
   - Open `docker-compose.portainer.yml` from your project
   - Copy the entire file content
   - Paste it into the Portainer web editor
   
   **OR use docker-compose.yml:**
   - Open `docker-compose.yml` from your project
   - Copy the entire file content
   - Paste it into the Portainer web editor

3. **Add Environment Variables:**
   - Scroll down to **"Environment variables"** section
   - Click **"Add environment variable"**
   - Add each variable one by one (see list below)

**Required Environment Variables:**

```env
# Application Configuration
APP_NAME=Rent Management
APP_ENV=production
APP_KEY=base64:YOUR_APP_KEY_HERE
APP_DEBUG=false
APP_URL=http://your-server-ip:80

# Database Configuration
DB_DATABASE=rent_management
DB_USERNAME=laravel
DB_PASSWORD=your_secure_password_here
DB_ROOT_PASSWORD=your_root_password_here

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://your-server-ip:80/api

# Sanctum Configuration (use your domain or IP)
SANCTUM_STATEFUL_DOMAINS=your-server-ip,yourdomain.com

# Nginx Ports (optional, defaults shown)
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
```

**How to generate APP_KEY:**
If you don't have an APP_KEY yet:
```bash
# Run this command in a terminal
docker run --rm php:8.2-cli php -r "echo 'base64:' . base64_encode(random_bytes(32)) . PHP_EOL;"
```

**Important Notes:**
- Replace `your-server-ip` with your actual server IP address
- Replace `your_secure_password_here` with a strong password
- Replace `your_root_password_here` with another strong password
- If you have a domain, replace `yourdomain.com` with it

### Step 4: Deploy Using Repository Method (Alternative)

If you prefer using a Git repository:

1. **Select "Repository"**

2. **Configure Repository:**
   - **Repository URL:** `https://github.com/lugmanahmed/Rent-Managment.git`
   - **Reference:** `master` (or your branch name)
   - **Compose path:** `docker-compose.yml`

3. **Add Environment Variables** (same as Step 3 above)

4. **Optional - Add docker-compose.prod.yml:**
   - If you want to use production optimizations
   - You'll need to merge both files or create a single production compose file

### Step 5: Deploy the Stack

1. **Review your configuration**
   - Make sure all environment variables are set
   - Check the compose file syntax

2. **Click "Deploy the stack"**

3. **Wait for deployment**
   - Portainer will show deployment progress
   - This may take 5-10 minutes on first deployment
   - Containers will be built and started

### Step 6: Monitor Deployment

1. **Watch the containers start:**
   - Go to **"Containers"** in the left menu
   - You should see containers starting:
     - `rent-management-mysql`
     - `rent-management-backend`
     - `rent-management-frontend`
     - `rent-management-nginx`

2. **Check container logs:**
   - Click on each container
   - Click **"Logs"** tab
   - Look for any errors

---

## Post-Deployment

### Step 1: Run Database Migrations

1. **In Portainer, go to "Containers"**
2. **Click on `rent-management-backend`**
3. **Click "Console" tab**
4. **Run these commands:**

```bash
# Run migrations
php artisan migrate --force

# (Optional) Seed the database
php artisan db:seed
```

**Alternative: Using Portainer Exec**
1. Click on `rent-management-backend` container
2. Click **"Exec"** tab
3. Type: `php artisan migrate --force`
4. Click **"Connect"**

### Step 2: Verify Application

1. **Check health endpoints:**
   - Open browser: `http://your-server-ip/health`
   - Should return: `healthy`
   - Open: `http://your-server-ip/api/health`
   - Should return JSON with status

2. **Access the application:**
   - Frontend: `http://your-server-ip`
   - Backend API: `http://your-server-ip/api`
   - Test endpoint: `http://your-server-ip/api/test`

### Step 3: Create Admin User

1. **Access the application** at `http://your-server-ip`
2. **Register a new user** through the registration page
3. **Or create via command:**

```bash
# In backend container console
php artisan tinker

# Then run:
User::create([
    'name' => 'Admin',
    'email' => 'admin@example.com',
    'password' => Hash::make('your-password'),
    'role_id' => 1  # Adjust based on your roles table
]);
```

---

## Troubleshooting

### Problem: Containers won't start

**Solution:**
1. Check container logs in Portainer
2. Verify all environment variables are set correctly
3. Check if ports 80, 443, 3306 are available
4. Ensure Docker has enough resources (RAM, disk space)

### Problem: Database connection errors

**Solution:**
1. Verify database environment variables:
   - `DB_HOST=mysql` (not localhost)
   - `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` are correct
2. Wait for MySQL container to fully start (may take 1-2 minutes)
3. Check MySQL container logs

### Problem: Frontend can't connect to API

**Solution:**
1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Should be: `http://your-server-ip/api` (or your domain)
3. Check backend container is running
4. Check Nginx logs

### Problem: 502 Bad Gateway

**Solution:**
1. Backend container might not be ready
2. Check backend container logs
3. Verify PHP-FPM is running
4. Check Nginx configuration

### Problem: Permission errors

**Solution:**
1. In Portainer, go to backend container
2. Console tab, run:
```bash
chown -R www-data:www-data /var/www/html/storage
chmod -R 755 /var/www/html/storage
```

### Problem: Application key not set

**Solution:**
1. In backend container console:
```bash
php artisan key:generate
```
2. Or set `APP_KEY` environment variable in Portainer

### Problem: Port already in use

**Solution:**
1. Change ports in environment variables:
   - `NGINX_HTTP_PORT=8080` (instead of 80)
   - `NGINX_HTTPS_PORT=8443` (instead of 443)
2. Or stop the service using those ports

---

## FAQ

### Q: Can I use a custom domain instead of IP?

**A:** Yes! 
1. Point your domain DNS to your server IP
2. Update `APP_URL` to `https://yourdomain.com`
3. Update `NEXT_PUBLIC_API_URL` to `https://yourdomain.com/api`
4. Update `SANCTUM_STATEFUL_DOMAINS` to `yourdomain.com,www.yourdomain.com`
5. Configure SSL in Nginx (or use a reverse proxy like Cloudflare)

### Q: How do I update the application?

**A:** 
1. Pull latest code to your server
2. In Portainer, go to your Stack
3. Click **"Editor"**
4. Update the compose file if needed
5. Click **"Update the stack"**

Or if using Repository method:
1. Push changes to your Git repository
2. In Portainer, go to Stack
3. Click **"Editor"**
4. Update Reference (commit/branch) if needed
5. Click **"Update the stack"**

### Q: How do I backup the database?

**A:**
1. In Portainer, go to `rent-management-mysql` container
2. Click **"Console"** tab
3. Run:
```bash
mysqldump -u root -p rent_management > /backup.sql
```
4. Copy file from container to your host

### Q: How do I view logs?

**A:**
1. In Portainer, go to **"Containers"**
2. Click on any container
3. Click **"Logs"** tab
4. You can filter and search logs

### Q: Can I deploy to multiple servers?

**A:** Yes! Portainer supports multiple environments:
1. Add another Docker environment
2. Create the same stack on each environment
3. Or use Portainer Business Edition for centralized management

### Q: Is Portainer free?

**A:** Yes, Portainer Community Edition is free for personal use. Business features require a license.

### Q: How do I stop/start the application?

**A:**
1. In Portainer, go to **"Stacks"**
2. Click on your stack
3. Toggle the switch to start/stop
4. Or use **"Stop stack"** / **"Start stack"** buttons

### Q: How do I delete the stack?

**A:**
1. In Portainer, go to **"Stacks"**
2. Click on your stack
3. Click **"Remove"** button
4. ⚠️ **Warning:** This will delete all containers and volumes!

---

## Quick Reference

### Portainer URLs
- **Portainer UI:** `https://your-server-ip:9443`
- **Application:** `http://your-server-ip`
- **API:** `http://your-server-ip/api`
- **Health Check:** `http://your-server-ip/health`

### Container Names
- `rent-management-mysql` - Database
- `rent-management-backend` - Laravel API
- `rent-management-frontend` - Next.js Frontend
- `rent-management-nginx` - Web Server

### Important Files
- `docker-compose.yml` - Main compose file
- `docker-compose.prod.yml` - Production overrides
- `docker-compose.dev.yml` - Development overrides

---

## Getting Help

If you encounter issues:

1. **Check Portainer Logs:**
   - Container logs show detailed error messages
   - Stack logs show deployment issues

2. **Verify Configuration:**
   - All environment variables are set
   - Ports are not conflicting
   - Docker has sufficient resources

3. **Community Resources:**
   - [Portainer Documentation](https://docs.portainer.io/)
   - [Portainer Community](https://github.com/portainer/portainer/discussions)
   - [Docker Documentation](https://docs.docker.com/)

4. **Common Commands:**
   ```bash
   # View running containers
   docker ps
   
   # View all containers
   docker ps -a
   
   # View logs
   docker logs rent-management-backend
   
   # Check Docker status
   docker info
   ```

---

## Next Steps

After successful deployment:

1. ✅ Set up SSL/HTTPS for production
2. ✅ Configure domain name
3. ✅ Set up automated backups
4. ✅ Configure monitoring
5. ✅ Review security settings
6. ✅ Set up CI/CD pipeline (optional)

---

**Congratulations!** 🎉 You've successfully deployed your Rent Management System using Portainer!

For more advanced configuration, see:
- [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) - Advanced Docker deployment
- [ENVIRONMENT_SWITCHING.md](ENVIRONMENT_SWITCHING.md) - Dev/Prod switching

