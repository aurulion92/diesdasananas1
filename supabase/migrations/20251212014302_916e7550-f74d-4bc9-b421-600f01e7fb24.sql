-- Drop the restrictive policy and create a proper permissive one
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;

-- Create a PERMISSIVE policy for admin access (default is PERMISSIVE)
CREATE POLICY "Admins can manage customers" 
ON public.customers 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));