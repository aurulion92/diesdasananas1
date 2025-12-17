-- Add discount duration field to promotion_discounts
ALTER TABLE public.promotion_discounts 
ADD COLUMN IF NOT EXISTS discount_duration_months integer DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.promotion_discounts.discount_duration_months IS 'Duration in months for which this discount applies (e.g., 24 for "für 24 Monate")';