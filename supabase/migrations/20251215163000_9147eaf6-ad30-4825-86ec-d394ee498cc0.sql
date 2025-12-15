
-- Create function to search cities
CREATE OR REPLACE FUNCTION public.search_cities(p_query text)
 RETURNS TABLE(city text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT b.city
  FROM public.buildings b
  WHERE 
    LOWER(b.city) LIKE LOWER(p_query) || '%'
    AND b.ausbau_status = 'abgeschlossen'
  ORDER BY b.city
  LIMIT 20;
END;
$function$;
