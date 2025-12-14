-- Add bandwidth transparency fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS download_speed_normal integer,
ADD COLUMN IF NOT EXISTS download_speed_min integer,
ADD COLUMN IF NOT EXISTS upload_speed_normal integer,
ADD COLUMN IF NOT EXISTS upload_speed_min integer;

-- Add comment for documentation
COMMENT ON COLUMN public.products.download_speed_normal IS 'Normalerweise zur Verfügung stehende Download-Geschwindigkeit in Mbit/s (Transparenzverordnung)';
COMMENT ON COLUMN public.products.download_speed_min IS 'Minimale Download-Geschwindigkeit in Mbit/s (Transparenzverordnung)';
COMMENT ON COLUMN public.products.upload_speed_normal IS 'Normalerweise zur Verfügung stehende Upload-Geschwindigkeit in Mbit/s (Transparenzverordnung)';
COMMENT ON COLUMN public.products.upload_speed_min IS 'Minimale Upload-Geschwindigkeit in Mbit/s (Transparenzverordnung)';