import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactFormRequest {
  topic: string;
  desiredProduct: string;
  street: string;
  houseNumber: string;
  city: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  // Honeypot field - should be empty if real user
  website?: string;
}

interface ContactFormSettings {
  enabled: boolean;
  recipient_email: string;
}

const topicLabels: Record<string, string> = {
  'tariff-request': 'Anderer Tarif gewünscht',
  'availability': 'Verfügbarkeitsanfrage',
  'product-info': 'Produktinformationen',
  'other': 'Sonstiges'
};

// Helper to log audit events
async function logAuditEvent(
  actionType: string,
  details: Record<string, any>,
  resourceType: string,
  resourceId: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase.from('audit_logs').insert({
      action_type: actionType,
      action_details: details,
      resource_type: resourceType,
      resource_id: resourceId,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    });
    console.log(`Audit logged: ${actionType}`);
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

// Helper to fetch contact form settings
async function getContactFormSettings(): Promise<ContactFormSettings> {
  const defaultSettings: ContactFormSettings = {
    enabled: false,
    recipient_email: 'kontakt@comin-glasfaser.de'
  };
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'contact_form_settings')
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching contact form settings:', error);
      return defaultSettings;
    }
    
    if (data?.value) {
      return { ...defaultSettings, ...(data.value as object) };
    }
    
    return defaultSettings;
  } catch (error) {
    console.error('Failed to fetch contact form settings:', error);
    return defaultSettings;
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client info for audit logging
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  try {
    const data: ContactFormRequest = await req.json();
    
    // Honeypot check - if website field is filled, it's likely a bot
    if (data.website && data.website.trim() !== '') {
      console.log("Bot detected via honeypot field");
      // Log bot attempt
      await logAuditEvent(
        'bot_detected',
        { method: 'honeypot', form: 'contact_form' },
        'security',
        'contact_form',
        ipAddress,
        userAgent
      );
      // Return success to not alert the bot, but don't send email
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate required fields
    if (!data.name || !data.email || !data.phone) {
      return new Response(
        JSON.stringify({ error: "Name, Email und Telefon sind erforderlich" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return new Response(
        JSON.stringify({ error: "Ungültige E-Mail-Adresse" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch contact form settings
    const contactSettings = await getContactFormSettings();
    console.log('Contact form settings:', JSON.stringify(contactSettings));

    const topicLabel = topicLabels[data.topic] || data.topic;
    const addressInfo = data.street && data.houseNumber 
      ? `${data.street} ${data.houseNumber}, ${data.city || 'N/A'}`
      : 'Nicht angegeben';

    // Check if email sending is enabled
    if (!contactSettings.enabled) {
      console.log('Email sending is disabled - logging request only');
      
      // Log the contact form submission without sending email
      await logAuditEvent(
        'contact_form_logged',
        {
          topic: topicLabel,
          address: addressInfo,
          name: data.name,
          email: data.email,
          phone: data.phone,
          message: data.message || '',
          email_disabled: true,
        },
        'contact',
        'disabled',
        ipAddress,
        userAgent
      );

      return new Response(JSON.stringify({ success: true, email_sent: false }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("Email service not configured");
    }

    const recipientEmail = contactSettings.recipient_email || 'kontakt@comin-glasfaser.de';
    console.log('Sending email to:', recipientEmail);

    // Send notification email to COM-IN via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "COM-IN Kontaktformular <onboarding@resend.dev>",
        to: [recipientEmail],
        reply_to: data.email,
        subject: `Kontaktanfrage: ${topicLabel}`,
        html: `
          <h2>Neue Kontaktanfrage über das Bestellformular</h2>
          
          <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Thema:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${topicLabel}</td>
            </tr>
            ${data.desiredProduct ? `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Wunschprodukt:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${data.desiredProduct}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Adresse:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${addressInfo}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Name:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${data.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">E-Mail:</td>
              <td style="padding: 8px; border: 1px solid #ddd;"><a href="mailto:${data.email}">${data.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Telefon:</td>
              <td style="padding: 8px; border: 1px solid #ddd;"><a href="tel:${data.phone}">${data.phone}</a></td>
            </tr>
          </table>
          
          ${data.message ? `
          <h3 style="margin-top: 20px;">Nachricht:</h3>
          <p style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${data.message.replace(/\n/g, '<br>')}</p>
          ` : ''}
          
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            Diese E-Mail wurde automatisch über das COM-IN Bestellformular generiert.
          </p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error("Failed to send email");
    }

    const result = await emailResponse.json();
    console.log("Contact form email sent successfully:", result.id);

    // Log successful contact form submission
    await logAuditEvent(
      'contact_form_submitted',
      {
        topic: topicLabel,
        address: addressInfo,
        email_id: result.id,
        recipient: recipientEmail,
      },
      'contact',
      result.id,
      ipAddress,
      userAgent
    );

    return new Response(JSON.stringify({ success: true, id: result.id, email_sent: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-contact-form function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
