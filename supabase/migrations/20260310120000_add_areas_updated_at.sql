-- Migration: add_areas_updated_at
-- Story 3.3: List Health Metrics & Stale List Alert
-- Adds updated_at column + trigger to areas and area_aliases tables
-- Required for stale list detection (FR15)

-- ============================================================================
-- ADD updated_at TO areas
-- ============================================================================

ALTER TABLE areas ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER set_areas_updated_at
  BEFORE UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- ADD updated_at TO area_aliases
-- ============================================================================

ALTER TABLE area_aliases ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER set_area_aliases_updated_at
  BEFORE UPDATE ON area_aliases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
