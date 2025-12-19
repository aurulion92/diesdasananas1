-- Create table for Home IDs (multiple per building based on residential units)
CREATE TABLE public.building_home_ids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  home_id_type TEXT NOT NULL DEFAULT '',
  home_id_value TEXT NOT NULL DEFAULT '',
  unit_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.building_home_ids ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage building home IDs" 
ON public.building_home_ids 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read building home IDs" 
ON public.building_home_ids 
FOR SELECT 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_building_home_ids_building_id ON public.building_home_ids(building_id);

-- Add trigger for updated_at
CREATE TRIGGER update_building_home_ids_updated_at
BEFORE UPDATE ON public.building_home_ids
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();