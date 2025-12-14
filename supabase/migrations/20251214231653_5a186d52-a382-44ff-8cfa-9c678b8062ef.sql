-- Drop and recreate check_address_availability function to include residential_units and building_id
DROP FUNCTION IF EXISTS public.check_address_availability(text, text, text);

CREATE OR REPLACE FUNCTION public.check_address_availability(p_street text, p_house_number text, p_city text DEFAULT 'Falkensee'::text)
 RETURNS TABLE(street text, house_number text, city text, ausbau_art ausbau_art, ausbau_status ausbau_status, kabel_tv_available boolean, residential_units integer, building_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    b.street,
    b.house_number,
    b.city,
    b.ausbau_art,
    b.ausbau_status,
    b.kabel_tv_available,
    b.residential_units,
    b.id as building_id
  FROM public.buildings b
  WHERE 
    LOWER(b.street) = LOWER(p_street)
    AND LOWER(b.house_number) = LOWER(p_house_number)
    AND LOWER(b.city) = LOWER(p_city)
    AND b.ausbau_status = 'abgeschlossen';
END;
$function$;