-- SUGGESTION-1: Per-table autovacuum tuning for the Collection table.
--
-- The effectiveStatus cron reconciliation pass (EVERY_5_MINUTES) updates active
-- collection rows on a regular schedule, generating dead tuples. PostgreSQL's default
-- autovacuum threshold (autovacuum_vacuum_scale_factor = 0.2) waits until 20% of the
-- table is dead before vacuuming — too late for a table with frequent small updates.
--
-- These settings trigger vacuum after 1% dead tuples and analyze after 0.5% changes,
-- keeping the table lean and query planner statistics fresh.
ALTER TABLE "Collection" SET (
  autovacuum_vacuum_scale_factor   = 0.01,
  autovacuum_analyze_scale_factor  = 0.005,
  autovacuum_vacuum_cost_delay     = 10
);
