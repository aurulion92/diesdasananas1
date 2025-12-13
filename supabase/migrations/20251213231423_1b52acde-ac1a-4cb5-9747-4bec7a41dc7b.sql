-- Add info_text, image_url, external_link fields to product_options
ALTER TABLE public.product_options 
ADD COLUMN IF NOT EXISTS info_text text,
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS external_link_url text,
ADD COLUMN IF NOT EXISTS external_link_label text;

-- Add info_text to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS info_text text;

-- Add consent and phone options to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS consent_advertising boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_agb boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_evn boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_book_entry_type text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS phone_book_printed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_book_phone_info boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_book_internet boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_book_custom_name text,
ADD COLUMN IF NOT EXISTS phone_book_custom_address text,
ADD COLUMN IF NOT EXISTS phone_book_show_address boolean DEFAULT true;

COMMENT ON COLUMN public.product_options.info_text IS 'Info text shown on hover (i icon)';
COMMENT ON COLUMN public.product_options.image_url IS 'Optional image URL for the option';
COMMENT ON COLUMN public.product_options.external_link_url IS 'Optional external link URL';
COMMENT ON COLUMN public.product_options.external_link_label IS 'Label for the external link';
COMMENT ON COLUMN public.products.info_text IS 'Info text shown on hover (i icon)';
COMMENT ON COLUMN public.orders.phone_book_entry_type IS 'none, standard, custom';