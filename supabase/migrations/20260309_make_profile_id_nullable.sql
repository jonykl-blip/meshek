-- Migration: make profile_id nullable for pending records with unrecognized workers
-- Required by Story 2-1: n8n dual-write may insert attendance_logs rows where
-- the worker name from a voice note cannot be resolved to a profiles.id UUID.
-- The FK constraint still validates when a UUID IS provided.
-- Story 2-5 (pending record flow) also depends on this being nullable.

ALTER TABLE attendance_logs ALTER COLUMN profile_id DROP NOT NULL;
