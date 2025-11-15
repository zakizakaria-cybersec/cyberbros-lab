.PHONY: help install dev up down clean test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

install: ## Install all dependencies
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

dev: ## Start development environment with Docker Compose
	docker-compose up -d

up: dev ## Alias for dev

down: ## Stop development environment
	docker-compose down

clean: ## Clean up all containers, volumes, and temporary files
	docker-compose down -v
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf backend/*.db backend/*.sqlite* 2>/dev/null || true
	rm -rf frontend/.next frontend/node_modules 2>/dev/null || true

test-backend: ## Run backend tests
	cd backend && export CLOUD_PROVIDER=mock && export JWT_SECRET=test && export DATABASE_URL=sqlite:///./test.db && python -m pytest

logs: ## Show logs from all services
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

restart: ## Restart all services
	docker-compose restart

migrate: ## Run database migrations
	cd backend && alembic upgrade head

shell-backend: ## Open shell in backend container
	docker-compose exec backend /bin/bash

shell-db: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U postgres -d cyberbros

format: ## Format code
	cd backend && black src/
	cd frontend && npm run lint --fix 2>/dev/null || true

setup: install ## Complete setup (install + migrate)
	@echo "Setting up environment..."
	cp -n .env.example .env || true
	@echo "Setup complete! Edit .env and run 'make dev'"
