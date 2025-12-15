import { supabase } from '@/integrations/supabase/client';

export interface TemplateData {
  id: string;
  name: string;
  content: string;
  template_type: string;
  use_case: string | null;
  use_cases: string[];
  pdf_url: string | null;
  image_url: string | null;
  is_active: boolean;
}

/**
 * Fetch a template by its use_case identifier
 * Now searches in use_cases array
 * @param useCase - The unique use case identifier (e.g., 'order_vzf', 'contact_form')
 * @returns The template content or null if not found
 */
export async function getTemplateByUseCase(useCase: string): Promise<TemplateData | null> {
  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .eq('is_active', true)
    .returns<any[]>();

  if (error) {
    console.error('Error fetching template:', error);
    return null;
  }

  // Search in use_cases array or legacy use_case field
  const template = data?.find((t: any) => {
    const useCases = Array.isArray(t.use_cases) ? t.use_cases : [];
    return useCases.includes(useCase) || t.use_case === useCase;
  });
  
  if (!template) {
    return null;
  }

  return {
    id: template.id,
    name: template.name,
    content: template.content,
    template_type: template.template_type,
    use_case: template.use_case,
    use_cases: Array.isArray(template.use_cases) ? template.use_cases : [],
    pdf_url: template.pdf_url || null,
    image_url: template.image_url || null,
    is_active: template.is_active,
  };
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
  { 
    value: 'order_vzf', 
    label: 'VZF bei Bestellung', 
    description: 'VZF-Download im Bestellworkflow + Rekonstruktion im Admin-Panel',
    usedIn: ['VZF-Download Button bei Bestellung', 'VZF regenerieren in Bestellübersicht (Admin)'],
    attachmentInfo: 'Wird auch als PDF-Anhang in Bestätigungs-E-Mail verwendet'
  },
  { 
    value: 'order_confirmation_email', 
    label: 'Bestellbestätigung E-Mail', 
    description: 'E-Mail-Text nach erfolgreicher Bestellung',
    usedIn: ['Automatischer E-Mail-Versand nach Bestellabschluss'],
    attachmentInfo: 'VZF wird als PDF-Anhang beigefügt (aus order_vzf Template)'
  },
  { 
    value: 'contact_form_response', 
    label: 'Kontaktformular Antwort', 
    description: 'Automatische Antwort auf Kontaktanfragen',
    usedIn: ['Kontaktformular-Bestätigung'],
    attachmentInfo: null
  },
  { 
    value: 'move_request_confirmation', 
    label: 'Umzugsanfrage Bestätigung', 
    description: 'Bestätigung für Umzugsmeldungen',
    usedIn: ['Umzugsformular im Kundenportal'],
    attachmentInfo: null
  },
  { 
    value: 'issue_report_confirmation', 
    label: 'Störungsmeldung Bestätigung', 
    description: 'Bestätigung für gemeldete Störungen',
    usedIn: ['Störungsformular im Kundenportal'],
    attachmentInfo: null
  },
  { 
    value: 'upgrade_vzf', 
    label: 'VZF bei Tarifwechsel', 
    description: 'VZF für Bestandskunden-Upgrades',
    usedIn: ['Upgrade-Prozess im Kundenportal'],
    attachmentInfo: null
  },
  { 
    value: 'email_logo', 
    label: 'E-Mail Logo', 
    description: 'Logo-Bild für E-Mail-Header (Bild hochladen)',
    usedIn: ['Automatische E-Mails'],
    attachmentInfo: 'Bild wird als {{logo_url}} Platzhalter verfügbar'
  },
  { 
    value: 'order_attachment_agb', 
    label: 'E-Mail Anhang: AGB', 
    description: 'AGB-PDF als Anhang bei Bestellbestätigung',
    usedIn: ['Bestellbestätigungs-E-Mail'],
    attachmentInfo: 'Wird als PDF-Anhang beigefügt'
  },
  { 
    value: 'order_attachment_produktinfo', 
    label: 'E-Mail Anhang: Produktinfo', 
    description: 'Produktinformationsblatt als Anhang',
    usedIn: ['Bestellbestätigungs-E-Mail'],
    attachmentInfo: 'Wird als PDF-Anhang beigefügt'
  },
] as const;

export type TemplateUseCase = typeof TEMPLATE_USE_CASES[number]['value'];

/**
 * Get the default email template HTML for order confirmations
 */
export const DEFAULT_ORDER_CONFIRMATION_EMAIL = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #1a2b52; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(180deg, #1a2b52 0%, #152244 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; background: #f5f6f8; }
    .card { background: white; border-radius: 12px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    .highlight { background: #fff4e6; border-left: 4px solid #ff8c00; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; background: #1a2b52; color: #ccc; }
    .footer a { color: #ff8c00; }
    .order-number { font-size: 28px; font-weight: bold; color: #1a2b52; text-align: center; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>COM-IN Glasfaser</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.8;">Bestellbestätigung</p>
    </div>
    <div class="content">
      <div class="card">
        <h2 style="margin-top: 0;">Vielen Dank für Ihre Bestellung, {{customer_name}}!</h2>
        <p>Ihre Bestellung ist bei uns eingegangen und befindet sich nun in Bearbeitung.</p>
        <div class="order-number">{{order_id}}</div>
      </div>
      
      <div class="highlight">
        <strong>Wichtiger Hinweis:</strong><br>
        Im Anhang finden Sie Ihre Vertragszusammenfassung (VZF) mit allen Details zu Ihrer Bestellung. Bitte bewahren Sie diese Unterlagen sorgfältig auf.
      </div>
      
      <div class="card">
        <h3 style="margin-top: 0;">Wie geht es weiter?</h3>
        <ol style="padding-left: 20px;">
          <li>Wir prüfen Ihre Bestellung</li>
          <li>Sie erhalten eine Terminbestätigung</li>
          <li>Unser Techniker aktiviert Ihren Anschluss</li>
        </ol>
        <p>Die aktuelle Bearbeitungszeit beträgt ca. 2-3 Wochen.</p>
      </div>
      
      <div class="card">
        <h3 style="margin-top: 0;">Fragen?</h3>
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung:</p>
        <p>📧 <a href="mailto:kontakt@comin-glasfaser.de">kontakt@comin-glasfaser.de</a></p>
      </div>
      
      <p style="text-align: center; color: #666;">Mit freundlichen Grüßen,<br><strong>Ihr COM-IN Team</strong></p>
    </div>
    <div class="footer">
      <p>COM-IN Glasfaser | <a href="mailto:kontakt@comin-glasfaser.de">kontakt@comin-glasfaser.de</a></p>
      <p style="font-size: 10px; margin-top: 10px;">Diese E-Mail wurde automatisch generiert.</p>
    </div>
  </div>
</body>
</html>`;
