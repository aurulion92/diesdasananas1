-- Add phone_terms_text field for products with included phone service
ALTER TABLE public.products
ADD COLUMN phone_terms_text text;