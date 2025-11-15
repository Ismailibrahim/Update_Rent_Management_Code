# Environment Switching Guide

This guide explains how to easily switch between development and production environments.

## Quick Start

### Using Make Commands (Recommended)

```bash
# Switch to development
make switch-dev

# Switch to production
make switch-prod

# Check current environment
make env-status

# Development commands
make dev-up          # Start development environment
make dev-down        # Stop development environment
make dev-rebuild     # Rebuild development environment
make dev-logs        # View development logs

# Production commands
make prod-up         # Start production environment
make prod-down       # Stop production environment
make prod-rebuild    # Rebuild production environment
make prod-logs       # View production logs
```

### Using Switch Scripts

#### Linux/Mac (Bash)
```bash
# Make script executable
chmod +x switch-env.sh

# Switch to development
./switch-env.sh dev

# Switch to production
./switch-env.sh prod

# Check status
./switch-env.sh status

# Stop all
./switch-env.sh stop
```

#### Windows (PowerShell)
```powershell
# Switch to development
.\switch-env.ps1 dev

# Switch to production
.\switch-env.ps1 prod

# Check status
.\switch-env.ps1 status

# Stop all
.\switch-env.ps1 stop
```

### Using Docker Compose Directly

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Environment Differences

### Development Environment

**Features:**
- ✅ Hot reload enabled (code changes reflect immediately)
- ✅ Debug mode enabled (APP_DEBUG=true)
- ✅ Xdebug installed and configured
- ✅ Volume mounting for live code editing
- ✅ Detailed error messages
- ✅ No caching (faster iteration)
- ✅ Exposed ports (3000, 8000, 3306)

**Configuration:**
- Uses `docker-compose.dev.yml`
- Uses development Dockerfiles (Dockerfile.dev)
- Mounts source code as volumes
- Development Nginx config (no caching)

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Nginx Proxy: http://localhost
- Database: localhost:3306

### Production Environment

**Features:**
- ✅ Optimized builds (minified, compressed)
- ✅ Caching enabled (config, routes, views)
- ✅ Security hardening
- ✅ Resource limits configured
- ✅ Health checks enabled
- ✅ Production error handling
- ✅ No exposed ports (internal only)

**Configuration:**
- Uses `docker-compose.prod.yml`
- Uses production Dockerfiles
- Compiled and optimized builds
- Production Nginx config (caching enabled)

**Access:**
- All services accessible via Nginx only (port 80/443)
- Internal networking for services
- Production-ready security headers

## Environment Variables

### Development (.env)
```env
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000/api
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:3000,127.0.0.1:3000
```

### Production (.env)
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com
```

## Switching Workflow

### From Development to Production

1. **Commit your changes**
   ```bash
   git add .
   git commit -m "Ready for production"
   ```

2. **Switch environment**
   ```bash
   make switch-prod
   # or
   ./switch-env.sh prod
   ```

3. **Update environment variables** (if needed)
   - Edit `.env` file
   - Update `APP_URL`, `NEXT_PUBLIC_API_URL`, etc.

4. **Rebuild** (if code changed)
   ```bash
   make prod-rebuild
   ```

### From Production to Development

1. **Switch environment**
   ```bash
   make switch-dev
   # or
   ./switch-env.sh dev
   ```

2. **Development starts automatically with:**
   - Hot reload enabled
   - Debug mode on
   - All ports exposed

## Troubleshooting

### Containers not switching

If containers don't stop/start properly:

```bash
# Force stop all
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
docker-compose down

# Then start desired environment
make switch-dev  # or make switch-prod
```

### Port conflicts

If ports are already in use:

```bash
# Check what's using the ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :8000

# Or on Windows
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Stop conflicting services or change ports in docker-compose files
```

### Environment not detected

The system uses `.env.current` file to track current environment. If missing:

```bash
# Manually set
echo "dev" > .env.current  # or "prod"
```

## Best Practices

1. **Always switch environments** instead of manually stopping/starting
   - Ensures clean state
   - Prevents conflicts

2. **Check status before switching**
   ```bash
   make env-status
   ```

3. **Rebuild after switching** if you made code changes
   ```bash
   make dev-rebuild  # or make prod-rebuild
   ```

4. **Use environment-specific env files**
   - `.env.development` for dev
   - `.env.production` for prod
   - Or use the same `.env` and update values

5. **Stop containers before switching** (handled automatically by scripts)
   - Prevents port conflicts
   - Ensures clean state

## Additional Commands

### View logs for current environment
```bash
make logs              # All services
make logs-backend      # Backend only
make logs-frontend     # Frontend only
```

### Execute commands in containers
```bash
make shell-backend     # Backend shell
make shell-frontend    # Frontend shell
make shell-mysql       # MySQL shell
```

### Database operations
```bash
make migrate           # Run migrations
make migrate-fresh     # Fresh migrations
make seed              # Seed database
```

### Cache management
```bash
make cache-clear       # Clear all caches (dev)
make cache-optimize    # Optimize caches (prod)
```

## Quick Reference

| Task | Development | Production |
|------|-------------|------------|
| Start | `make dev-up` | `make prod-up` |
| Stop | `make dev-down` | `make prod-down` |
| Rebuild | `make dev-rebuild` | `make prod-rebuild` |
| Logs | `make dev-logs` | `make prod-logs` |
| Switch | `make switch-dev` | `make switch-prod` |
| Status | `make env-status` | `make env-status` |

