-- Migration: create_storage_bucket
-- Story 1.2: Voice recordings storage bucket with access policies
-- Bucket: voice-recordings (private, no public access)
-- Path pattern: {year}/{month}/{telegram_message_id}.ogg

-- ============================================================================
-- CREATE STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-recordings', 'voice-recordings', false);

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Only owner and admin can download/view voice recordings
CREATE POLICY voice_recordings_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'voice-recordings'
    AND public.get_user_role() IN ('owner', 'admin')
  );

-- Only service_role can upload voice recordings (n8n uses service key).
-- No INSERT policy needed — service_role bypasses RLS automatically.
-- This means no authenticated user can upload directly, only service_role.

-- No UPDATE or DELETE policies — voice recordings are immutable once uploaded.
