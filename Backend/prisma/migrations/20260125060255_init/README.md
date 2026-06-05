# Migration: 20260125060255_init (Second Init)

## Why this exists

This migration is a safety re-baseline that re-runs the original DDL from
`20250101000000_init` with `IF NOT EXISTS` guards on every statement.

It was added after a migration history reset event where some environments had the
`Collection` table already present but no entry in the `_prisma_migrations` tracking
table. The `IF NOT EXISTS` guards make it idempotent — running it against a DB that
already has the table is a no-op.

## Is it safe?

Yes. Every `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` statement in
this migration is a no-op if the object already exists. It will never drop or alter
existing data.

## Why it appears twice in migration history

Both `20250101000000_init` and this migration appear in `_prisma_migrations`. This is
expected and intentional. Prisma records each migration file as a separate entry. The
second entry shows as "applied" even if all its statements were no-ops.
