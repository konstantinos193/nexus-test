# Migrations

Source of truth for all schema changes. Applied with `prisma migrate deploy`.

## Out-of-band indexes

Several indexes cannot be expressed in the Prisma schema DSL (partial predicates,
GIN operator classes) and exist only in migration SQL. They are listed here so
`prisma/schema.prisma` readers aren't misled about the full index set.

| Index name | Migration | Type | Predicate / Notes |
|---|---|---|---|
| `idx_collection_ending_soon` | `20260605000012` | B-tree on `endDate ASC` | `WHERE endDate IS NOT NULL AND deletedAt IS NULL` |
| `idx_collection_free_mint` | `20260605000004` | B-tree on `price` | `WHERE price = 0 OR price IS NULL` |
| `idx_collection_mint_address_partial` | `20260605000008` | B-tree on `mintAddress` | `WHERE mintAddress IS NOT NULL` |
| `idx_collection_deletedAt_partial` | `20260605000007` | B-tree on `deletedAt` | `WHERE deletedAt IS NULL` |
| `idx_collection_name_trgm` | `20260605000003` | GIN (pg_trgm) on `name` | For `ILIKE '%term%'` search |
| `idx_collection_description_trgm` | `20260605000003` | GIN (pg_trgm) on `description` | For `ILIKE '%term%'` search |
| `idx_collection_creator_name_unique` | `20260605000005` | Unique B-tree on `(creatorAddress, name)` | Prevents duplicate names per wallet |
| `idx_collection_created_at_id_desc` | `20260605000009` | B-tree on `(createdAt DESC, id DESC)` | Cursor-based pagination support |

## Constraints not in Prisma DSL

| Constraint | Migration | Rule |
|---|---|---|
| `chk_status_valid` | `20260605000001` | `status IN ('draft','preparing','ready','minting','completed','paused')` |
| `chk_phases_is_array` | `20260605000005` | `phases IS NULL OR jsonb_typeof(phases) = 'array'` |
| `chk_fund_receivers_is_array` | `20260605000005` | `fundReceivers IS NULL OR jsonb_typeof(fundReceivers) = 'array'` |
| `chk_traits_is_array` | `20260605000010` | `traits IS NULL OR jsonb_typeof(traits) = 'array'` |
| `chk_blockchain_valid` | `20260605000011` | `blockchain IN ('solana')` |
