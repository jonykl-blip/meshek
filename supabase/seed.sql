-- Seed data for local development
-- Story 1.2: Provides sample data for all core tables
-- Run via: supabase db reset (applies migrations then seed)

-- ============================================================================
-- AUTH USERS (required before profiles, since profiles references auth.users)
-- ============================================================================
-- Supabase local dev provides test auth users via the dashboard.
-- We create auth users here for seeding convenience.

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token)
VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'idan@meshek.dev', crypt('password123', gen_salt('bf')), now(), now(), now(), '', ''),
  ('a1b2c3d4-0002-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sigal@meshek.dev', crypt('password123', gen_salt('bf')), now(), now(), now(), '', ''),
  ('a1b2c3d4-0003-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'david@meshek.dev', crypt('password123', gen_salt('bf')), now(), now(), now(), '', ''),
  ('a1b2c3d4-0004-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'somchai@meshek.dev', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '');

-- ============================================================================
-- PROFILES (all four roles)
-- ============================================================================

INSERT INTO profiles (id, telegram_id, full_name, role, language_pref, hourly_rate, is_active)
VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', NULL, 'Idan', 'owner', 'he', NULL, true),
  ('a1b2c3d4-0002-4000-8000-000000000002', NULL, 'Sigal', 'admin', 'he', NULL, true),
  ('a1b2c3d4-0003-4000-8000-000000000003', NULL, 'David', 'manager', 'he', NULL, true),
  ('a1b2c3d4-0004-4000-8000-000000000004', '123456789', 'Somchai', 'worker', 'th', 45.00, true);

-- ============================================================================
-- CROPS
-- ============================================================================

INSERT INTO crops (id, name)
VALUES
  ('c0000000-0001-4000-8000-000000000001', 'Olives'),
  ('c0000000-0002-4000-8000-000000000002', 'Almonds'),
  ('c0000000-0003-4000-8000-000000000003', 'Field Crops');

-- ============================================================================
-- AREAS (linked to crops)
-- ============================================================================

INSERT INTO areas (id, crop_id, name, is_active)
VALUES
  ('d0000000-0001-4000-8000-000000000001', 'c0000000-0001-4000-8000-000000000001', 'Olive Grove North', true),
  ('d0000000-0002-4000-8000-000000000002', 'c0000000-0001-4000-8000-000000000001', 'Olive Grove South', true),
  ('d0000000-0003-4000-8000-000000000003', 'c0000000-0002-4000-8000-000000000002', 'Almond Orchard', true),
  ('d0000000-0004-4000-8000-000000000004', 'c0000000-0003-4000-8000-000000000003', 'Wheat Field', true);

-- ============================================================================
-- AREA ALIASES (informal names used in voice notes)
-- ============================================================================

INSERT INTO area_aliases (area_id, alias)
VALUES
  ('d0000000-0001-4000-8000-000000000001', 'north olives'),
  ('d0000000-0001-4000-8000-000000000001', 'olives up top'),
  ('d0000000-0002-4000-8000-000000000002', 'south olives'),
  ('d0000000-0003-4000-8000-000000000003', 'almonds'),
  ('d0000000-0004-4000-8000-000000000004', 'wheat');
