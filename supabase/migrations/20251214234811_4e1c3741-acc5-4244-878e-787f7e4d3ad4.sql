-- Add customer_type field to products
ALTER TABLE public.products 
ADD COLUMN customer_type text NOT NULL DEFAULT 'pk';

-- Add customer_type field to product_options
ALTER TABLE public.product_options 
ADD COLUMN customer_type text NOT NULL DEFAULT 'pk';

-- Add customer_type field to promotions
ALTER TABLE public.promotions 
ADD COLUMN customer_type text NOT NULL DEFAULT 'pk';

-- Update all existing products to be 'pk'
UPDATE public.products SET customer_type = 'pk' WHERE customer_type IS NULL OR customer_type = '';

-- Update all existing product_options to be 'pk'
UPDATE public.product_options SET customer_type = 'pk' WHERE customer_type IS NULL OR customer_type = '';

-- Update all existing promotions to be 'pk'
UPDATE public.promotions SET customer_type = 'pk' WHERE customer_type IS NULL OR customer_type = '';

-- Add check constraint for valid values
ALTER TABLE public.products 
ADD CONSTRAINT products_customer_type_check CHECK (customer_type IN ('pk', 'kmu'));

ALTER TABLE public.product_options 
ADD CONSTRAINT product_options_customer_type_check CHECK (customer_type IN ('pk', 'kmu'));

ALTER TABLE public.promotions 
ADD CONSTRAINT promotions_customer_type_check CHECK (customer_type IN ('pk', 'kmu'));