-- Migration: allow_web_app_attendance
-- Adds request_id UUID for web-app deduplication and allows 'web-app' as a source value.

-- ============================================================================
-- 1. Add 'web-app' to the source CHECK constraint on attendance_logs
--    The original constraint is an inline CHECK — PostgreSQL doesn't name
--    inline CHECK constraints by default, so we drop and recreate the column
--    default + add a named constraint instead.
-- ============================================================================

-- Drop the existing unnamed CHECK constraint on source and add a named one
-- that includes 'web-app'.
ALTER TABLE attendance_logs DROP CONSTRAINT IF EXISTS attendance_logs_source_check;

ALTER TABLE attendance_logs
  ADD CONSTRAINT attendance_logs_source_check
  CHECK (source IN ('bot', 'manual', 'sheets_import', 'web-app'));

-- ============================================================================
-- 2. Add request_id column for web-app deduplication
--    Nullable so existing rows (bot, manual, sheets_import) are unaffected.
--    PostgreSQL allows multiple NULLs in a UNIQUE constraint by design.
-- ============================================================================

ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS request_id UUID;

COMMENT ON COLUMN attendance_logs.request_id IS
  'Client-generated UUID used by the web-app voice recording pipeline to '
  'prevent duplicate inserts on retry. NULL for bot / manual / import records.';

-- ============================================================================
-- 3. Unique constraint on request_id (NULLs are excluded from uniqueness check
--    in PostgreSQL, so multiple NULL rows are allowed)
-- ============================================================================

ALTER TABLE attendance_logs
  ADD CONSTRAINT attendance_logs_request_id_key UNIQUE (request_id);

-- ============================================================================
-- 4. Index on request_id for fast deduplication lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_attendance_logs_request_id
  ON attendance_logs (request_id)
  WHERE request_id IS NOT NULL;
