-- Add clock-in/out lifecycle statuses to attendance_status ENUM
-- pending_clockout: worker has clocked in but not yet clocked out (open shift)
-- pending_approval: worker has clocked out; record awaits manager approval

ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'pending_clockout';
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'pending_approval';
