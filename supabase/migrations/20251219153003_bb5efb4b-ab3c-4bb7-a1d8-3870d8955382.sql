-- Add cluster field to buildings for internal grouping
ALTER TABLE public.buildings
ADD COLUMN IF NOT EXISTS cluster text;

-- Create index for cluster queries
CREATE INDEX IF NOT EXISTS idx_buildings_cluster ON public.buildings(cluster);

-- Create admin permissions enum for granular access control
CREATE TYPE public.admin_permission AS ENUM (
  'buildings_read', 'buildings_write',
  'products_read', 'products_write',
  'options_read', 'options_write',
  'promotions_read', 'promotions_write',
  'orders_read', 'orders_write',
  'customers_read', 'customers_write',
  'settings_read', 'settings_write',
  'users_read', 'users_write',
  'logs_read',
  'decision_tree_read', 'decision_tree_write',
  'documents_read', 'documents_write'
);

-- Create admin_permissions table for granular permissions per user
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission admin_permission NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, permission)
);

-- Enable RLS on admin_permissions
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage permissions
CREATE POLICY "Admins can manage admin permissions"
ON public.admin_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission admin_permission)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_permissions
    WHERE user_id = _user_id
      AND permission = _permission
  )
  -- Also check if user is admin (admins have all permissions by default)
  OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Add cluster to CONDITION_FIELDS in decision tree (done via code)