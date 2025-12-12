-- Change parent_option_slug from text to text array for multiple parents
ALTER TABLE public.product_options 
ALTER COLUMN parent_option_slug TYPE text[] USING 
  CASE 
    WHEN parent_option_slug IS NULL THEN NULL
    ELSE ARRAY[parent_option_slug]
  END;

-- Same for auto_include_option_slug - can auto-include multiple options
ALTER TABLE public.product_options 
ALTER COLUMN auto_include_option_slug TYPE text[] USING 
  CASE 
    WHEN auto_include_option_slug IS NULL THEN NULL
    ELSE ARRAY[auto_include_option_slug]
  END;

-- Update comments
COMMENT ON COLUMN public.product_options.parent_option_slug IS 'Array of parent option slugs - at least one must be selected first';
COMMENT ON COLUMN public.product_options.auto_include_option_slug IS 'Array of option slugs that are auto-included when this option is selected';