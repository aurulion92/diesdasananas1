-- Create junction table for product-building relationships
-- This allows specific products to be available only at certain buildings
CREATE TABLE public.product_buildings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (product_id, building_id)
);

-- Enable RLS
ALTER TABLE public.product_buildings ENABLE ROW LEVEL SECURITY;

-- Admin can manage
CREATE POLICY "Admins can manage product buildings" 
ON public.product_buildings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can read (for checking availability)
CREATE POLICY "Public can read product buildings" 
ON public.product_buildings 
FOR SELECT 
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_product_buildings_product ON public.product_buildings(product_id);
CREATE INDEX idx_product_buildings_building ON public.product_buildings(building_id);

-- Add column to products table to indicate if product is building-restricted
ALTER TABLE public.products ADD COLUMN is_building_restricted BOOLEAN DEFAULT false;