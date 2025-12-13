-- Add includes_fiber_tv column to products table
ALTER TABLE public.products 
ADD COLUMN includes_fiber_tv boolean DEFAULT false;