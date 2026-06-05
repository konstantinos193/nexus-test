-- M1: Enforce fixed-length constraints for Solana on-chain identifiers.
-- Solana wallet addresses (base58) are always 44 chars.
-- Solana transaction signatures (base58) are always 88 chars.
-- Enforcing at the DB layer prevents truncation or oversized garbage from being stored.
ALTER TABLE "Collection"
  ALTER COLUMN "creatorAddress" TYPE VARCHAR(44),
  ALTER COLUMN "mintAddress"    TYPE VARCHAR(44),
  ALTER COLUMN "txSignature"    TYPE VARCHAR(88);
