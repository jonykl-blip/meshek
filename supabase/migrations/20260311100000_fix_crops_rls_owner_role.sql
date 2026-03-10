-- Fix RLS policies to allow both admin and owner roles
-- Previously only 'admin' could manage crops, areas, area_aliases, equipment — excluding 'owner'

-- CROPS
DROP POLICY IF EXISTS crops_insert ON crops;
DROP POLICY IF EXISTS crops_update ON crops;
DROP POLICY IF EXISTS crops_delete ON crops;

CREATE POLICY crops_insert ON crops
  FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY crops_update ON crops
  FOR UPDATE USING (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY crops_delete ON crops
  FOR DELETE USING (public.get_user_role() IN ('admin', 'owner'));

-- AREAS
DROP POLICY IF EXISTS areas_insert ON areas;
DROP POLICY IF EXISTS areas_update ON areas;
DROP POLICY IF EXISTS areas_delete ON areas;

CREATE POLICY areas_insert ON areas
  FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY areas_update ON areas
  FOR UPDATE USING (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY areas_delete ON areas
  FOR DELETE USING (public.get_user_role() IN ('admin', 'owner'));

-- AREA_ALIASES
DROP POLICY IF EXISTS area_aliases_insert ON area_aliases;
DROP POLICY IF EXISTS area_aliases_update ON area_aliases;
DROP POLICY IF EXISTS area_aliases_delete ON area_aliases;

CREATE POLICY area_aliases_insert ON area_aliases
  FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY area_aliases_update ON area_aliases
  FOR UPDATE USING (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY area_aliases_delete ON area_aliases
  FOR DELETE USING (public.get_user_role() IN ('admin', 'owner'));

-- EQUIPMENT
DROP POLICY IF EXISTS equipment_insert ON equipment;
DROP POLICY IF EXISTS equipment_update ON equipment;
DROP POLICY IF EXISTS equipment_delete ON equipment;

CREATE POLICY equipment_insert ON equipment
  FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY equipment_update ON equipment
  FOR UPDATE USING (public.get_user_role() IN ('admin', 'owner'));

CREATE POLICY equipment_delete ON equipment
  FOR DELETE USING (public.get_user_role() IN ('admin', 'owner'));
