-- Create profile_aliases table (mirrors area_aliases pattern)
CREATE TABLE profile_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, alias)
);

-- Enable RLS
ALTER TABLE profile_aliases ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read profile aliases
CREATE POLICY profile_aliases_select ON profile_aliases
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admin can manage profile aliases
CREATE POLICY profile_aliases_insert ON profile_aliases
  FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY profile_aliases_update ON profile_aliases
  FOR UPDATE USING (public.get_user_role() = 'admin');

CREATE POLICY profile_aliases_delete ON profile_aliases
  FOR DELETE USING (public.get_user_role() = 'admin');
