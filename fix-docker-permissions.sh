#!/bin/bash
# Script to fix permissions for files created by Docker
# Run this script from the project root after running artisan commands

echo "Fixing permissions for Docker-created files..."

# Get current user ID and group ID
USER_ID=$(id -u)
GROUP_ID=$(id -g)

echo "Using UID: $USER_ID, GID: $GROUP_ID"

FIXED_COUNT=0

# Fix ownership for backend files commonly created by artisan
if [ -d "backend" ]; then
    echo "Fixing backend permissions..."
    
    # Fix app directory (controllers, commands, models, etc.)
    if [ -d "backend/app" ]; then
        while IFS= read -r file; do
            if [ -n "$file" ]; then
                chown $USER_ID:$GROUP_ID "$file" 2>/dev/null && ((FIXED_COUNT++))
            fi
        done < <(find backend/app -user root -type f 2>/dev/null)
    fi
    
    # Fix config directory
    if [ -d "backend/config" ]; then
        while IFS= read -r file; do
            if [ -n "$file" ]; then
                chown $USER_ID:$GROUP_ID "$file" 2>/dev/null && ((FIXED_COUNT++))
            fi
        done < <(find backend/config -user root -type f 2>/dev/null)
    fi
    
    # Fix database directory (migrations)
    if [ -d "backend/database" ]; then
        while IFS= read -r file; do
            if [ -n "$file" ]; then
                chown $USER_ID:$GROUP_ID "$file" 2>/dev/null && ((FIXED_COUNT++))
            fi
        done < <(find backend/database -user root -type f 2>/dev/null)
    fi
    
    # Fix routes directory
    if [ -d "backend/routes" ]; then
        while IFS= read -r file; do
            if [ -n "$file" ]; then
                chown $USER_ID:$GROUP_ID "$file" 2>/dev/null && ((FIXED_COUNT++))
            fi
        done < <(find backend/routes -user root -type f 2>/dev/null)
    fi
    
    # Fix artisan file if owned by root
    if [ -f "backend/artisan" ] && [ "$(stat -c '%u' backend/artisan 2>/dev/null)" = "0" ]; then
        chown $USER_ID:$GROUP_ID backend/artisan 2>/dev/null && ((FIXED_COUNT++))
    fi
    
    if [ $FIXED_COUNT -gt 0 ]; then
        echo "Fixed permissions for $FIXED_COUNT file(s)!"
    else
        echo "No files needed permission fixes."
    fi
else
    echo "Backend directory not found!"
fi

echo "Done!"


