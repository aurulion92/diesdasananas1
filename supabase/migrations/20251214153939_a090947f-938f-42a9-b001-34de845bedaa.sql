-- Add external link fields to products table (like product_options)
ALTER TABLE public.products
ADD COLUMN external_link_url text,
ADD COLUMN external_link_label text;