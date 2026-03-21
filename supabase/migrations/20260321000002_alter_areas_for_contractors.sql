-- Migration: alter_areas_for_contractors
-- Adds client hierarchy to areas table: client_id FK, is_own_field flag, total_area_dunam

-- Add columns with defaults so existing rows get backfilled automatically
ALTER TABLE areas
  ADD COLUMN client_id UUID REFERENCES clients(id)
    DEFAULT '00000000-0000-4000-a000-000000000001',
  ADD COLUMN is_own_field BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN total_area_dunam NUMERIC(10, 2);

-- Backfill any rows that might have NULL (defensive — DEFAULT should handle it)
UPDATE areas SET client_id = '00000000-0000-4000-a000-000000000001' WHERE client_id IS NULL;

-- Now enforce NOT NULL
ALTER TABLE areas ALTER COLUMN client_id SET NOT NULL;

-- Index for client-based queries
CREATE INDEX idx_areas_client_id ON areas(client_id);
