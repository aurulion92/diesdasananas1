-- Create DSLAM table for FTTB buildings
CREATE TABLE IF NOT EXISTS public.dslams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location_description text,
  total_ports integer NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add DSLAM reference and port info to buildings
ALTER TABLE public.buildings
ADD COLUMN IF NOT EXISTS dslam_id uuid REFERENCES public.dslams(id),
ADD COLUMN IF NOT EXISTS dslam_port_number integer,
ADD COLUMN IF NOT EXISTS dslam_ports_available integer,
ADD COLUMN IF NOT EXISTS dslam_ports_occupied integer DEFAULT 0;

-- Create index for DSLAM lookups
CREATE INDEX IF NOT EXISTS idx_buildings_dslam ON public.buildings(dslam_id);

-- Enable RLS on dslams
ALTER TABLE public.dslams ENABLE ROW LEVEL SECURITY;

-- RLS policies for dslams
CREATE POLICY "Admins can manage dslams"
ON public.dslams
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read dslams"
ON public.dslams
FOR SELECT
USING (true);

-- Function to calculate available ports for a DSLAM
CREATE OR REPLACE FUNCTION public.get_dslam_availability(p_dslam_id uuid)
RETURNS TABLE (
  dslam_id uuid,
  dslam_name text,
  total_ports integer,
  max_usable_ports integer,
  occupied_ports integer,
  available_ports integer,
  buildings_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as dslam_id,
    d.name as dslam_name,
    d.total_ports,
    -- Max usable is the SUM of residential units or total_ports, whichever is lower per building
    COALESCE(SUM(LEAST(COALESCE(b.residential_units, d.total_ports), d.total_ports))::integer, 0) as max_usable_ports,
    -- Occupied ports from buildings
    COALESCE(SUM(COALESCE(b.dslam_ports_occupied, 0))::integer, 0) as occupied_ports,
    -- Available = max usable - occupied
    (COALESCE(SUM(LEAST(COALESCE(b.residential_units, d.total_ports), d.total_ports))::integer, 0) - 
     COALESCE(SUM(COALESCE(b.dslam_ports_occupied, 0))::integer, 0)) as available_ports,
    COUNT(b.id)::integer as buildings_count
  FROM public.dslams d
  LEFT JOIN public.buildings b ON b.dslam_id = d.id
  WHERE d.id = p_dslam_id
  GROUP BY d.id, d.name, d.total_ports;
END;
$$;

-- Function to check if a building can accept new connections
CREATE OR REPLACE FUNCTION public.check_building_dslam_availability(p_building_id uuid)
RETURNS TABLE (
  can_connect boolean,
  reason text,
  available_ports integer,
  occupied_ports integer,
  max_ports integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_building record;
  v_max_ports integer;
  v_occupied integer;
BEGIN
  -- Get building info
  SELECT b.*, d.total_ports as dslam_total_ports
  INTO v_building
  FROM public.buildings b
  LEFT JOIN public.dslams d ON d.id = b.dslam_id
  WHERE b.id = p_building_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Gebäude nicht gefunden'::text, 0, 0, 0;
    RETURN;
  END IF;

  -- If not FTTB or no DSLAM, always can connect
  IF v_building.ausbau_art != 'fttb' OR v_building.dslam_id IS NULL THEN
    RETURN QUERY SELECT true, 'Kein DSLAM-Limit'::text, 999, 0, 999;
    RETURN;
  END IF;

  -- Calculate max ports (limited by residential units)
  v_max_ports := LEAST(
    COALESCE(v_building.residential_units, v_building.dslam_total_ports),
    COALESCE(v_building.dslam_total_ports, 8)
  );
  
  v_occupied := COALESCE(v_building.dslam_ports_occupied, 0);

  IF v_occupied >= v_max_ports THEN
    RETURN QUERY SELECT 
      false, 
      format('Alle %s Ports belegt', v_max_ports)::text,
      0,
      v_occupied,
      v_max_ports;
  ELSE
    RETURN QUERY SELECT 
      true,
      format('%s von %s Ports verfügbar', v_max_ports - v_occupied, v_max_ports)::text,
      v_max_ports - v_occupied,
      v_occupied,
      v_max_ports;
  END IF;
END;
$$;

-- Add trigger to update updated_at
CREATE TRIGGER update_dslams_updated_at
BEFORE UPDATE ON public.dslams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();