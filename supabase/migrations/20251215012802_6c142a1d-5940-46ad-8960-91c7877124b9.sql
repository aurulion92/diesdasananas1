-- Add explicit RLS policies for rate_limits table
-- Only admins should be able to view and manage rate limits

CREATE POLICY "Admins can manage rate limits"
ON public.rate_limits
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow the rate limit function to insert/update (it runs as security definer)
CREATE POLICY "System can manage rate limits"
ON public.rate_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- Actually, remove the overly permissive policy and use security definer approach
-- The check_rate_limit function already uses SECURITY DEFINER, so it bypasses RLS
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;

-- Add explicit SELECT policy for orders - only admins can read
CREATE POLICY "Only admins can read orders"
ON public.orders
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add explicit SELECT policy for customers - only admins can read  
CREATE POLICY "Only admins can read customers"
ON public.customers
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add explicit SELECT policy for app_settings - only admins can read
CREATE POLICY "Only admins can read settings"
ON public.app_settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));