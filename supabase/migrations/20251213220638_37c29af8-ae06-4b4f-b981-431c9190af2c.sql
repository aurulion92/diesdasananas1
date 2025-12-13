-- Add hide_for_ftth column to products table
-- When true, this product will be hidden in FTTH tariff selection (behind "Weitere Optionen")
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS hide_for_ftth boolean DEFAULT false;