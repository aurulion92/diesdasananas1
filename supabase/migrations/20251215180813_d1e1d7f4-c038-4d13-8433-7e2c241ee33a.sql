
-- Create table for K7 service data (one building can have multiple K7 entries)
CREATE TABLE public.building_k7_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  std_kabel_gebaeude_id TEXT, -- K7 Gebäude ID (same as gebaeude_id_k7 on building)
  leistungsprodukt_id TEXT,
  leistungsprodukt TEXT, -- Description from LEISTUNGSPRODUKT column
  nt_dsl_bandbreite_id TEXT,
  bandbreite TEXT, -- Description from BANDBREITE column
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_building_k7_services_building_id ON public.building_k7_services(building_id);
CREATE INDEX idx_building_k7_services_std_kabel_gebaeude_id ON public.building_k7_services(std_kabel_gebaeude_id);

-- Enable RLS
ALTER TABLE public.building_k7_services ENABLE ROW LEVEL SECURITY;

-- Admin can manage K7 services
CREATE POLICY "Admins can manage building K7 services"
ON public.building_k7_services
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can read K7 services (needed for product availability checks)
CREATE POLICY "Public can read building K7 services"
ON public.building_k7_services
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_building_k7_services_updated_at
BEFORE UPDATE ON public.building_k7_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
