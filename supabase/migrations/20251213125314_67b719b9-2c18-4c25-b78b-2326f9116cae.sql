-- Allow public/anonymous users to insert orders
CREATE POLICY "Public can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Allow public to read their own order by some identifier (optional, for confirmation)
-- For now, just the insert policy is needed