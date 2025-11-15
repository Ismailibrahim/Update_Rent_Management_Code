#!/bin/bash

# Deployment Validation Script

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  DEPLOYMENT VALIDATION"
echo "=========================================="
echo

ERRORS=0

check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✅ $1 found${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 not found${NC}"
        return 1
    fi
}

echo "Checking prerequisites..."
check_command php || ((ERRORS++))
check_command node || ((ERRORS++))
check_command composer || echo -e "${YELLOW}⚠️  Composer not found (will use vendor/bin/composer)${NC}"
check_command npm || ((ERRORS++))

echo
echo "Checking project structure..."
[ -d "quotation-system" ] && echo -e "${GREEN}✅ Backend directory found${NC}" || { echo -e "${RED}❌ Backend directory missing${NC}"; ((ERRORS++)); }
[ -d "quotation-frontend" ] && echo -e "${GREEN}✅ Frontend directory found${NC}" || { echo -e "${RED}❌ Frontend directory missing${NC}"; ((ERRORS++)); }

echo
echo "Checking configuration files..."
[ -f "DEPLOY.sh" ] && echo -e "${GREEN}✅ Deployment script found${NC}" || { echo -e "${RED}❌ DEPLOY.sh missing${NC}"; ((ERRORS++)); }
[ -f "quotation-system/env.production.example" ] && echo -e "${GREEN}✅ Backend env template found${NC}" || echo -e "${YELLOW}⚠️  Backend env template missing${NC}"

echo
if [ $ERRORS -eq 0 ]; then
    echo "=========================================="
    echo -e "  ${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo "  Ready to deploy!"
    echo "=========================================="
    echo
    echo "Run: ./DEPLOY.sh"
    exit 0
else
    echo "=========================================="
    echo -e "  ${RED}❌ $ERRORS ERRORS FOUND${NC}"
    echo "  Please fix issues before deploying"
    echo "=========================================="
    exit 1
fi

