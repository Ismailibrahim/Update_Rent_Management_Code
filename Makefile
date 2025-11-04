.PHONY: help build up down restart logs clean migrate seed test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## Build all Docker images
	docker-compose build

up: ## Start all containers
	docker-compose up -d

down: ## Stop all containers
	docker-compose down

restart: ## Restart all containers
	docker-compose restart

logs: ## View logs from all containers
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

logs-nginx: ## View nginx logs
	docker-compose logs -f nginx

logs-mysql: ## View MySQL logs
	docker-compose logs -f mysql

migrate: ## Run database migrations
	docker-compose exec backend php artisan migrate

migrate-fresh: ## Drop all tables and re-run migrations
	docker-compose exec backend php artisan migrate:fresh

seed: ## Seed the database
	docker-compose exec backend php artisan db:seed

cache-clear: ## Clear all caches
	docker-compose exec backend php artisan config:clear
	docker-compose exec backend php artisan route:clear
	docker-compose exec backend php artisan view:clear
	docker-compose exec backend php artisan cache:clear

cache-optimize: ## Optimize application caches
	docker-compose exec backend php artisan config:cache
	docker-compose exec backend php artisan route:cache
	docker-compose exec backend php artisan view:cache

shell-backend: ## Access backend container shell
	docker-compose exec backend sh

shell-frontend: ## Access frontend container shell
	docker-compose exec frontend sh

shell-mysql: ## Access MySQL shell
	docker-compose exec mysql mysql -u root -p

test: ## Run tests
	docker-compose exec backend php artisan test

clean: ## Remove all containers, volumes, and images
	docker-compose down -v --rmi all

rebuild: ## Rebuild and restart all containers
	docker-compose up -d --build

health: ## Check health of all services
	@echo "Checking service health..."
	@docker-compose ps
	@echo ""
	@echo "Testing endpoints..."
	@curl -s http://localhost/health || echo "Nginx health check failed"
	@curl -s http://localhost/api/health || echo "Backend health check failed"

backup-db: ## Backup database
	docker-compose exec mysql mysqldump -u root -p${DB_ROOT_PASSWORD} ${DB_DATABASE} > backup-$(shell date +%Y%m%d-%H%M%S).sql

# Environment Switching
dev-up: ## Start development environment (with hot reload, debugging)
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo "Development environment started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend API: http://localhost:8000/api"
	@echo "Nginx: http://localhost"

dev-down: ## Stop development environment
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

dev-rebuild: ## Rebuild development environment
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

dev-logs: ## View development logs
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

prod-up: ## Start production setup with resource limits
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "Production environment started!"

prod-down: ## Stop production setup
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

prod-rebuild: ## Rebuild production environment
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

prod-logs: ## View production logs
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Switch between environments
switch-dev: ## Switch to development environment (stops current, starts dev)
	@echo "Switching to development environment..."
	@docker-compose -f docker-compose.yml -f docker-compose.prod.yml down 2>/dev/null || true
	@docker-compose down 2>/dev/null || true
	@make dev-up

switch-prod: ## Switch to production environment (stops current, starts prod)
	@echo "Switching to production environment..."
	@docker-compose -f docker-compose.yml -f docker-compose.dev.yml down 2>/dev/null || true
	@docker-compose down 2>/dev/null || true
	@make prod-up

env-status: ## Show current environment status
	@echo "Current Docker containers status:"
	@docker-compose ps 2>/dev/null || echo "No active containers"
	@echo ""
	@if docker-compose ps 2>/dev/null | grep -q "rent-management"; then \
		if docker-compose ps | grep -q "development\|dev"; then \
			echo "Environment: DEVELOPMENT"; \
		else \
			echo "Environment: PRODUCTION"; \
		fi \
	else \
		echo "Environment: NOT RUNNING"; \
	fi

