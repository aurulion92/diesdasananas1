-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;

-- Create a permissive INSERT policy for public order creation
CREATE POLICY "Public can create orders" 
ON public.orders 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);