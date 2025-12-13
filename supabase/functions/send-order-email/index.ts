import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        .replace(/\{\{order_id\}\}/g, orderId.substring(0, 8).toUpperCase());
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
              <p><strong>Bestellnummer:</strong> ${orderId.substring(0, 8).toUpperCase()}</p>
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

    console.log(`Sending email via ${emailSettings.smtp_host}:${emailSettings.smtp_port}`);

    // Use fetch to send via an SMTP relay API approach
    // Since Deno SMTP libraries have issues, we'll use a raw SMTP connection via Deno.connect
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Connect to SMTP server with STARTTLS
    const conn = await Deno.connect({
      hostname: emailSettings.smtp_host,
      port: parseInt(emailSettings.smtp_port) || 587,
    });

    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      if (n === null) return "";
      return decoder.decode(buffer.subarray(0, n));
    };

    const sendCommand = async (cmd: string): Promise<string> => {
      await conn.write(encoder.encode(cmd + "\r\n"));
      return await readResponse();
    };

    try {
      // Read greeting
      let response = await readResponse();
      console.log("SMTP greeting:", response.trim());

      // EHLO
      response = await sendCommand(`EHLO localhost`);
      console.log("EHLO response:", response.substring(0, 100));

      // STARTTLS
      response = await sendCommand("STARTTLS");
      console.log("STARTTLS response:", response.trim());

      if (!response.startsWith("220")) {
        throw new Error("STARTTLS not supported: " + response);
      }

      // Upgrade to TLS
      const tlsConn = await Deno.startTls(conn, {
        hostname: emailSettings.smtp_host,
      });

      const readTlsResponse = async (): Promise<string> => {
        const buffer = new Uint8Array(4096);
        const n = await tlsConn.read(buffer);
        if (n === null) return "";
        return decoder.decode(buffer.subarray(0, n));
      };

      const sendTlsCommand = async (cmd: string): Promise<string> => {
        await tlsConn.write(encoder.encode(cmd + "\r\n"));
        return await readTlsResponse();
      };

      // EHLO again after TLS
      response = await sendTlsCommand(`EHLO localhost`);
      console.log("EHLO (TLS) response received");

      // AUTH LOGIN
      response = await sendTlsCommand("AUTH LOGIN");
      if (!response.startsWith("334")) {
        throw new Error("AUTH LOGIN failed: " + response);
      }

      // Send username (base64)
      response = await sendTlsCommand(btoa(emailSettings.smtp_user));
      if (!response.startsWith("334")) {
        throw new Error("Username rejected: " + response);
      }

      // Send password (base64)
      response = await sendTlsCommand(btoa(emailSettings.smtp_password));
      if (!response.startsWith("235")) {
        throw new Error("Authentication failed: " + response);
      }
      console.log("Authentication successful");

      // MAIL FROM
      response = await sendTlsCommand(`MAIL FROM:<${emailSettings.sender_email}>`);
      if (!response.startsWith("250")) {
        throw new Error("MAIL FROM failed: " + response);
      }

      // RCPT TO
      response = await sendTlsCommand(`RCPT TO:<${customerEmail}>`);
      if (!response.startsWith("250")) {
        throw new Error("RCPT TO failed: " + response);
      }

      // DATA
      response = await sendTlsCommand("DATA");
      if (!response.startsWith("354")) {
        throw new Error("DATA command failed: " + response);
      }

      // Build email with attachment
      const boundary = "----=_Part_" + Date.now().toString(36);
      const vzfBase64 = btoa(unescape(encodeURIComponent(vzfHtml)));

      const emailContent = [
        `From: ${emailSettings.sender_name} <${emailSettings.sender_email}>`,
        `To: ${customerEmail}`,
        `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(`Bestellbestätigung - COM-IN Glasfaser (${orderId.substring(0, 8).toUpperCase()})`)))}?=`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/html; charset=UTF-8`,
        `Content-Transfer-Encoding: base64`,
        ``,
        btoa(unescape(encodeURIComponent(emailHtml))),
        ``,
        `--${boundary}`,
        `Content-Type: text/html; charset=UTF-8; name="VZF_${orderId.substring(0, 8).toUpperCase()}.html"`,
        `Content-Disposition: attachment; filename="VZF_${orderId.substring(0, 8).toUpperCase()}.html"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        vzfBase64,
        ``,
        `--${boundary}--`,
        `.`,
      ].join("\r\n");

      await tlsConn.write(encoder.encode(emailContent + "\r\n"));
      response = await readTlsResponse();
      
      if (!response.startsWith("250")) {
        throw new Error("Email sending failed: " + response);
      }
      console.log("Email sent successfully");

      // QUIT
      await sendTlsCommand("QUIT");
      tlsConn.close();

    } catch (smtpError) {
      conn.close();
      throw smtpError;
    }

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
