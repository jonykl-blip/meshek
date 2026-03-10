-- Migration: create_rls_policies
-- Story 1.2: RLS policies for all tables
-- Implements RBAC matrix from PRD at the database layer

-- ============================================================================
-- HELPER FUNCTION
-- ============================================================================

-- Returns the role of the currently authenticated user from profiles table.
-- SECURITY DEFINER runs as the function owner (bypasses RLS on profiles).
-- STABLE means the result doesn't change within a single transaction.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Grant execute to all authenticated users (required for RLS policies to invoke this function)
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can read their own profile; owner/admin/manager can read all profiles
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    auth.uid() = id
    OR public.get_user_role() IN ('owner', 'admin', 'manager')
  );

-- Only admin can insert new profiles
CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'admin'
  );

-- Only admin can update profiles
CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (
    public.get_user_role() = 'admin'
  );

-- Only admin can delete profiles
CREATE POLICY profiles_delete ON profiles
  FOR DELETE USING (
    public.get_user_role() = 'admin'
  );

-- ============================================================================
-- CROPS POLICIES
-- ============================================================================

-- All authenticated users can read crops
CREATE POLICY crops_select ON crops
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admin can manage crops
CREATE POLICY crops_insert ON crops
  FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY crops_update ON crops
  FOR UPDATE USING (public.get_user_role() = 'admin');

CREATE POLICY crops_delete ON crops
  FOR DELETE USING (public.get_user_role() = 'admin');

-- ============================================================================
-- AREAS POLICIES
-- ============================================================================

-- All authenticated users can read areas
CREATE POLICY areas_select ON areas
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admin can manage areas
CREATE POLICY areas_insert ON areas
  FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY areas_update ON areas
  FOR UPDATE USING (public.get_user_role() = 'admin');

CREATE POLICY areas_delete ON areas
  FOR DELETE USING (public.get_user_role() = 'admin');

-- ============================================================================
-- AREA_ALIASES POLICIES
-- ============================================================================

-- All authenticated users can read area aliases
CREATE POLICY area_aliases_select ON area_aliases
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admin can manage area aliases
CREATE POLICY area_aliases_insert ON area_aliases
  FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY area_aliases_update ON area_aliases
  FOR UPDATE USING (public.get_user_role() = 'admin');

CREATE POLICY area_aliases_delete ON area_aliases
  FOR DELETE USING (public.get_user_role() = 'admin');

-- ============================================================================
-- EQUIPMENT POLICIES
-- ============================================================================

-- All authenticated users can read equipment
CREATE POLICY equipment_select ON equipment
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admin can manage equipment
CREATE POLICY equipment_insert ON equipment
  FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY equipment_update ON equipment
  FOR UPDATE USING (public.get_user_role() = 'admin');

CREATE POLICY equipment_delete ON equipment
  FOR DELETE USING (public.get_user_role() = 'admin');

-- ============================================================================
-- TASKS POLICIES
-- ============================================================================

-- All authenticated users can read tasks
CREATE POLICY tasks_select ON tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Owner and manager can create and update tasks
CREATE POLICY tasks_insert ON tasks
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('owner', 'manager')
  );

CREATE POLICY tasks_update ON tasks
  FOR UPDATE USING (
    public.get_user_role() IN ('owner', 'manager')
  );

-- Owner and manager can delete tasks
CREATE POLICY tasks_delete ON tasks
  FOR DELETE USING (
    public.get_user_role() IN ('owner', 'manager')
  );

-- ============================================================================
-- ATTENDANCE_LOGS POLICIES
-- ============================================================================

-- Owner, admin, manager can read all records; workers can only read their own
CREATE POLICY attendance_logs_select ON attendance_logs
  FOR SELECT USING (
    public.get_user_role() IN ('owner', 'admin', 'manager')
    OR profile_id = auth.uid()
  );

-- Admin can insert attendance records (n8n uses service_role key which bypasses RLS)
CREATE POLICY attendance_logs_insert ON attendance_logs
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'admin'
  );

-- Only admin can update attendance records
CREATE POLICY attendance_logs_update ON attendance_logs
  FOR UPDATE USING (
    public.get_user_role() = 'admin'
  );

-- ============================================================================
-- AUDIT_LOG POLICIES (INSERT-ONLY — immutable)
-- ============================================================================

-- All authenticated users can insert audit log entries
-- (logAudit() helper in application code will call this)
CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Owner/admin can read audit logs for review purposes
-- UPDATE and DELETE have no policies = denied by default (insert-only enforced by RLS)
CREATE POLICY audit_log_select ON audit_log
  FOR SELECT USING (
    public.get_user_role() IN ('owner', 'admin')
  );
