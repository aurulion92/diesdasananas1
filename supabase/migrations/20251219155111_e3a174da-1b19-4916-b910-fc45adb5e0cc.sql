-- Add new columns for advanced template configuration
ALTER TABLE public.document_templates 
ADD COLUMN IF NOT EXISTS variable_mappings jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS trigger_event text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS auto_send boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS send_as_attachment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recipient_type text DEFAULT 'customer',
ADD COLUMN IF NOT EXISTS email_subject_template text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.document_templates.variable_mappings IS 'Custom variable definitions: [{key, source_type, source_field, formula, default_value}]';
COMMENT ON COLUMN public.document_templates.trigger_event IS 'Event that triggers document generation: order_created, order_confirmed, order_completed, manual';
COMMENT ON COLUMN public.document_templates.auto_send IS 'Whether to automatically send when trigger event occurs';
COMMENT ON COLUMN public.document_templates.send_as_attachment IS 'Whether to send as email attachment';
COMMENT ON COLUMN public.document_templates.recipient_type IS 'Who receives the document: customer, admin, both';
COMMENT ON COLUMN public.document_templates.email_subject_template IS 'Email subject template with placeholders';