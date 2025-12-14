import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VZFData {
  orderNumber?: string;
  date?: string;
  customerName?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  salutation?: string;
  street?: string;
  houseNumber?: string;
  apartment?: string;
  floor?: string;
  city?: string;
  postalCode?: string;
  tariffName?: string;
  tariffPrice?: number;
  downloadSpeed?: string;
  uploadSpeed?: string;
  contractDuration?: number;
  routerName?: string;
  routerMonthlyPrice?: number;
  routerOneTimePrice?: number;
  tvName?: string;
  tvMonthlyPrice?: number;
  phoneName?: string;
  phoneMonthlyPrice?: number;
  phoneLines?: number;
  monthlyTotal?: number;
  oneTimeTotal?: number;
  setupFee?: number;
  phonePorting?: boolean;
  phonePortingProvider?: string;
  phonePortingNumbers?: string[];
  phoneBookEntry?: string;
  phoneEvn?: boolean;
  bankAccountHolder?: string;
  bankIban?: string;
  previousProvider?: string;
  cancelPreviousProvider?: boolean;
  selectedOptions?: Array<{
    name: string;
    monthlyPrice?: number;
    oneTimePrice?: number;
    quantity?: number;
  }>;
  discounts?: Array<{
    name: string;
    amount: number;
    type: 'monthly' | 'one_time';
  }>;
}

interface OrderEmailRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string;
  salutation?: string;
  vzfHtml?: string; // Legacy - no longer used
  vzfData?: VZFData;
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

// Helper to format currency
function formatCurrency(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' EUR';
}

// Generate VZF PDF using pdf-lib
async function generateVZFPdf(data: VZFData, orderId: string, customerName: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Colors
  const primaryColor = rgb(0, 0.2, 0.4); // Dark blue
  const textColor = rgb(0.2, 0.2, 0.2);
  const lightGray = rgb(0.9, 0.9, 0.9);
  const accentColor = rgb(0.93, 0.46, 0.05); // Orange
  
  // Page dimensions (A4)
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;
  
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  
  // Helper function to add new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (y < margin + requiredSpace) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };
  
  // Helper to draw text
  const drawText = (text: string, x: number, yPos: number, options: { font?: any; size?: number; color?: any } = {}) => {
    const font = options.font || helvetica;
    const size = options.size || 10;
    const color = options.color || textColor;
    // Sanitize text for PDF (replace special chars)
    const safeText = text
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
      .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
      .replace(/ß/g, 'ss').replace(/€/g, 'EUR');
    page.drawText(safeText, { x, y: yPos, font, size, color });
  };
  
  // Helper to draw section header
  const drawSectionHeader = (title: string) => {
    checkNewPage(40);
    y -= 20;
    page.drawRectangle({
      x: margin,
      y: y - 5,
      width: contentWidth,
      height: 22,
      color: primaryColor,
    });
    drawText(title, margin + 10, y, { font: helveticaBold, size: 11, color: rgb(1, 1, 1) });
    y -= 25;
  };
  
  // Helper to draw labeled row
  const drawRow = (label: string, value: string, indent = 0) => {
    checkNewPage(20);
    drawText(label, margin + indent, y, { font: helvetica, size: 9, color: rgb(0.4, 0.4, 0.4) });
    drawText(value, margin + 200 + indent, y, { font: helvetica, size: 9 });
    y -= 14;
  };
  
  const orderNumber = data.orderNumber || `COM-${orderId.substring(0, 8).toUpperCase()}`;
  const date = data.date || new Date().toLocaleDateString('de-DE');
  
  // ========== HEADER ==========
  // Company info (top right)
  drawText('COM-IN Telekommunikations GmbH', pageWidth - margin - 180, y, { font: helveticaBold, size: 9, color: primaryColor });
  y -= 12;
  drawText('Manchinger Str. 115, 85053 Ingolstadt', pageWidth - margin - 180, y, { font: helvetica, size: 8 });
  y -= 11;
  drawText('Tel: 0841 88511-0', pageWidth - margin - 180, y, { font: helvetica, size: 8 });
  y -= 11;
  drawText('kontakt@comin-glasfaser.de', pageWidth - margin - 180, y, { font: helvetica, size: 8 });
  
  // Reset Y for title
  y = pageHeight - margin - 20;
  
  // Title
  drawText('VERTRAGSZUSAMMENFASSUNG', margin, y, { font: helveticaBold, size: 18, color: primaryColor });
  y -= 25;
  
  // Order info line
  page.drawRectangle({
    x: margin,
    y: y - 8,
    width: contentWidth,
    height: 24,
    color: lightGray,
  });
  drawText(`Bestellnummer: ${orderNumber}`, margin + 10, y, { font: helveticaBold, size: 10 });
  drawText(`Datum: ${date}`, margin + 300, y, { font: helvetica, size: 10 });
  y -= 35;
  
  // ========== KUNDENDATEN ==========
  drawSectionHeader('KUNDENDATEN');
  
  const fullName = data.salutation 
    ? `${data.salutation} ${data.customerFirstName || ''} ${data.customerLastName || customerName}`.trim()
    : customerName;
  drawRow('Name:', fullName);
  
  const fullAddress = `${data.street || ''} ${data.houseNumber || ''}${data.apartment ? ', ' + data.apartment : ''}${data.floor ? ' (' + data.floor + ')' : ''}`.trim();
  if (fullAddress) drawRow('Anschlussadresse:', fullAddress);
  if (data.city) drawRow('', `${data.postalCode || ''} ${data.city}`.trim());
  if (data.customerEmail) drawRow('E-Mail:', data.customerEmail);
  if (data.customerPhone) drawRow('Telefon:', data.customerPhone);
  
  y -= 10;
  
  // ========== TARIFDETAILS ==========
  drawSectionHeader('TARIFDETAILS');
  
  if (data.tariffName) drawRow('Gewaehlter Tarif:', data.tariffName);
  if (data.tariffPrice !== undefined) drawRow('Monatlicher Grundpreis:', formatCurrency(data.tariffPrice));
  if (data.contractDuration) drawRow('Mindestvertragslaufzeit:', `${data.contractDuration} Monate`);
  
  if (data.downloadSpeed) {
    y -= 5;
    drawText('Geschwindigkeiten:', margin, y, { font: helveticaBold, size: 9 });
    y -= 14;
    drawRow('Download (max.):', data.downloadSpeed, 10);
    if (data.uploadSpeed) drawRow('Upload (max.):', data.uploadSpeed, 10);
  }
  
  y -= 10;
  
  // ========== GEWÄHLTE OPTIONEN ==========
  const hasOptions = data.routerName || data.tvName || data.phoneName || (data.selectedOptions && data.selectedOptions.length > 0);
  
  if (hasOptions) {
    drawSectionHeader('GEWAEHLTE OPTIONEN');
    
    // Router
    if (data.routerName) {
      const routerPrice = data.routerMonthlyPrice 
        ? formatCurrency(data.routerMonthlyPrice) + '/Monat'
        : data.routerOneTimePrice 
          ? formatCurrency(data.routerOneTimePrice) + ' einmalig'
          : 'inkl.';
      drawRow('Router:', `${data.routerName} (${routerPrice})`);
    }
    
    // TV
    if (data.tvName) {
      const tvPrice = data.tvMonthlyPrice ? formatCurrency(data.tvMonthlyPrice) + '/Monat' : 'inkl.';
      drawRow('TV:', `${data.tvName} (${tvPrice})`);
    }
    
    // Phone
    if (data.phoneName) {
      const phonePrice = data.phoneMonthlyPrice ? formatCurrency(data.phoneMonthlyPrice) + '/Monat' : 'inkl.';
      const phoneLines = data.phoneLines && data.phoneLines > 1 ? ` (${data.phoneLines}x)` : '';
      drawRow('Telefon:', `${data.phoneName}${phoneLines} (${phonePrice})`);
    }
    
    // Other options
    if (data.selectedOptions) {
      for (const opt of data.selectedOptions) {
        const qty = opt.quantity && opt.quantity > 1 ? `${opt.quantity}x ` : '';
        const monthly = opt.monthlyPrice ? formatCurrency(opt.monthlyPrice) + '/Monat' : '';
        const oneTime = opt.oneTimePrice ? formatCurrency(opt.oneTimePrice) + ' einmalig' : '';
        const priceStr = [monthly, oneTime].filter(Boolean).join(', ') || 'inkl.';
        drawRow('Option:', `${qty}${opt.name} (${priceStr})`);
      }
    }
    
    y -= 10;
  }
  
  // ========== TELEFONIE-OPTIONEN ==========
  if (data.phonePorting || data.phoneBookEntry || data.phoneEvn) {
    drawSectionHeader('TELEFONIE-OPTIONEN');
    
    if (data.phonePorting) {
      drawRow('Rufnummernmitnahme:', 'Ja');
      if (data.phonePortingProvider) drawRow('Bisheriger Anbieter:', data.phonePortingProvider);
      if (data.phonePortingNumbers && data.phonePortingNumbers.length > 0) {
        drawRow('Rufnummern:', data.phonePortingNumbers.join(', '));
      }
    }
    
    if (data.phoneBookEntry) drawRow('Telefonbucheintrag:', data.phoneBookEntry);
    if (data.phoneEvn) drawRow('Einzelverbindungsnachweis:', 'Ja');
    
    y -= 10;
  }
  
  // ========== VORHERIGER ANBIETER ==========
  if (data.previousProvider || data.cancelPreviousProvider) {
    drawSectionHeader('BISHERIGER ANBIETER');
    
    if (data.previousProvider) drawRow('Anbieter:', data.previousProvider);
    drawRow('Kuendigung durch COM-IN:', data.cancelPreviousProvider ? 'Ja' : 'Nein');
    
    y -= 10;
  }
  
  // ========== RABATTE ==========
  if (data.discounts && data.discounts.length > 0) {
    drawSectionHeader('AKTIONEN & RABATTE');
    
    for (const discount of data.discounts) {
      const typeStr = discount.type === 'monthly' ? '/Monat' : ' einmalig';
      drawRow(discount.name + ':', `-${formatCurrency(discount.amount)}${typeStr}`);
    }
    
    y -= 10;
  }
  
  // ========== KOSTENÜBERSICHT ==========
  drawSectionHeader('KOSTENUEBERSICHT');
  
  // Draw a box for costs
  checkNewPage(80);
  page.drawRectangle({
    x: margin,
    y: y - 60,
    width: contentWidth,
    height: 70,
    color: lightGray,
  });
  
  y -= 5;
  drawText('Monatliche Kosten:', margin + 20, y, { font: helveticaBold, size: 11 });
  drawText(formatCurrency(data.monthlyTotal || 0), margin + contentWidth - 120, y, { font: helveticaBold, size: 14, color: accentColor });
  y -= 18;
  
  drawText('Einmalige Kosten:', margin + 20, y, { font: helvetica, size: 10 });
  drawText(formatCurrency(data.oneTimeTotal || 0), margin + contentWidth - 120, y, { font: helvetica, size: 11 });
  y -= 14;
  
  drawText('  davon Bereitstellung:', margin + 20, y, { font: helvetica, size: 9, color: rgb(0.5, 0.5, 0.5) });
  drawText(formatCurrency(data.setupFee || 0), margin + contentWidth - 120, y, { font: helvetica, size: 9, color: rgb(0.5, 0.5, 0.5) });
  
  y -= 35;
  
  // ========== BANKVERBINDUNG ==========
  if (data.bankAccountHolder || data.bankIban) {
    drawSectionHeader('BANKVERBINDUNG');
    
    if (data.bankAccountHolder) drawRow('Kontoinhaber:', data.bankAccountHolder);
    if (data.bankIban) drawRow('IBAN:', data.bankIban);
    
    y -= 10;
  }
  
  // ========== FOOTER ==========
  checkNewPage(60);
  y -= 20;
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: pageWidth - margin, y: y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 15;
  
  drawText('Diese Vertragszusammenfassung wurde automatisch erstellt und dient als Nachweis gemaess § 312d BGB.', margin, y, { font: helvetica, size: 8, color: rgb(0.5, 0.5, 0.5) });
  y -= 15;
  drawText('COM-IN Telekommunikations GmbH | Manchinger Str. 115 | 85053 Ingolstadt', margin, y, { font: helvetica, size: 8, color: rgb(0.5, 0.5, 0.5) });
  y -= 11;
  drawText('Tel: 0841 88511-0 | kontakt@comin-glasfaser.de | www.comin-glasfaser.de', margin, y, { font: helvetica, size: 8, color: rgb(0.5, 0.5, 0.5) });
  
  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
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
        JSON.stringify({ error: "E-Mail-Einstellungen unvollstaendig" }),
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
            <p>vielen Dank fuer Ihre Anfrage ueber unsere Webseite.</p>
            <p>Die Ihnen zugegangene Vertragszusammenfassung stellt nur ein Angebot auf Abschluss eines Vertrags dar. Unser Vertrieb meldet sich schnellstmoeglich bei Ihnen.</p>
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

    // Generate PDF using pdf-lib
    console.log("Generating VZF PDF with pdf-lib...");
    
    // Prepare VZF data with additional info
    const fullVzfData: VZFData = {
      ...vzfData,
      orderNumber: vzfData?.orderNumber || `COM-${orderId.substring(0, 8).toUpperCase()}`,
      date: vzfData?.date || new Date().toLocaleDateString('de-DE'),
      customerName: customerName,
      customerFirstName: customerFirstName,
      customerLastName: customerLastName,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      salutation: salutation,
    };
    
    const pdfBytes = await generateVZFPdf(fullVzfData, orderId, customerName);
    console.log("PDF generated successfully with pdf-lib, size:", pdfBytes.length);

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
      const subjectText = `Bestellbestaetigung - COM-IN (${orderId.substring(0, 8).toUpperCase()})`;
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
