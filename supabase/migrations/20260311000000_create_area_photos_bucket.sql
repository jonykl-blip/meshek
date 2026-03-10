-- Migration: create_area_photos_bucket
-- Story 3.2: Area photos storage bucket with access policies
-- Bucket: area-photos (private, signed URLs for reads)
-- Path pattern: {area_id}.{ext}

-- ============================================================================
-- CREATE STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'area-photos',
  'area-photos',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Admin and owner can upload/update area photos
CREATE POLICY area_photos_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'area-photos'
    AND public.get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY area_photos_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'area-photos'
    AND public.get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY area_photos_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'area-photos'
    AND public.get_user_role() IN ('owner', 'admin')
  );

-- All authenticated users can view area photos (needed for Thai Mini App in Story 7.2)
CREATE POLICY area_photos_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'area-photos'
    AND auth.role() = 'authenticated'
  );