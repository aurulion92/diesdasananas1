-- Add vzf_text field to product_options for custom VZF text (primarily for phone options)
ALTER TABLE public.product_options ADD COLUMN vzf_text text;