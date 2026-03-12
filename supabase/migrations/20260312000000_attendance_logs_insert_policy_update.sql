-- Allow owner, admin, and manager roles to insert attendance records manually.
-- Previously only admin could insert (via bot pipeline using service_role bypasses RLS anyway).
DROP POLICY IF EXISTS attendance_logs_insert ON attendance_logs;
CREATE POLICY attendance_logs_insert ON attendance_logs
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('owner', 'admin', 'manager')
  );
