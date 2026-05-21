.PHONY: dev build start lint test test-watch test-coverage typecheck gen-types \
       supabase-start supabase-stop supabase-status supabase-migrate supabase-reset \
       vercel-dev vercel-deploy vercel-env-pull \
       setup clean check

# --- Development ---

dev: ## Start Next.js dev server
	bun run dev

build: ## Production build
	bun run build

start: ## Run production server
	bun run start

# --- Quality ---

lint: ## Run ESLint
	bun run lint

typecheck: ## TypeScript type check
	bunx tsc --noEmit

test: ## Run tests
	bun run test

test-watch: ## Run tests in watch mode
	bun run test:watch

test-coverage: ## Run tests with coverage report
	bun run test:coverage

check: lint typecheck test build ## Run all checks (lint, typecheck, test, build)

# --- Supabase ---

supabase-start: ## Start local Supabase stack (requires Docker)
	bunx supabase start

supabase-stop: ## Stop local Supabase stack
	bunx supabase stop

supabase-status: ## Show local Supabase status
	bunx supabase status

supabase-migrate: ## Apply migrations to local Supabase
	bunx supabase db push

supabase-reset: ## Reset local database and re-apply migrations
	bunx supabase db reset

gen-types: ## Regenerate TypeScript types from local Supabase schema
	bun run gen:types

# --- Vercel ---

vercel-dev: ## Start Vercel dev server (with env vars from Vercel project)
	bunx vercel dev

vercel-deploy: ## Deploy to Vercel preview
	bunx vercel

vercel-deploy-prod: ## Deploy to Vercel production
	bunx vercel --prod

vercel-env-pull: ## Pull env vars from Vercel project to .env.local
	bunx vercel env pull .env.local

# --- Setup ---

setup: ## Initial project setup
	bun install
	@echo ""
	@echo "Next steps:"
	@echo "  1. Copy .env.local.example to .env.local and fill in Supabase credentials"
	@echo "  2. Run 'make supabase-start' for local dev (requires Docker)"
	@echo "  3. Run 'make supabase-migrate' to apply DB migrations"
	@echo "  4. Run 'make dev' to start the dev server"

clean: ## Remove build artifacts
	rm -rf .next out node_modules

# --- Help ---

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
