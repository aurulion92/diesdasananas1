import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - jspdf works in Deno
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string;
  salutation?: string;
  vzfHtml: string;
  vzfData?: {
    tariffName?: string;
    tariffPrice?: number;
    monthlyTotal?: number;
    oneTimeTotal?: number;
    setupFee?: number;
    contractDuration?: number;
    street?: string;
    houseNumber?: string;
    city?: string;
    selectedOptions?: Array<{ name: string; monthlyPrice?: number; oneTimePrice?: number }>;
  };
}

// Generate a PDF from VZF data
function generateVZFPdf(vzfData: OrderEmailRequest['vzfData'], customerName: string, orderId: string): Uint8Array {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  const lineHeight = 7;
  const margin = 20;
  
  // Helper to add text with word wrap
  const addText = (text: string, fontSize = 10, isBold = false) => {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    
    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
    for (const line of lines) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
  };
  
  const addLine = () => {
    y += 3;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };
  
  // Header
  doc.setFillColor(0, 51, 102); // COM-IN blue #003366
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Vertragszusammenfassung (VZF)", margin, 22);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Bestellnummer: ${orderId.substring(0, 8).toUpperCase()}`, margin, 30);
  
  // Reset for body
  doc.setTextColor(0, 0, 0);
  y = 50;
  
  // Customer info
  addText("Kundendaten", 12, true);
  y += 2;
  addText(`Name: ${customerName}`);
  if (vzfData?.street) {
    addText(`Adresse: ${vzfData.street} ${vzfData.houseNumber || ''}, ${vzfData.city || ''}`);
  }
  
  addLine();
  
  // Tariff info
  addText("Gewählter Tarif", 12, true);
  y += 2;
  if (vzfData?.tariffName) {
    addText(`Tarif: ${vzfData.tariffName}`);
    addText(`Monatlicher Preis: ${vzfData.tariffPrice?.toFixed(2) || '0,00'} EUR`);
  }
  if (vzfData?.contractDuration) {
    addText(`Vertragslaufzeit: ${vzfData.contractDuration} Monate`);
  }
  
  // Options
  if (vzfData?.selectedOptions && vzfData.selectedOptions.length > 0) {
    addLine();
    addText("Zusatzoptionen", 12, true);
    y += 2;
    for (const opt of vzfData.selectedOptions) {
      let optText = `• ${opt.name}`;
      if (opt.monthlyPrice && opt.monthlyPrice > 0) {
        optText += ` (${opt.monthlyPrice.toFixed(2)} EUR/Monat)`;
      } else if (opt.oneTimePrice && opt.oneTimePrice > 0) {
        optText += ` (${opt.oneTimePrice.toFixed(2)} EUR einmalig)`;
      }
      addText(optText);
    }
  }
  
  addLine();
  
  // Pricing summary
  addText("Kostenübersicht", 12, true);
  y += 2;
  
  doc.setFillColor(245, 246, 248);
  doc.rect(margin, y - 4, pageWidth - 2 * margin, 28, 'F');
  
  addText(`Monatliche Kosten gesamt: ${vzfData?.monthlyTotal?.toFixed(2) || '0,00'} EUR`);
  addText(`Einmalige Kosten gesamt: ${vzfData?.oneTimeTotal?.toFixed(2) || '0,00'} EUR`);
  if (vzfData?.setupFee) {
    addText(`(inkl. Bereitstellungspreis: ${vzfData.setupFee.toFixed(2)} EUR)`);
  }
  
  y += 10;
  addLine();
  
  // Legal info
  addText("Wichtige Hinweise", 12, true);
  y += 2;
  addText("• Der Vertrag beginnt mit der Aktivierung des Anschlusses.", 9);
  addText("• Die Mindestvertragslaufzeit beginnt ab dem Aktivierungsdatum.", 9);
  addText("• Eine Kündigung ist zum Ende der Vertragslaufzeit mit einer Frist von 1 Monat möglich.", 9);
  addText("• Nach Ablauf der Mindestvertragslaufzeit verlängert sich der Vertrag auf unbestimmte Zeit", 9);
  addText("  und kann mit einer Frist von 1 Monat gekündigt werden.", 9);
  
  y += 10;
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.text(`Erstellt am: ${date}`, margin, 280);
  doc.text("Dies ist eine automatisch generierte Vertragszusammenfassung.", margin, 285);
  
  // Return as Uint8Array
  return doc.output('arraybuffer') as unknown as Uint8Array;
}

// Render template with placeholders
function renderEmailTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
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

    const requestData: OrderEmailRequest = await req.json();
    const { 
      orderId, 
      customerEmail, 
      customerName, 
      customerFirstName,
      customerLastName,
      customerPhone,
      salutation,
      vzfHtml, 
      vzfData 
    } = requestData;

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
      .select("content, name, use_case")
      .eq("is_active", true)
      .eq("use_case", "order_confirmation_email")
      .maybeSingle();

    // Build placeholder data for email template
    const emailPlaceholders: Record<string, string> = {
      kunde_anrede: salutation || 'Herr/Frau',
      kunde_vorname: customerFirstName || customerName.split(' ')[0] || '',
      kunde_nachname: customerLastName || customerName.split(' ').slice(1).join(' ') || '',
      kunde_name: customerName,
      kunde_telefon: customerPhone || '',
      kunde_email: customerEmail,
      adresse_strasse: vzfData?.street || '',
      adresse_hausnummer: vzfData?.houseNumber || '',
      adresse_stadt: vzfData?.city || '',
      bestellnummer: orderId.substring(0, 8).toUpperCase(),
      order_id: orderId.substring(0, 8).toUpperCase(),
      customer_name: customerName,
    };

    // Build email content
    let emailHtml: string;
    if (templateData?.content) {
      console.log("Using email template from database");
      emailHtml = renderEmailTemplate(templateData.content, emailPlaceholders);
    } else {
      console.log("Using default email template");
      // Default fallback email
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <p>Sehr geehrter Interessent, Sehr geehrte Interessentin,</p>
            <p>vielen Dank für Ihre Anfrage über unsere Webseite.</p>
            <p>Die Ihnen zugegangene Vertragszusammenfassung stellt nur ein Angebot auf Abschluss eines Vertrags dar. Unser Vertrieb meldet sich schnellstmöglich bei Ihnen.</p>
            <p>Ihre COM-IN Telekommunikations GmbH</p>
            <p>Tel: 0841 88511-0<br>kontakt@comin-glasfaser.de</p>
            <hr>
            <p><strong>Ihre Daten:</strong></p>
            <p>Name: ${customerName}<br>
            Adresse: ${vzfData?.street || ''} ${vzfData?.houseNumber || ''}, ${vzfData?.city || ''}<br>
            E-Mail: ${customerEmail}<br>
            ID: ${orderId.substring(0, 8).toUpperCase()}</p>
          </div>
        </body>
        </html>
      `;
    }

    console.log(`Sending email via ${emailSettings.smtp_host}:${emailSettings.smtp_port}`);

    // Generate PDF from VZF data
    console.log("Generating PDF attachment...");
    let pdfBytes: Uint8Array;
    try {
      pdfBytes = generateVZFPdf(vzfData, customerName, orderId);
      console.log("PDF generated successfully, size:", pdfBytes.length);
    } catch (pdfError) {
      console.error("PDF generation failed:", pdfError);
      // Fall back to HTML attachment if PDF fails
      const encoder = new TextEncoder();
      pdfBytes = encoder.encode(vzfHtml);
    }

    // Base64 encode PDF
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    // Connect to SMTP server with STARTTLS
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
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
      console.log("EHLO response received");

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

      // Build email with PDF attachment
      const boundary = "----=_Part_" + Date.now().toString(36);
      const subjectText = `Bestellbestätigung - COM-IN (${orderId.substring(0, 8).toUpperCase()})`;
      const subjectEncoded = btoa(unescape(encodeURIComponent(subjectText)));

      const emailContent = [
        `From: ${emailSettings.sender_name} <${emailSettings.sender_email}>`,
        `To: ${customerEmail}`,
        `Subject: =?UTF-8?B?${subjectEncoded}?=`,
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
        `Content-Type: application/pdf; name="VZF_${orderId.substring(0, 8).toUpperCase()}.pdf"`,
        `Content-Disposition: attachment; filename="VZF_${orderId.substring(0, 8).toUpperCase()}.pdf"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        // Split base64 into 76-char lines for email compliance
        ...pdfBase64.match(/.{1,76}/g) || [pdfBase64],
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
