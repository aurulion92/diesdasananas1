-- Add PK and KMU tariff availability columns to buildings
ALTER TABLE public.buildings
ADD COLUMN pk_tariffs_available boolean DEFAULT true,
ADD COLUMN kmu_tariffs_available boolean DEFAULT true;

-- Update existing buildings: set both to true where ausbau_status = 'abgeschlossen'
UPDATE public.buildings
SET pk_tariffs_available = (ausbau_status = 'abgeschlossen'),
    kmu_tariffs_available = (ausbau_status = 'abgeschlossen')
WHERE pk_tariffs_available IS NULL OR kmu_tariffs_available IS NULL;