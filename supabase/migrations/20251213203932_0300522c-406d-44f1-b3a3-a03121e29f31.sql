-- Add new ausbau_art value 'ftth_limited' for Aktivtechnik connections (max 500 Mbit/s)
ALTER TYPE ausbau_art ADD VALUE IF NOT EXISTS 'ftth_limited';

-- Fix building_type generated column: 1=EFH, 2-3=MFH, 4+=WoWi
-- First drop the old generated column and recreate with correct logic
ALTER TABLE public.buildings DROP COLUMN building_type;
ALTER TABLE public.buildings ADD COLUMN building_type building_type GENERATED ALWAYS AS (
  CASE
    WHEN residential_units IS NULL OR residential_units <= 1 THEN 'efh'::building_type
    WHEN residential_units <= 3 THEN 'mfh'::building_type
    ELSE 'wowi'::building_type
  END
) STORED;