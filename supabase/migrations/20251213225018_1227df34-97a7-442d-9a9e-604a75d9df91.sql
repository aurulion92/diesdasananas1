-- Add is_archived column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Add archived_at timestamp
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;