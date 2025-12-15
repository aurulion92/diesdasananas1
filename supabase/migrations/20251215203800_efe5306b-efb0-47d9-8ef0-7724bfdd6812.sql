-- Add is_sondertarif flag to products
ALTER TABLE public.products 
ADD COLUMN is_sondertarif boolean DEFAULT false;

-- Add is_sondertarif_only flag to product_options
ALTER TABLE public.product_options 
ADD COLUMN is_sondertarif_only boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.products.is_sondertarif IS 'Flag for special tariffs (Lebenshilfe, Mitarbeiter, etc.)';
COMMENT ON COLUMN public.product_options.is_sondertarif_only IS 'Option only available for Sondertarif products';