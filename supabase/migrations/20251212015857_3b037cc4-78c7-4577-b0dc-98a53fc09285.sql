-- Create building_type enum
CREATE TYPE public.building_type AS ENUM ('efh', 'mfh', 'wowi');

-- Add building_type column with auto-calculation based on residential_units
-- Also add building_type_override to allow manual override
ALTER TABLE public.buildings 
ADD COLUMN building_type public.building_type GENERATED ALWAYS AS (
  CASE 
    WHEN residential_units = 1 THEN 'efh'::building_type
    WHEN residential_units = 2 THEN 'mfh'::building_type
    ELSE 'wowi'::building_type
  END
) STORED;

-- Add column for manual override of building type
ALTER TABLE public.buildings 
ADD COLUMN building_type_manual public.building_type DEFAULT NULL;