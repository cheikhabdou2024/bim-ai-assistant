#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrations..."

# First attempt — apply all pending migrations
if npx prisma migrate deploy; then
  echo "[entrypoint] Migrations applied successfully."
else
  echo "[entrypoint] Baseline mode — marking existing migrations as applied..."
  # Sprint 1 tables already exist on RDS (created via db push before migrate).
  npx prisma migrate resolve --applied "20260405000000_init"         || true
  # Sprint 2 (projects + bim_models) — may already exist
  npx prisma migrate resolve --applied "20260405000001_add_projects" || true
  # Sprint 3 (conversations + messages + bim_models nullable cols)
  npx prisma migrate resolve --applied "20260410000000_add_ai_chat"  || true
  # Apply any remaining pending migrations (Sprint 4+)
  npx prisma migrate deploy
  echo "[entrypoint] Baseline complete — all pending migrations applied."
fi

echo "[entrypoint] Starting application..."
exec node dist/main
