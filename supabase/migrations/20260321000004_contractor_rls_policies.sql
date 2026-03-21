-- Migration: contractor_rls_policies
-- RLS policies for all new contractor tables
-- Pattern: SELECT for authenticated, INSERT/UPDATE/DELETE for admin|owner

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_log_materials ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CLIENTS POLICIES
-- ============================================================================

CREATE POLICY clients_select ON clients
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY clients_insert ON clients
  FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY clients_update ON clients
  FOR UPDATE USING (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY clients_delete ON clients
  FOR DELETE USING (public.get_user_role() IN ('admin', 'owner'));

-- ============================================================================
-- CLIENT_ALIASES POLICIES
-- ============================================================================

CREATE POLICY client_aliases_select ON client_aliases
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY client_aliases_insert ON client_aliases
  FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY client_aliases_update ON client_aliases
  FOR UPDATE USING (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY client_aliases_delete ON client_aliases
  FOR DELETE USING (public.get_user_role() IN ('admin', 'owner'));

-- ============================================================================
-- WORK_TYPES POLICIES
-- ============================================================================

CREATE POLICY work_types_select ON work_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY work_types_insert ON work_types
  FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY work_types_update ON work_types
  FOR UPDATE USING (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY work_types_delete ON work_types
  FOR DELETE USING (public.get_user_role() IN ('admin', 'owner'));

-- ============================================================================
-- MATERIALS POLICIES
-- ============================================================================

CREATE POLICY materials_select ON materials
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY materials_insert ON materials
  FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY materials_update ON materials
  FOR UPDATE USING (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY materials_delete ON materials
  FOR DELETE USING (public.get_user_role() IN ('admin', 'owner'));

-- ============================================================================
-- WORK_LOG_MATERIALS POLICIES
-- ============================================================================

CREATE POLICY work_log_materials_select ON work_log_materials
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY work_log_materials_insert ON work_log_materials
  FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY work_log_materials_update ON work_log_materials
  FOR UPDATE USING (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY work_log_materials_delete ON work_log_materials
  FOR DELETE USING (public.get_user_role() IN ('admin', 'owner'));
