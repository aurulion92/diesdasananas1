-- Add use_cases array column and pdf_url for uploaded PDF templates
ALTER TABLE public.document_templates 
ADD COLUMN use_cases text[] DEFAULT '{}'::text[];

ALTER TABLE public.document_templates 
ADD COLUMN pdf_url text;

-- Migrate existing use_case values to use_cases array
UPDATE public.document_templates 
SET use_cases = ARRAY[use_case]
WHERE use_case IS NOT NULL AND use_case != '';