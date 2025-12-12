-- Create document_templates table
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'general', -- 'vzf', 'confirmation', 'invoice', 'general'
  content TEXT NOT NULL, -- HTML content with placeholders
  placeholders JSONB DEFAULT '[]'::jsonb, -- Array of placeholder definitions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Admin policy
CREATE POLICY "Admins can manage document templates"
ON public.document_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index
CREATE INDEX idx_document_templates_type ON public.document_templates(template_type);
CREATE INDEX idx_document_templates_active ON public.document_templates(is_active);