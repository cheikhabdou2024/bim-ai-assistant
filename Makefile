# BIM AI Assistant — Developer Commands
# Usage: make <target>

.PHONY: help up down logs dev-back dev-front dev-bim \
        install migrate seed test-back test-front test-e2e lint \
        build clean reset \
        tf-init tf-plan tf-apply tf-destroy tf-bootstrap

##@ Help
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} \
	/^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 } \
	/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)

##@ Infrastructure
up: ## Start PostgreSQL + Redis (no BIM service)
	docker compose up -d postgres redis
	@echo "Waiting for services to be healthy..."
	@sleep 3
	@echo "✅ PostgreSQL + Redis ready"

up-bim: ## Start all services including BIM service
	docker compose --profile bim up -d
	@echo "✅ All services started (including BIM service)"

down: ## Stop all Docker services
	docker compose --profile bim down

logs: ## Show logs from all services
	docker compose --profile bim logs -f

logs-db: ## Show PostgreSQL logs
	docker compose logs -f postgres

logs-redis: ## Show Redis logs
	docker compose logs -f redis

##@ Development
dev-back: ## Start backend in watch mode
	cd backend && npm run start:dev

dev-front: ## Start frontend dev server
	cd frontend && npm run dev

dev-bim: ## Start BIM service locally
	cd bim-service && uvicorn main:app --reload --port 8000

##@ Setup
install: ## Install all dependencies (backend + frontend + e2e)
	cd backend && npm install
	cd frontend && npm install
	cd e2e && npm install
	@echo "✅ All dependencies installed"

migrate: ## Run Prisma migrations
	cd backend && npx prisma migrate dev

migrate-deploy: ## Apply migrations (production)
	cd backend && npx prisma migrate deploy

seed: ## Seed the database with test data
	cd backend && npx prisma db seed

reset: ## Reset database (drop + re-migrate + seed) — LOCAL ONLY
	cd backend && npx prisma migrate reset --force

studio: ## Open Prisma Studio
	cd backend && npx prisma studio

##@ Testing
test-back: ## Run backend unit tests
	cd backend && npm run test

test-back-cov: ## Run backend unit tests with coverage
	cd backend && npm run test:cov

test-e2e: ## Run Playwright E2E tests (requires services up + apps running)
	cd e2e && npx playwright test

test-e2e-ui: ## Open Playwright UI mode
	cd e2e && npx playwright test --ui

test-e2e-report: ## Show last Playwright report
	cd e2e && npx playwright show-report

##@ Code Quality
lint: ## Lint all code (backend + frontend)
	cd backend && npm run lint
	cd frontend && npm run lint
	@echo "✅ Lint passed"

##@ Build
build: ## Build backend + frontend for production
	cd backend && npm run build
	cd frontend && npm run build
	@echo "✅ Build complete"

##@ Utilities
clean: ## Remove all node_modules and build artifacts
	rm -rf backend/node_modules backend/dist backend/coverage
	rm -rf frontend/node_modules frontend/dist
	rm -rf e2e/node_modules e2e/playwright-report e2e/test-results
	@echo "✅ Clean complete"

##@ Terraform (Infrastructure AWS)
ENV ?= staging

tf-bootstrap: ## Bootstrap Terraform state (S3 + DynamoDB) — run once
	bash infra/scripts/bootstrap-tfstate.sh

tf-init: ## Initialize Terraform
	cd infra && terraform init

tf-plan: ## Plan infrastructure changes (ENV=staging|production)
	cd infra && terraform plan -var-file=envs/$(ENV).tfvars

tf-apply: ## Apply infrastructure changes (ENV=staging|production)
	cd infra && terraform apply -var-file=envs/$(ENV).tfvars

tf-destroy: ## Destroy infrastructure — DANGER (ENV=staging|production)
	@echo "⚠️  This will DESTROY all $(ENV) infrastructure. Type 'yes' to confirm."
	cd infra && terraform destroy -var-file=envs/$(ENV).tfvars

##@ Utilities
health: ## Check health of all running services
	@echo "--- PostgreSQL ---"
	@docker compose exec postgres pg_isready -U bim_user -d bim_ai 2>/dev/null && echo "✅ PostgreSQL OK" || echo "❌ PostgreSQL not running"
	@echo "--- Redis ---"
	@docker compose exec redis redis-cli ping 2>/dev/null && echo "✅ Redis OK" || echo "❌ Redis not running"
	@echo "--- Backend ---"
	@curl -sf http://localhost:3000/api/health > /dev/null && echo "✅ Backend OK" || echo "❌ Backend not running"
	@echo "--- BIM Service ---"
	@curl -sf http://localhost:8000/health > /dev/null && echo "✅ BIM Service OK" || echo "❌ BIM Service not running (use make up-bim)"
