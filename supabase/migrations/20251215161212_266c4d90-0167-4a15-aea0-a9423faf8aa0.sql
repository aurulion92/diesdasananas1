-- Create table for phone porting providers
CREATE TABLE public.phone_porting_providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    display_name text NOT NULL,
    provider_code text,
    is_other boolean DEFAULT false,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.phone_porting_providers ENABLE ROW LEVEL SECURITY;

-- Admin can manage
CREATE POLICY "Admins can manage porting providers"
ON public.phone_porting_providers
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Public can read active providers
CREATE POLICY "Public can read active porting providers"
ON public.phone_porting_providers
FOR SELECT
USING (is_active = true);

-- Insert initial providers
INSERT INTO public.phone_porting_providers (name, display_name, provider_code, is_other, display_order) VALUES
('Telekom Deutschland GmbH', 'Telekom', '2 D001', false, 1),
('Vodafone D2 GmbH', 'Vodafone', '8 D009', false, 2),
('Telefonica Germany GmbH & Co. OHG', 'Telefonica (O2)', '17 D019', false, 3),
('Mnet Telekommunikations GmbH', 'Mnet', '44 D052', false, 4),
('Vodafone Kabel Deutschland GmbH', 'Vodafone/Kabel', '171 D191', false, 5),
('1&1 Telecom GmbH', '1&1', '181 D201', false, 6),
('Faxverfahren', 'Sonstige', '411', true, 99);