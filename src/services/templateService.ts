import { supabase } from '@/integrations/supabase/client';

export interface TemplateData {
  id: string;
  name: string;
  content: string;
  template_type: string;
  use_case: string | null;
  is_active: boolean;
}

/**
 * Fetch a template by its use_case identifier
 * @param useCase - The unique use case identifier (e.g., 'order_vzf', 'contact_form')
 * @returns The template content or null if not found
 */
export async function getTemplateByUseCase(useCase: string): Promise<TemplateData | null> {
  const { data, error } = await supabase
    .from('document_templates')
    .select('id, name, content, template_type, use_case, is_active')
    .eq('use_case', useCase)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching template:', error);
    return null;
  }

  return data as TemplateData | null;
}

/**
 * Replace placeholders in template content with actual values
 * @param content - The template HTML content
 * @param placeholders - Object with placeholder keys and their values
 * @returns The rendered HTML content
 */
export function renderTemplate(content: string, placeholders: Record<string, string>): string {
  let rendered = content;
  
  Object.entries(placeholders).forEach(([key, value]) => {
    // Support both {{key}} and {{key}} formats
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(regex, value);
  });
  
  return rendered;
}

/**
 * Available use cases for templates
 */
export const TEMPLATE_USE_CASES = [
  { value: 'order_vzf', label: 'VZF bei Bestellung', description: 'Wird bei Bestellabschluss und VZF-Rekonstruktion verwendet' },
  { value: 'order_confirmation_email', label: 'Bestellbestätigung E-Mail', description: 'E-Mail nach erfolgreicher Bestellung' },
  { value: 'contact_form_response', label: 'Kontaktformular Antwort', description: 'Automatische Antwort auf Kontaktanfragen' },
  { value: 'move_request_confirmation', label: 'Umzugsanfrage Bestätigung', description: 'Bestätigung für Umzugsmeldungen' },
  { value: 'issue_report_confirmation', label: 'Störungsmeldung Bestätigung', description: 'Bestätigung für gemeldete Störungen' },
  { value: 'upgrade_vzf', label: 'VZF bei Tarifwechsel', description: 'VZF für Bestandskunden-Upgrades' },
] as const;

export type TemplateUseCase = typeof TEMPLATE_USE_CASES[number]['value'];
