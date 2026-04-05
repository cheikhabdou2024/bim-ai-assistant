#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrations..."

# First attempt — apply all pending migrations
if npx prisma migrate deploy; then
  echo "[entrypoint] Migrations applied successfully."
else
  echo "[entrypoint] Initial deploy failed — baselining Sprint 1 schema..."
  # Sprint 1 tables already exist on RDS (created via db push).
  # Mark the init migration as already applied so migrate deploy skips it.
  npx prisma migrate resolve --applied "20260405000000_init"
  # Now apply Sprint 2 migration only
  npx prisma migrate deploy
  echo "[entrypoint] Baseline + Sprint 2 migration applied."
fi

echo "[entrypoint] Starting application..."
exec node dist/main
