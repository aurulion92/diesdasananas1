-- Add image_url column to document_templates for logo/image uploads
ALTER TABLE public.document_templates 
ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.document_templates.image_url IS 'URL to uploaded image (e.g., logo for email templates)';