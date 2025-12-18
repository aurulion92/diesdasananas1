-- Drop existing function and recreate with gnv_vorhanden
DROP FUNCTION IF EXISTS public.check_address_availability(text, text, text);

CREATE OR REPLACE FUNCTION public.check_address_availability(p_street text, p_house_number text, p_city text DEFAULT 'Falkensee'::text)
 RETURNS TABLE(street text, house_number text, city text, postal_code text, ausbau_art ausbau_art, ausbau_status ausbau_status, kabel_tv_available boolean, residential_units integer, building_id uuid, gnv_vorhanden boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  normalized_street text;
BEGIN
  -- Normalize the street: replace common variations of "Straße"
  normalized_street := p_street;
  
  -- Replace "str." or "str" at end with "straße"
  normalized_street := regexp_replace(normalized_street, '\s+str\.?\s*$', 'straße', 'i');
  normalized_street := regexp_replace(normalized_street, '\s+str\.?\s+', 'straße ', 'i');
  
  -- Replace "strasse" with "straße"
  normalized_street := regexp_replace(normalized_street, 'strasse', 'straße', 'gi');

  RETURN QUERY
  SELECT 
    b.street,
    b.house_number,
    b.city,
    b.postal_code,
    b.ausbau_art,
    b.ausbau_status,
    b.kabel_tv_available,
    b.residential_units,
    b.id as building_id,
    b.gnv_vorhanden
  FROM public.buildings b
  WHERE 
    (LOWER(b.street) = LOWER(normalized_street) OR LOWER(b.street) = LOWER(p_street))
    AND LOWER(b.house_number) = LOWER(p_house_number)
    AND LOWER(b.city) = LOWER(p_city)
    AND b.ausbau_status = 'abgeschlossen';
END;
$function$;