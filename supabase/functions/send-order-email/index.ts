import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  vzfHtml: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { orderId, customerEmail, customerName, vzfHtml }: OrderEmailRequest = await req.json();

    console.log(`Processing order email for order ${orderId} to ${customerEmail}`);

    // Fetch email settings from app_settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "email_settings")
      .maybeSingle();

    if (settingsError || !settingsData?.value) {
      console.error("Email settings not found:", settingsError);
      return new Response(
        JSON.stringify({ error: "E-Mail-Einstellungen nicht konfiguriert" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailSettings = settingsData.value as {
      smtp_host: string;
      smtp_port: string;
      smtp_user: string;
      smtp_password: string;
      sender_email: string;
      sender_name: string;
    };

    // Validate settings
    if (!emailSettings.smtp_host || !emailSettings.smtp_user || !emailSettings.smtp_password || !emailSettings.sender_email) {
      console.error("Incomplete email settings");
      return new Response(
        JSON.stringify({ error: "E-Mail-Einstellungen unvollständig" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch email template
    const { data: templateData } = await supabase
      .from("document_templates")
      .select("content, name")
      .eq("is_active", true)
      .returns<any[]>();

    const emailTemplate = templateData?.find((t: any) => t.use_case === "order_confirmation_email");

    // Build email content
    let emailHtml: string;
    if (emailTemplate?.content) {
      emailHtml = emailTemplate.content
        .replace(/\{\{customer_name\}\}/g, customerName)
        .replace(/\{\{order_id\}\}/g, orderId);
    } else {
      // Default email template
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #1a2b52; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a2b52; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f5f6f8; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>COM-IN Glasfaser</h1>
            </div>
            <div class="content">
              <h2>Vielen Dank für Ihre Bestellung, ${customerName}!</h2>
              <p>Ihre Bestellung ist bei uns eingegangen und befindet sich nun in Bearbeitung.</p>
              <p><strong>Bestellnummer:</strong> ${orderId}</p>
              <p>Im Anhang finden Sie Ihre Vertragsübersicht (VZF) mit allen Details zu Ihrer Bestellung.</p>
              <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
              <p>Mit freundlichen Grüßen,<br>Ihr COM-IN Team</p>
            </div>
            <div class="footer">
              <p>COM-IN Glasfaser | kontakt@comin-glasfaser.de</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: emailSettings.smtp_host,
        port: parseInt(emailSettings.smtp_port) || 587,
        tls: true,
        auth: {
          username: emailSettings.smtp_user,
          password: emailSettings.smtp_password,
        },
      },
    });

    // Create VZF attachment as base64
    const vzfBase64 = btoa(unescape(encodeURIComponent(vzfHtml)));

    console.log(`Sending email via ${emailSettings.smtp_host}:${emailSettings.smtp_port}`);

    // Send email with attachment
    await client.send({
      from: `${emailSettings.sender_name} <${emailSettings.sender_email}>`,
      to: customerEmail,
      subject: `Bestellbestätigung - COM-IN Glasfaser (${orderId.substring(0, 8)})`,
      content: "Bitte aktivieren Sie HTML-Anzeige für diese E-Mail.",
      html: emailHtml,
      attachments: [
        {
          filename: `VZF_${orderId.substring(0, 8)}.html`,
          content: vzfBase64,
          encoding: "base64",
          contentType: "text/html",
        },
      ],
    });

    await client.close();

    console.log(`Email sent successfully to ${customerEmail}`);

    return new Response(
      JSON.stringify({ success: true, message: "E-Mail erfolgreich gesendet" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "E-Mail konnte nicht gesendet werden" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
