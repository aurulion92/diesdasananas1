-- Add display_name field for custom product display in ordering workflow
ALTER TABLE public.products
ADD COLUMN display_name text;