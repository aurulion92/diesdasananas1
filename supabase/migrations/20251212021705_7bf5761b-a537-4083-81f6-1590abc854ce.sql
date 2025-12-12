-- Create orders table to capture all submitted orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Customer data
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_name TEXT NOT NULL,
  customer_first_name TEXT,
  customer_last_name TEXT,
  
  -- Address
  street TEXT NOT NULL,
  house_number TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Falkensee',
  postal_code TEXT,
  apartment TEXT,
  floor TEXT,
  
  -- Product selection
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  product_monthly_price NUMERIC NOT NULL,
  
  -- Selected options (stored as JSONB for flexibility)
  selected_options JSONB DEFAULT '[]',
  
  -- Pricing
  monthly_total NUMERIC NOT NULL,
  setup_fee NUMERIC NOT NULL DEFAULT 99.00,
  one_time_total NUMERIC NOT NULL DEFAULT 0,
  
  -- Applied promotions
  applied_promotions JSONB DEFAULT '[]',
  promo_code TEXT,
  
  -- Referral
  referral_customer_number TEXT,
  
  -- Contract details
  contract_months INTEGER NOT NULL DEFAULT 24,
  desired_start_date DATE,
  express_activation BOOLEAN DEFAULT false,
  
  -- Phone porting
  phone_porting BOOLEAN DEFAULT false,
  phone_porting_numbers JSONB DEFAULT '[]',
  phone_porting_provider TEXT,
  
  -- Previous provider cancellation
  cancel_previous_provider BOOLEAN DEFAULT false,
  previous_provider_name TEXT,
  previous_provider_customer_number TEXT,
  previous_provider_phone TEXT,
  
  -- Bank details
  bank_account_holder TEXT,
  bank_iban TEXT,
  
  -- VZF data (complete order snapshot for reconstruction)
  vzf_data JSONB NOT NULL,
  vzf_generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMP WITH TIME ZONE,
  archived_by UUID,
  
  -- Connection type
  connection_type TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Admin can manage orders
CREATE POLICY "Admins can manage orders" 
ON public.orders 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_is_archived ON public.orders(is_archived);
CREATE INDEX idx_orders_customer_email ON public.orders(customer_email);