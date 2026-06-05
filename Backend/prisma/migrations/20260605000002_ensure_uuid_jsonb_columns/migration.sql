-- C-2: Move startup DDL from main.ts into a proper migration.
-- All of these were previously run via ALTER TABLE in main.ts on every boot,
-- causing AccessExclusiveLock races in multi-instance deployments.

-- Enable UUID generation (requires superuser on managed PostgreSQL — run manually if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure phases and fundReceivers JSONB columns exist (idempotent)
ALTER TABLE "Collection"
  ADD COLUMN IF NOT EXISTS phases jsonb,
  ADD COLUMN IF NOT EXISTS "fundReceivers" jsonb;

-- Ensure UUID default on id column
ALTER TABLE "Collection"
  ALTER COLUMN id SET DEFAULT uuid_generate_v4();
