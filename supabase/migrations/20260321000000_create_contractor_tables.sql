-- Migration: create_contractor_tables
-- Meshek V2: Contractor Work Features
-- Creates new tables: clients, client_aliases, work_types, materials, work_log_materials

-- ============================================================================
-- CLIENTS — external contractor clients + own-farm record
-- ============================================================================

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  is_own_farm BOOLEAN NOT NULL DEFAULT false,
  phone TEXT,
  notes TEXT,
  rate_per_dunam NUMERIC(10, 2),
  rate_per_hour NUMERIC(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one row can have is_own_farm = true
CREATE UNIQUE INDEX idx_clients_single_own_farm ON clients (is_own_farm) WHERE is_own_farm = true;

-- ============================================================================
-- CLIENT_ALIASES — informal names for clients (voice note matching)
-- ============================================================================

CREATE TABLE client_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, alias)
);

CREATE INDEX idx_client_aliases_client_id ON client_aliases(client_id);

-- ============================================================================
-- WORK_TYPES — agricultural task types (spraying, tillage, harvest, etc.)
-- ============================================================================

CREATE TABLE work_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_he TEXT NOT NULL,
  name_en TEXT,
  name_th TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- MATERIALS — agricultural inputs (seeds, chemicals, fertilizers)
-- ============================================================================

CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_he TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  default_unit TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- WORK_LOG_MATERIALS — join table linking attendance_logs to materials used
-- ============================================================================

CREATE TABLE work_log_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_log_id UUID NOT NULL REFERENCES attendance_logs(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id),
  quantity NUMERIC(10, 2),
  unit TEXT,
  notes TEXT
);

CREATE INDEX idx_work_log_materials_attendance_log_id ON work_log_materials(attendance_log_id);
CREATE INDEX idx_work_log_materials_material_id ON work_log_materials(material_id);
