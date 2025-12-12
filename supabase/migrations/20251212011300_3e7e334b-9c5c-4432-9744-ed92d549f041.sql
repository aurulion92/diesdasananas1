-- Drop existing public read policy
DROP POLICY IF EXISTS "Public can read buildings" ON public.buildings;

-- Create a more restrictive public read policy using a view approach
-- We'll create a function that returns only public-safe fields

-- Create a security definer function for public address lookup
CREATE OR REPLACE FUNCTION public.check_address_availability(
  p_street TEXT,
  p_house_number TEXT,
  p_city TEXT DEFAULT 'Falkensee'
)
RETURNS TABLE (
  street TEXT,
  house_number TEXT,
  city TEXT,
  ausbau_art ausbau_art,
  ausbau_status ausbau_status,
  kabel_tv_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.street,
    b.house_number,
    b.city,
    b.ausbau_art,
    b.ausbau_status,
    b.kabel_tv_available
  FROM public.buildings b
  WHERE 
    LOWER(b.street) = LOWER(p_street)
    AND LOWER(b.house_number) = LOWER(p_house_number)
    AND LOWER(b.city) = LOWER(p_city)
    AND b.ausbau_status = 'abgeschlossen';
END;
$$;

-- Create a function to search streets (for autocomplete)
CREATE OR REPLACE FUNCTION public.search_streets(
  p_query TEXT,
  p_city TEXT DEFAULT 'Falkensee'
)
RETURNS TABLE (street TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT b.street
  FROM public.buildings b
  WHERE 
    LOWER(b.city) = LOWER(p_city)
    AND LOWER(b.street) LIKE LOWER(p_query) || '%'
    AND b.ausbau_status = 'abgeschlossen'
  ORDER BY b.street
  LIMIT 20;
END;
$$;

-- Create a function to get house numbers for a street
CREATE OR REPLACE FUNCTION public.get_house_numbers(
  p_street TEXT,
  p_city TEXT DEFAULT 'Falkensee'
)
RETURNS TABLE (house_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT b.house_number
  FROM public.buildings b
  WHERE 
    LOWER(b.city) = LOWER(p_city)
    AND LOWER(b.street) = LOWER(p_street)
    AND b.ausbau_status = 'abgeschlossen'
  ORDER BY b.house_number;
END;
$$;

-- Grant execute permissions on these functions to anonymous users
GRANT EXECUTE ON FUNCTION public.check_address_availability TO anon;
GRANT EXECUTE ON FUNCTION public.search_streets TO anon;
GRANT EXECUTE ON FUNCTION public.get_house_numbers TO anon;

-- Now the buildings table is only accessible to admins
-- Public users can only use the safe functions above