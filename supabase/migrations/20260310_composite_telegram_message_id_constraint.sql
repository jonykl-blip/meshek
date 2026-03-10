-- Migration: composite_telegram_message_id_constraint
-- Story 2-6 Task 6.3: Fix multi-worker duplicate detection collision
--
-- Problem: telegram_message_id has a UNIQUE constraint, but multi-worker voice notes
-- produce N items all sharing the same telegram_message_id. The upsert
-- (on_conflict=telegram_message_id) causes each subsequent worker to overwrite
-- the previous one — only the last worker survives.
--
-- Fix: Change to a composite unique constraint (telegram_message_id, profile_id).
-- This allows multiple workers from the same message (different profile_ids) while
-- still preventing true duplicates (same message re-processed for the same worker).
--
-- For unmatched workers (NULL profile_id), PostgreSQL's default NULLS DISTINCT
-- behavior means (123, NULL) never conflicts with (123, NULL), so no dedup occurs.
-- This is acceptable because unmatched workers go through admin review anyway.
--
-- The Handle Callback Query node uses WHERE telegram_message_id=eq.X to batch
-- confirm/reject all workers from a message — this still works via the non-unique
-- index on telegram_message_id.

-- Step 1: Drop the existing UNIQUE constraint on telegram_message_id alone
-- The UNIQUE constraint creates an implicit index, so we drop the constraint
ALTER TABLE attendance_logs DROP CONSTRAINT IF EXISTS attendance_logs_telegram_message_id_key;

-- Step 2: Create composite unique constraint for dedup
-- (telegram_message_id, profile_id) allows multi-worker inserts from same message
CREATE UNIQUE INDEX idx_attendance_logs_telegram_profile
  ON attendance_logs (telegram_message_id, profile_id);

-- Step 3: Keep a non-unique index on telegram_message_id for query performance
-- (Handle Callback Query uses WHERE telegram_message_id=eq.X)
-- The old UNIQUE constraint's implicit index is gone, so recreate as non-unique
CREATE INDEX IF NOT EXISTS idx_attendance_logs_telegram_message_id
  ON attendance_logs (telegram_message_id);
