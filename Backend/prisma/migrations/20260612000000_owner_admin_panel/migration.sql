-- Owner admin panel schema additions.
-- Adds: Collection.featuredRank (explicit featured ordering), and three new tables:
--   fee_ledger  — derived platform-fee revenue timeline (one row per observed minted delta)
--   admin_user  — real owner-console accounts with roles (replaces the single shared API key)
--   audit_log   — append-only record of every privileged admin action
--
-- All statements are IF NOT EXISTS / idempotent so re-running on a partially-migrated DB is safe.
-- Column casing is quoted camelCase to match the TypeORM entity property names (like "Collection").

-- ── Collection.featuredRank ──────────────────────────────────────────────────
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "featuredRank" INTEGER;
CREATE INDEX IF NOT EXISTS "Collection_featuredRank_idx" ON "Collection"("featuredRank");

-- ── fee_ledger ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "fee_ledger" (
    "id"             TEXT NOT NULL,
    "collectionId"   TEXT NOT NULL,
    "mintAddress"    VARCHAR(44),
    "creatorAddress" VARCHAR(44) NOT NULL,
    "mintedBefore"   INTEGER NOT NULL DEFAULT 0,
    "mintedAfter"    INTEGER NOT NULL DEFAULT 0,
    "mintedDelta"    INTEGER NOT NULL DEFAULT 0,
    "pricePerMint"   NUMERIC(18, 9),
    "platformFeeBps" INTEGER,
    "feeRevenue"     NUMERIC(18, 9) NOT NULL DEFAULT 0,
    "isBaseline"     BOOLEAN NOT NULL DEFAULT false,
    "recordedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_ledger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "fee_ledger_collectionId_idx"   ON "fee_ledger"("collectionId");
CREATE INDEX IF NOT EXISTS "fee_ledger_creatorAddress_idx" ON "fee_ledger"("creatorAddress");
CREATE INDEX IF NOT EXISTS "fee_ledger_recordedAt_idx"     ON "fee_ledger"("recordedAt");
CREATE INDEX IF NOT EXISTS "fee_ledger_isBaseline_idx"     ON "fee_ledger"("isBaseline");

-- ── admin_user ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "admin_user" (
    "id"           TEXT NOT NULL,
    "email"        TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName"  TEXT NOT NULL,
    "role"         TEXT NOT NULL DEFAULT 'read_only',
    "disabled"     BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt"  TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "admin_user_email_key" ON "admin_user"("email");

-- ── audit_log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "audit_log" (
    "id"          TEXT NOT NULL,
    "actorId"     TEXT,
    "actorEmail"  TEXT,
    "action"      TEXT NOT NULL,
    "targetType"  TEXT,
    "targetId"    TEXT,
    "metadata"    JSONB,
    "txSignature" VARCHAR(88),
    "ip"          TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "audit_log_actorId_idx"   ON "audit_log"("actorId");
CREATE INDEX IF NOT EXISTS "audit_log_action_idx"    ON "audit_log"("action");
CREATE INDEX IF NOT EXISTS "audit_log_createdAt_idx" ON "audit_log"("createdAt");
