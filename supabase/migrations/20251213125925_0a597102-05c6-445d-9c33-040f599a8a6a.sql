-- Add use_case field to document_templates for identifying when a template is used
ALTER TABLE public.document_templates 
ADD COLUMN IF NOT EXISTS use_case text UNIQUE;

-- Add comment explaining use_case values
COMMENT ON COLUMN public.document_templates.use_case IS 'Unique identifier for when this template is used. Examples: order_vzf, contact_form, order_confirmation, etc.';

-- Create index for fast lookup by use_case
CREATE INDEX IF NOT EXISTS idx_document_templates_use_case ON public.document_templates(use_case) WHERE use_case IS NOT NULL;