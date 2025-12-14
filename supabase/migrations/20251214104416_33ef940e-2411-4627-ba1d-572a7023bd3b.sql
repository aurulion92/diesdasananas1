-- Create table for option-building relationships (gebäudebezogene Optionen)
CREATE TABLE public.option_buildings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  option_id UUID NOT NULL REFERENCES public.product_options(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(option_id, building_id)
);

-- Enable RLS
ALTER TABLE public.option_buildings ENABLE ROW LEVEL SECURITY;

-- Admin can manage option-building assignments
CREATE POLICY "Admins can manage option buildings" 
ON public.option_buildings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can read option-building assignments (needed for ordering workflow)
CREATE POLICY "Public can read option buildings" 
ON public.option_buildings 
FOR SELECT 
USING (true);

-- Add is_building_restricted flag to product_options (similar to products)
ALTER TABLE public.product_options 
ADD COLUMN IF NOT EXISTS is_building_restricted BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX idx_option_buildings_option_id ON public.option_buildings(option_id);
CREATE INDEX idx_option_buildings_building_id ON public.option_buildings(building_id);