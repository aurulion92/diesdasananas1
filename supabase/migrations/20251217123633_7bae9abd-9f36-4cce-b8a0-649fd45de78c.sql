-- Drop and recreate the INSERT policy with explicit public role
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create policy that explicitly allows ALL roles to insert
CREATE POLICY "Public can insert orders" 
ON public.orders 
FOR INSERT 
TO public
WITH CHECK (true);