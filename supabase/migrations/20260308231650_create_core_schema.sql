-- Migration: create_core_schema
-- Story 1.2: Database Schema, RLS Policies & Voice Storage Bucket
-- Creates all core tables, ENUM types, foreign keys, and indexes

-- ============================================================================
-- ENUM TYPES (must be created before tables that reference them)
-- ============================================================================

CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'worker');
CREATE TYPE attendance_status AS ENUM ('pending', 'approved', 'rejected', 'imported');
CREATE TYPE audit_action AS ENUM ('approve', 'edit', 'reject', 'resolve', 'assign', 'reassign', 'create', 'archive');

-- ============================================================================
-- TABLES
-- ============================================================================

-- profiles: linked to Supabase Auth users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'worker',
  language_pref TEXT NOT NULL DEFAULT 'he' CHECK (language_pref IN ('he', 'th', 'en')),
  hourly_rate NUMERIC(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- crops: olive, almond, field crops, etc.
CREATE TABLE crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- areas: farm fields/sections linked to a crop
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID NOT NULL REFERENCES crops(id),
  name TEXT NOT NULL,
  photo_url TEXT,
  polygon_coordinates JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crop_id, name)
);

-- area_aliases: informal names for areas used in voice notes (FR13)
CREATE TABLE area_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (area_id, alias)
);

-- equipment: farm equipment entries (FR12)
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- tasks: task assignments for workers
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES areas(id),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- attendance_logs: the canonical attendance table (public.attendance_logs)
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  area_id UUID REFERENCES areas(id),
  work_date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_hours NUMERIC(4, 1),
  status attendance_status NOT NULL DEFAULT 'pending',
  telegram_message_id BIGINT UNIQUE,
  voice_ref_url TEXT,
  source TEXT NOT NULL DEFAULT 'bot' CHECK (source IN ('bot', 'manual', 'sheets_import')),
  raw_transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- audit_log: immutable audit trail for all record mutations
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES profiles(id),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action audit_action NOT NULL,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_attendance_logs_profile_id ON attendance_logs(profile_id);
CREATE INDEX idx_attendance_logs_work_date ON attendance_logs(work_date);
CREATE INDEX idx_attendance_logs_status ON attendance_logs(status);
-- telegram_message_id already has a UNIQUE constraint which creates an implicit unique index

CREATE INDEX idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX idx_audit_log_actor_id ON audit_log(actor_id);

CREATE INDEX idx_areas_crop_id ON areas(crop_id);
CREATE INDEX idx_area_aliases_area_id ON area_aliases(area_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_area_id ON tasks(area_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Trigger function: sets updated_at = now() before any UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_attendance_logs_updated_at
  BEFORE UPDATE ON attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
