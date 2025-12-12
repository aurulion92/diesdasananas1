-- Fix customers table RLS - only admins should access customer data
-- First drop any permissive policies if they exist
DROP POLICY IF EXISTS "Public can read customers" ON public.customers;

-- The existing "Admins can manage customers" policy should handle all access
-- But let's verify it's a RESTRICTIVE policy for ALL operations
-- The current policy is already correct - it uses has_role for admin check