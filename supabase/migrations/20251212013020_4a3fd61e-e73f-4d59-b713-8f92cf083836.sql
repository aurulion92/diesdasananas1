-- Add dependency fields to product_options
ALTER TABLE public.product_options 
ADD COLUMN IF NOT EXISTS parent_option_slug text,
ADD COLUMN IF NOT EXISTS auto_include_option_slug text,
ADD COLUMN IF NOT EXISTS exclusive_group text;

-- Add comments for clarity
COMMENT ON COLUMN public.product_options.parent_option_slug IS 'Slug of parent option that must be selected first';
COMMENT ON COLUMN public.product_options.auto_include_option_slug IS 'Slug of option that is auto-included when this option is selected';
COMMENT ON COLUMN public.product_options.exclusive_group IS 'Group name for mutually exclusive options';