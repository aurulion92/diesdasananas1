-- Allow public read access to site_password_settings
CREATE POLICY "Public can read site password settings"
ON public.app_settings
FOR SELECT
USING (key = 'site_password_settings');