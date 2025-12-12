-- Create enum types for building status and expansion type
CREATE TYPE public.ausbau_art AS ENUM ('ftth', 'fttb');
CREATE TYPE public.ausbau_status AS ENUM ('abgeschlossen', 'im_ausbau', 'geplant');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create admin user roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy for user_roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Buildings/Objects table
CREATE TABLE public.buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    street TEXT NOT NULL,
    house_number TEXT NOT NULL,
    postal_code TEXT,
    city TEXT NOT NULL DEFAULT 'Falkensee',
    residential_units INTEGER DEFAULT 1,
    tiefbau_done BOOLEAN DEFAULT false,
    apl_set BOOLEAN DEFAULT false,
    ausbau_art ausbau_art,
    ausbau_status ausbau_status DEFAULT 'geplant',
    kabel_tv_available BOOLEAN DEFAULT false,
    gebaeude_id_v2 TEXT,
    gebaeude_id_k7 TEXT,
    is_manual_entry BOOLEAN DEFAULT false,
    has_manual_override BOOLEAN DEFAULT false,
    manual_override_active BOOLEAN DEFAULT true,
    original_csv_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(street, house_number, city)
);

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage buildings" ON public.buildings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read buildings" ON public.buildings
FOR SELECT TO anon, authenticated
USING (true);

-- Products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    monthly_price DECIMAL(10,2) NOT NULL,
    setup_fee DECIMAL(10,2) DEFAULT 99.00,
    download_speed INTEGER,
    upload_speed INTEGER,
    is_ftth BOOLEAN DEFAULT true,
    is_fttb BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    product_id_k7 TEXT,
    contract_months INTEGER DEFAULT 24,
    includes_phone BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage products" ON public.products
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read active products" ON public.products
FOR SELECT TO anon, authenticated
USING (is_active = true);

-- Product options table
CREATE TABLE public.product_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'router', 'phone', 'tv_comin', 'tv_waipu', 'tv_hardware'
    monthly_price DECIMAL(10,2) DEFAULT 0,
    one_time_price DECIMAL(10,2) DEFAULT 0,
    is_ftth BOOLEAN DEFAULT true,
    is_fttb BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    requires_kabel_tv BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage options" ON public.product_options
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read active options" ON public.product_options
FOR SELECT TO anon, authenticated
USING (is_active = true);

-- Product-Option mapping with K7 IDs
CREATE TABLE public.product_option_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    option_id UUID REFERENCES public.product_options(id) ON DELETE CASCADE NOT NULL,
    option_id_k7 TEXT,
    is_included BOOLEAN DEFAULT false,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(product_id, option_id)
);

ALTER TABLE public.product_option_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage mappings" ON public.product_option_mappings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read mappings" ON public.product_option_mappings
FOR SELECT TO anon, authenticated
USING (true);

-- Promotions/Actions table
CREATE TABLE public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    description TEXT,
    is_global BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    requires_customer_number BOOLEAN DEFAULT false,
    available_text TEXT,
    unavailable_text TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promotions" ON public.promotions
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read active promotions" ON public.promotions
FOR SELECT TO anon, authenticated
USING (is_active = true);

-- Promotion building assignments
CREATE TABLE public.promotion_buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID REFERENCES public.promotions(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(promotion_id, building_id)
);

ALTER TABLE public.promotion_buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promotion buildings" ON public.promotion_buildings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read promotion buildings" ON public.promotion_buildings
FOR SELECT TO anon, authenticated
USING (true);

-- Promotion discounts/subsidies
CREATE TABLE public.promotion_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID REFERENCES public.promotions(id) ON DELETE CASCADE NOT NULL,
    discount_type TEXT NOT NULL, -- 'percentage', 'fixed', 'waive_fee'
    discount_amount DECIMAL(10,2),
    applies_to TEXT NOT NULL, -- 'setup_fee', 'monthly', 'router', 'option'
    target_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    target_option_id UUID REFERENCES public.product_options(id) ON DELETE SET NULL,
    k7_template_type TEXT, -- 'option', 'product', 'cost_revenue'
    k7_template_id TEXT,
    k7_product_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promotion_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage discounts" ON public.promotion_discounts
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read discounts" ON public.promotion_discounts
FOR SELECT TO anon, authenticated
USING (true);

-- Customer database (placeholder)
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_number TEXT NOT NULL UNIQUE,
    name TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage customers" ON public.customers
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- CSV import logs
CREATE TABLE public.csv_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_type TEXT NOT NULL, -- 'buildings', 'products', etc.
    file_name TEXT,
    source_url TEXT,
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    errors JSONB,
    imported_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.csv_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage import logs" ON public.csv_import_logs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- App settings for CSV URL etc.
CREATE TABLE public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.app_settings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply update triggers
CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON public.buildings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_options_updated_at BEFORE UPDATE ON public.product_options
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert test data: Buildings
INSERT INTO public.buildings (street, house_number, city, ausbau_art, ausbau_status, residential_units, tiefbau_done, apl_set, kabel_tv_available) VALUES
('Fontanestraße', '1-10', 'Falkensee', 'fttb', 'abgeschlossen', 50, true, true, false),
('Seerosenweg', '1', 'Falkensee', 'ftth', 'abgeschlossen', 1, true, true, true),
('Nürnberger Straße', '1', 'Falkensee', 'ftth', 'abgeschlossen', 1, true, true, true);

-- Insert test data: Customer
INSERT INTO public.customers (customer_number, name) VALUES
('KD123456', 'Testkunde');

-- Insert test data: Products
INSERT INTO public.products (name, slug, monthly_price, download_speed, upload_speed, is_ftth, is_fttb, display_order, includes_phone) VALUES
('FiberBasic 100', 'fiber-basic-100', 34.90, 100, 50, true, false, 0, true),
('einfach 150', 'einfach-150', 34.90, 150, 75, true, true, 1, false),
('einfach 300', 'einfach-300', 44.90, 300, 150, true, true, 2, false),
('einfach 600', 'einfach-600', 54.90, 600, 300, true, true, 3, false),
('einfach 1000', 'einfach-1000', 69.90, 1000, 500, true, true, 4, false);

-- Insert test data: Product Options
INSERT INTO public.product_options (name, slug, category, monthly_price, one_time_price, is_ftth, is_fttb, display_order, requires_kabel_tv) VALUES
('FRITZ!Box 5690', 'fritzbox-5690', 'router', 4.00, 0, true, false, 1, false),
('FRITZ!Box 5690 Pro', 'fritzbox-5690-pro', 'router', 10.00, 0, true, false, 2, false),
('FRITZ!Box 7690', 'fritzbox-7690', 'router', 7.00, 0, false, true, 3, false),
('Telefon Flat Festnetz', 'telefon-flat', 'phone', 2.95, 0, true, true, 1, false),
('COM-IN TV', 'comin-tv', 'tv_comin', 10.00, 0, true, false, 1, true),
('COM-IN TV HD', 'comin-tv-hd', 'tv_comin', 5.00, 0, true, false, 2, true),
('Smartcard Aktivierung', 'smartcard', 'tv_hardware', 0, 29.90, true, false, 1, true),
('Receiver Technistar 4K', 'receiver-4k', 'tv_hardware', 4.90, 0, true, false, 2, true),
('CI+ Modul', 'ci-modul', 'tv_hardware', 0, 79.90, true, false, 3, true),
('waipu.tv Comfort', 'waipu-comfort', 'tv_waipu', 7.99, 0, true, true, 1, false),
('waipu.tv Premium', 'waipu-premium', 'tv_waipu', 13.99, 0, true, true, 2, false),
('waipu 4K Stick', 'waipu-stick', 'tv_hardware', 0, 40.00, true, true, 3, false);

-- Insert test data: Promotions
INSERT INTO public.promotions (name, code, description, is_global, is_active, requires_customer_number, available_text, unavailable_text) VALUES
('GWG Test Aktion', 'GWG-TEST', 'Testkation für Fontanestraße - 4€ Routerrabatt + Bereitstellungspreis erlassen', false, true, false, 'Aktion verfügbar: 4€ Router-Rabatt + keine Bereitstellungsgebühr', 'Diese Aktion ist für Ihre Adresse nicht verfügbar'),
('Kunden werben Kunden', 'KD-WERBEN', '50€ Prämie für Werber und Geworbenen', true, true, true, 'Geben Sie die Kundennummer Ihres Werbers ein für 50€ Prämie', 'Ungültige Kundennummer');