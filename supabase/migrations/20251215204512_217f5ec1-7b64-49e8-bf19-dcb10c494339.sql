-- Add column for storing Sondertarif K7 Options IDs
ALTER TABLE public.products 
ADD COLUMN sondertarif_k7_option_ids text[] DEFAULT '{}'::text[];