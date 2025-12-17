-- Add RLS policy to allow public reading of design and branding settings
CREATE POLICY "Public can read design and branding settings"
ON public.app_settings
FOR SELECT
USING (key IN ('design_settings', 'branding_settings'));