// Well-known UUID for the own-farm client record (משק פילצביץ׳)
// Seeded in migration 20260321000001_seed_contractor_data.sql
export const OWN_FARM_CLIENT_ID = "00000000-0000-4000-a000-000000000001";

// Work type categories (fixed enum for v1)
export const WORK_TYPE_CATEGORIES = [
  "field_work",
  "spraying",
  "planting",
  "harvest",
  "irrigation",
  "maintenance",
  "logistics",
  "admin",
  "other",
] as const;

export type WorkTypeCategory = (typeof WORK_TYPE_CATEGORIES)[number];

// Material categories
export const MATERIAL_CATEGORIES = [
  "spray",
  "seed",
  "fertilizer",
  "other",
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];
