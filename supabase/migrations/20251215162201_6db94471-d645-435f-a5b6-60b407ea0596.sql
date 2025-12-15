
-- Update search_streets function to handle street name variations
CREATE OR REPLACE FUNCTION public.search_streets(p_query text, p_city text DEFAULT 'Falkensee'::text)
 RETURNS TABLE(street text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  normalized_query text;
BEGIN
  -- Normalize the query: replace common variations of "Straße"
  normalized_query := p_query;
  
  -- Replace "str." or "str" at end of word with "straße" for matching
  normalized_query := regexp_replace(normalized_query, '\s+str\.?\s*$', 'straße', 'i');
  normalized_query := regexp_replace(normalized_query, '\s+str\.?\s+', 'straße ', 'i');
  
  -- Replace "strasse" with "straße" (case insensitive)
  normalized_query := regexp_replace(normalized_query, 'strasse', 'straße', 'gi');
  normalized_query := regexp_replace(normalized_query, 'straße', 'straße', 'gi');
  
  -- Also try matching without the suffix for more flexible matching
  RETURN QUERY
  SELECT DISTINCT b.street
  FROM public.buildings b
  WHERE 
    LOWER(b.city) = LOWER(p_city)
    AND (
      -- Try normalized query
      LOWER(b.street) LIKE LOWER(normalized_query) || '%'
      -- Also try original query in case normalization broke something
      OR LOWER(b.street) LIKE LOWER(p_query) || '%'
      -- Try matching base name without street suffix
      OR LOWER(b.street) LIKE LOWER(regexp_replace(p_query, '\s*(str\.?|strasse|straße)\s*$', '', 'i')) || '%'
    )
    AND b.ausbau_status = 'abgeschlossen'
  ORDER BY b.street
  LIMIT 20;
END;
$function$;

-- Also update get_house_numbers to handle variations
CREATE OR REPLACE FUNCTION public.get_house_numbers(p_street text, p_city text DEFAULT 'Falkensee'::text)
 RETURNS TABLE(house_number text)
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
  SELECT DISTINCT b.house_number
  FROM public.buildings b
  WHERE 
    LOWER(b.city) = LOWER(p_city)
    AND (
      LOWER(b.street) = LOWER(normalized_street)
      OR LOWER(b.street) = LOWER(p_street)
    )
    AND b.ausbau_status = 'abgeschlossen'
  ORDER BY b.house_number;
END;
$function$;

-- Also update check_address_availability
CREATE OR REPLACE FUNCTION public.check_address_availability(p_street text, p_house_number text, p_city text DEFAULT 'Falkensee'::text)
 RETURNS TABLE(street text, house_number text, city text, ausbau_art ausbau_art, ausbau_status ausbau_status, kabel_tv_available boolean, residential_units integer, building_id uuid)
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
    b.ausbau_art,
    b.ausbau_status,
    b.kabel_tv_available,
    b.residential_units,
    b.id as building_id
  FROM public.buildings b
  WHERE 
    (LOWER(b.street) = LOWER(normalized_street) OR LOWER(b.street) = LOWER(p_street))
    AND LOWER(b.house_number) = LOWER(p_house_number)
    AND LOWER(b.city) = LOWER(p_city)
    AND b.ausbau_status = 'abgeschlossen';
END;
$function$;
