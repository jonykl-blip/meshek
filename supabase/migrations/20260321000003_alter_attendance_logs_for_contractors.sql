-- Migration: alter_attendance_logs_for_contractors
-- Adds work_type_id FK, dunam_covered, and pending_client_name to attendance_logs

ALTER TABLE attendance_logs
  ADD COLUMN work_type_id UUID REFERENCES work_types(id),
  ADD COLUMN dunam_covered NUMERIC(8, 2),
  ADD COLUMN pending_client_name TEXT;

-- Index for work type filtering and reporting
CREATE INDEX idx_attendance_logs_work_type_id ON attendance_logs(work_type_id);
