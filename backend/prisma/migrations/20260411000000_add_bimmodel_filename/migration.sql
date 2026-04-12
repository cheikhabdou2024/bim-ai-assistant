-- Sprint 4: Add fileName to BIMModel for UI display
-- Idempotent: IF NOT EXISTS prevents re-run errors on ECS restart
ALTER TABLE "bim_models" ADD COLUMN IF NOT EXISTS "fileName" VARCHAR(255);
