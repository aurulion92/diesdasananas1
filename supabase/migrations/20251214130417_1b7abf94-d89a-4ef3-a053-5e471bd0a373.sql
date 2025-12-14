-- Add price_type column to promotion_discounts to distinguish between monthly and one-time discounts
ALTER TABLE public.promotion_discounts 
ADD COLUMN price_type text NOT NULL DEFAULT 'monthly' 
CHECK (price_type IN ('monthly', 'one_time'));