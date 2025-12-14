-- Add image_urls array field to product_options for multiple images
ALTER TABLE public.product_options 
ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}'::text[];