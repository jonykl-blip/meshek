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
-- NOTE: full_name uses Hebrew script to match production data.
--       Voice notes are in Hebrew, so names must be stored in Hebrew for
--       Whisper prompt hints and ILIKE lookups to work correctly.
-- ============================================================================

INSERT INTO profiles (id, telegram_id, full_name, role, language_pref, hourly_rate, is_active)
VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', NULL, 'אורי', 'owner', 'he', NULL, true),
  ('a1b2c3d4-0002-4000-8000-000000000002', NULL, 'עידן', 'admin', 'he', NULL, true),
  ('a1b2c3d4-0003-4000-8000-000000000003', NULL, 'כרם', 'manager', 'he', NULL, true),
  ('a1b2c3d4-0004-4000-8000-000000000004', '123456789', 'סומצ''אי', 'worker', 'th', 45.00, true);

-- ============================================================================
-- CROPS
-- ============================================================================

INSERT INTO crops (id, name)
VALUES
  ('c0000000-0001-4000-8000-000000000001', 'זיתים'),
  ('c0000000-0002-4000-8000-000000000002', 'שקדים'),
  ('c0000000-0003-4000-8000-000000000003', 'גידולי שדה');

-- ============================================================================
-- AREAS (linked to crops)
-- ============================================================================

INSERT INTO areas (id, crop_id, name, is_active)
VALUES
  ('d0000000-0001-4000-8000-000000000001', 'c0000000-0001-4000-8000-000000000001', 'זיתים צפון', true),
  ('d0000000-0002-4000-8000-000000000002', 'c0000000-0001-4000-8000-000000000001', 'זיתים דרום', true),
  ('d0000000-0003-4000-8000-000000000003', 'c0000000-0002-4000-8000-000000000002', 'מטע שקדים', true),
  ('d0000000-0004-4000-8000-000000000004', 'c0000000-0003-4000-8000-000000000003', 'שדה חיטה', true);

-- ============================================================================
-- AREA ALIASES (informal names used in voice notes)
-- ============================================================================

INSERT INTO area_aliases (area_id, alias)
VALUES
  ('d0000000-0001-4000-8000-000000000001', 'זיתים למעלה'),
  ('d0000000-0001-4000-8000-000000000001', 'הזיתים למעלה'),
  ('d0000000-0002-4000-8000-000000000002', 'זיתים למטה'),
  ('d0000000-0003-4000-8000-000000000003', 'שקדים'),
  ('d0000000-0004-4000-8000-000000000004', 'חיטה');
