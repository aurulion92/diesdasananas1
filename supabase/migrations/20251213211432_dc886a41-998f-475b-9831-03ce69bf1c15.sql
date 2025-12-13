-- Add is_ftth_limited column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_ftth_limited boolean DEFAULT true;

-- Update existing products: by default all products are available for ftth_limited
-- (can be changed manually later)
UPDATE public.products SET is_ftth_limited = true WHERE is_ftth_limited IS NULL;