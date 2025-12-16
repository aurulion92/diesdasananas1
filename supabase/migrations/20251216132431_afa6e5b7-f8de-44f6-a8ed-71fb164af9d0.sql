-- Create audit_logs table for tracking all important actions
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL, -- 'order_created', 'admin_login', 'settings_changed', 'building_updated', etc.
  action_details JSONB DEFAULT '{}'::jsonb, -- Flexible details about the action
  user_id UUID, -- NULL for anonymous actions (orders, contact forms)
  user_email TEXT, -- For display purposes
  ip_address TEXT,
  user_agent TEXT,
  resource_type TEXT, -- 'order', 'building', 'product', 'settings', etc.
  resource_id TEXT, -- ID of the affected resource
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow insert from edge functions (service role) and anonymous for public actions
CREATE POLICY "Allow insert for logging"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);