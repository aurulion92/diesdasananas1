-- Add quantitative option support to product_options
ALTER TABLE public.product_options 
ADD COLUMN IF NOT EXISTS is_quantitative boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS max_quantity integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS quantity_label text DEFAULT 'Anzahl';

COMMENT ON COLUMN public.product_options.is_quantitative IS 'If true, this option can be selected multiple times with quantity selector';
COMMENT ON COLUMN public.product_options.max_quantity IS 'Maximum quantity that can be selected (default 10)';
COMMENT ON COLUMN public.product_options.quantity_label IS 'Label for the quantity selector (e.g., "Anzahl Leitungen")';