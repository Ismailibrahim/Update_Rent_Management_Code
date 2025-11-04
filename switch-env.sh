#!/bin/bash

# Environment switching script for Rent Management System
# Usage: ./switch-env.sh [dev|prod|status]

set -e

ENV_FILE=".env.current"
COMPOSE_BASE="docker-compose.yml"
COMPOSE_DEV="docker-compose.dev.yml"
COMPOSE_PROD="docker-compose.prod.yml"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to stop all containers
stop_all() {
    echo -e "${YELLOW}Stopping all containers...${NC}"
    docker-compose -f $COMPOSE_BASE -f $COMPOSE_DEV down 2>/dev/null || true
    docker-compose -f $COMPOSE_BASE -f $COMPOSE_PROD down 2>/dev/null || true
    docker-compose -f $COMPOSE_BASE down 2>/dev/null || true
}

# Function to start development environment
start_dev() {
    echo -e "${GREEN}Starting DEVELOPMENT environment...${NC}"
    stop_all
    echo "dev" > $ENV_FILE
    docker-compose -f $COMPOSE_BASE -f $COMPOSE_DEV up -d --build
    echo -e "${GREEN}✓ Development environment started!${NC}"
    echo -e "  Frontend: ${GREEN}http://localhost:3000${NC}"
    echo -e "  Backend API: ${GREEN}http://localhost:8000/api${NC}"
    echo -e "  Nginx: ${GREEN}http://localhost${NC}"
}

# Function to start production environment
start_prod() {
    echo -e "${GREEN}Starting PRODUCTION environment...${NC}"
    stop_all
    echo "prod" > $ENV_FILE
    docker-compose -f $COMPOSE_BASE -f $COMPOSE_PROD up -d --build
    echo -e "${GREEN}✓ Production environment started!${NC}"
}

# Function to show current status
show_status() {
    if [ -f "$ENV_FILE" ]; then
        CURRENT_ENV=$(cat $ENV_FILE)
        echo -e "Current environment: ${GREEN}$CURRENT_ENV${NC}"
    else
        echo -e "Current environment: ${YELLOW}Unknown${NC}"
    fi
    
    echo ""
    echo "Container status:"
    docker-compose ps 2>/dev/null || echo "No active containers"
}

# Function to show help
show_help() {
    echo "Environment Switcher for Rent Management System"
    echo ""
    echo "Usage: ./switch-env.sh [command]"
    echo ""
    echo "Commands:"
    echo "  dev     - Start development environment"
    echo "  prod    - Start production environment"
    echo "  status  - Show current environment status"
    echo "  stop    - Stop all containers"
    echo "  help    - Show this help message"
    echo ""
}

# Main script logic
case "${1:-help}" in
    dev|development)
        start_dev
        ;;
    prod|production)
        start_prod
        ;;
    status)
        show_status
        ;;
    stop)
        stop_all
        echo -e "${GREEN}All containers stopped.${NC}"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

