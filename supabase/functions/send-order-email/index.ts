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
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string;
  salutation?: string;
  vzfHtml: string; // VZF HTML content (pre-rendered from frontend with template)
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

// Render template with placeholders
function renderEmailTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

// Convert HTML to PDF using html2pdf.app API
async function htmlToPdf(html: string): Promise<Uint8Array | null> {
  try {
    console.log("Converting HTML to PDF via html2pdf.app...");
    
    const response = await fetch("https://api.html2pdf.app/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: html,
        apiKey: "free", // Free tier
        format: "A4",
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
      }),
    });

    if (!response.ok) {
      console.log("html2pdf.app service unavailable, status:", response.status);
      return null;
    }

    const pdfBuffer = await response.arrayBuffer();
    console.log("PDF generated successfully, size:", pdfBuffer.byteLength);
    return new Uint8Array(pdfBuffer);
  } catch (error) {
    console.error("PDF conversion failed:", error);
    return null;
  }
}

// Fallback: Generate a proper PDF from HTML content
async function generateFallbackPdfFromHtml(html: string, vzfData: OrderEmailRequest['vzfData'], customerName: string, orderId: string): Promise<Uint8Array> {
  // Try alternative PDF generation via pdflayer API (free tier available)
  try {
    console.log("Trying pdflayer.com for PDF generation...");
    
    // Note: pdflayer requires URL-based content or direct HTML
    const response = await fetch("https://api.pdflayer.com/api/convert", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        access_key: "free", // Will likely fail, but worth trying
        document_html: html,
        page_size: "A4",
      }),
    });
    
    if (response.ok) {
      const pdfBuffer = await response.arrayBuffer();
      if (pdfBuffer.byteLength > 1000) {
        console.log("pdflayer succeeded, size:", pdfBuffer.byteLength);
        return new Uint8Array(pdfBuffer);
      }
    }
  } catch (e) {
    console.log("pdflayer failed:", e);
  }
  
  // Final fallback: Create a simple text PDF with more complete VZF data
  const date = new Date().toLocaleDateString('de-DE');
  const orderIdShort = orderId.substring(0, 8).toUpperCase();
  
  // Build option list
  const optionLines: string[] = [];
  if (vzfData?.selectedOptions) {
    for (const opt of vzfData.selectedOptions) {
      const monthly = opt.monthlyPrice ? `${opt.monthlyPrice.toFixed(2)} EUR/Monat` : '';
      const oneTime = opt.oneTimePrice ? `${opt.oneTimePrice.toFixed(2)} EUR einmalig` : '';
      const priceStr = [monthly, oneTime].filter(Boolean).join(', ') || 'inkl.';
      optionLines.push(`  - ${opt.name}: ${priceStr}`);
    }
  }
  
  // Build address
  const address = [vzfData?.street, vzfData?.houseNumber].filter(Boolean).join(' ');
  const fullAddress = [address, vzfData?.city].filter(Boolean).join(', ');
  
  // Build complete VZF content
  const textLines = [
    'VERTRAGSZUSAMMENFASSUNG',
    '========================',
    '',
    `Bestellnummer: ${orderIdShort}`,
    `Datum: ${date}`,
    '',
    'KUNDENDATEN',
    '------------',
    `Name: ${customerName}`,
    `Adresse: ${fullAddress || 'Nicht angegeben'}`,
    '',
    'TARIFDETAILS',
    '-------------',
    `Tarif: ${vzfData?.tariffName || 'N/A'}`,
    `Monatlicher Grundpreis: ${vzfData?.tariffPrice?.toFixed(2) || '0.00'} EUR`,
    `Vertragslaufzeit: ${vzfData?.contractDuration || 24} Monate`,
    '',
    'GEWAEHLTE OPTIONEN',
    '------------------',
    ...(optionLines.length > 0 ? optionLines : ['  Keine zusaetzlichen Optionen']),
    '',
    'KOSTEN',
    '-------',
    `Monatliche Gesamtkosten: ${vzfData?.monthlyTotal?.toFixed(2) || '0.00'} EUR`,
    `Einmalige Kosten: ${vzfData?.oneTimeTotal?.toFixed(2) || '0.00'} EUR`,
    `  davon Bereitstellung: ${vzfData?.setupFee?.toFixed(2) || '99.00'} EUR`,
    '',
    '========================',
    'Diese Vertragszusammenfassung wurde automatisch erstellt.',
    'COM-IN Telekommunikations GmbH',
    'Tel: 0841 88511-0',
    'kontakt@comin-glasfaser.de',
  ];
  
  // Create minimal PDF with all text
  const textContent = textLines.join('\n');
  const lines = textContent.split('\n');
  
  // Build PDF stream content
  let streamContent = 'BT\n/F1 11 Tf\n50 800 Td\n';
  for (const line of lines) {
    // Escape special PDF characters and use ASCII-safe characters
    const safeLine = line
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/Ä/g, 'Ae')
      .replace(/Ö/g, 'Oe')
      .replace(/Ü/g, 'Ue')
      .replace(/ß/g, 'ss')
      .replace(/€/g, 'EUR');
    streamContent += `(${safeLine}) Tj\n0 -14 Td\n`;
  }
  streamContent += 'ET';
  
  const streamLength = streamContent.length;
  
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000${(300 + streamLength).toString().padStart(3, '0')} 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${350 + streamLength}
%%EOF
`;
  
  return new TextEncoder().encode(pdfContent);
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
      console.log("Using email template from database:", templateData.name);
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

    // Generate PDF from VZF HTML (passed from frontend, already rendered with template)
    console.log("Generating PDF from VZF HTML template...");
    console.log("VZF HTML length:", vzfHtml?.length || 0);
    
    let pdfBytes: Uint8Array;
    
    if (vzfHtml && vzfHtml.length > 100) {
      // Try to convert the VZF HTML template to PDF
      const convertedPdf = await htmlToPdf(vzfHtml);
      
      if (convertedPdf && convertedPdf.length > 500) {
        pdfBytes = convertedPdf;
        console.log("Successfully converted VZF template to PDF, size:", pdfBytes.length);
      } else {
        console.log("PDF conversion failed, using enhanced fallback with full VZF data");
        pdfBytes = await generateFallbackPdfFromHtml(vzfHtml, vzfData, customerName, orderId);
      }
    } else {
      console.log("No VZF HTML provided, using enhanced fallback PDF");
      pdfBytes = await generateFallbackPdfFromHtml("", vzfData, customerName, orderId);
    }

    // Base64 encode PDF
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
    console.log("PDF base64 encoded, length:", pdfBase64.length);

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
      console.log("Email sent successfully with VZF PDF attachment");

      // QUIT
      await sendTlsCommand("QUIT");
      tlsConn.close();

    } catch (smtpError) {
      conn.close();
      throw smtpError;
    }

    console.log(`Email sent successfully to ${customerEmail}`);

    return new Response(
      JSON.stringify({ success: true, message: "E-Mail mit VZF-PDF erfolgreich gesendet" }),
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