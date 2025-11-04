# Quick Start - Environment Switching

## 🚀 Fastest Way to Switch Environments

### One Command Switch

**Linux/Mac:**
```bash
make switch-dev    # Switch to development
make switch-prod   # Switch to production
```

**Windows:**
```bash
.\switch-env.ps1 dev   # Switch to development
.\switch-env.ps1 prod  # Switch to production
```

### Check Current Environment

```bash
make env-status
# or
.\switch-env.ps1 status
```

## 📋 Common Commands

### Development
```bash
make dev-up          # Start
make dev-down        # Stop
make dev-rebuild     # Rebuild
make dev-logs        # View logs
```

### Production
```bash
make prod-up         # Start
make prod-down       # Stop
make prod-rebuild    # Rebuild
make prod-logs       # View logs
```

## 🎯 Quick Reference

| What you want | Command |
|---------------|---------|
| Start developing | `make switch-dev` |
| Deploy to production | `make switch-prod` |
| See what's running | `make env-status` |
| View logs | `make logs` |
| Stop everything | `make down` |

## 📖 Full Documentation

For detailed information, see:
- [ENVIRONMENT_SWITCHING.md](ENVIRONMENT_SWITCHING.md) - Complete switching guide
- [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) - Docker deployment details

