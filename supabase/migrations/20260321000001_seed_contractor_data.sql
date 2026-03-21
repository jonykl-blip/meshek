-- Migration: seed_contractor_data
-- Seeds own-farm client, initial work types, and initial materials

-- ============================================================================
-- OWN-FARM CLIENT (well-known UUID used as constant throughout the app)
-- ============================================================================

INSERT INTO clients (id, name, name_en, is_own_farm, is_active)
VALUES ('00000000-0000-4000-a000-000000000001', 'משק פילצביץ׳', 'Piltzovitch Farm', true, true);

-- ============================================================================
-- WORK TYPES — initial agricultural task types
-- ============================================================================

INSERT INTO work_types (name_he, name_en, category) VALUES
  ('ריסוס', 'Spraying', 'spraying'),
  ('עיבוד קרקע', 'Soil Tillage', 'field_work'),
  ('זריעה', 'Seeding / Sowing', 'planting'),
  ('נטיעה', 'Planting', 'planting'),
  ('קציר / קטיף', 'Harvest / Picking', 'harvest'),
  ('גיזום', 'Pruning', 'maintenance'),
  ('השקיה', 'Irrigation', 'irrigation'),
  ('דישון', 'Fertilization', 'spraying'),
  ('בדיקת שדה', 'Field Inspection', 'admin'),
  ('הובלה', 'Transport / Hauling', 'logistics'),
  ('כללי', 'General Work', 'other');

-- ============================================================================
-- MATERIALS — initial agricultural inputs
-- ============================================================================

INSERT INTO materials (name_he, name_en, category, default_unit) VALUES
  ('גלייפוסאט', 'Glyphosate', 'spray', 'ליטר'),
  ('קופר', 'Copper', 'spray', 'ק"ג'),
  ('חומר קוטל עשבים', 'Herbicide (generic)', 'spray', 'ליטר'),
  ('חומר קוטל פטריות', 'Fungicide (generic)', 'spray', 'ליטר'),
  ('חרדל לבן (זרעים)', 'White Mustard Seeds', 'seed', 'ק"ג'),
  ('זרעי חיטה', 'Wheat Seeds', 'seed', 'ק"ג'),
  ('זרעי שעורה', 'Barley Seeds', 'seed', 'ק"ג'),
  ('דשן NPK', 'NPK Fertilizer', 'fertilizer', 'ק"ג'),
  ('גללי עוף', 'Chicken Manure', 'fertilizer', 'טון'),
  ('מים', 'Water', 'other', 'מ"ק');
