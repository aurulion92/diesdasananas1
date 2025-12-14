import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VZFData {
  orderNumber: string;
  date: string;
  // Customer data
  customerName: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  salutation?: string;
  // Address
  street: string;
  houseNumber: string;
  apartment?: string;
  floor?: string;
  city: string;
  postalCode?: string;
  // Tariff
  tariffName: string;
  tariffPrice: number;
  downloadSpeed?: string;
  uploadSpeed?: string;
  downloadSpeedMin?: string;
  uploadSpeedMin?: string;
  downloadSpeedNormal?: string;
  uploadSpeedNormal?: string;
  contractDuration: number;
  // Options
  selectedOptions?: Array<{
    name: string;
    monthlyPrice?: number;
    oneTimePrice?: number;
    quantity?: number;
  }>;
  routerName?: string;
  routerMonthlyPrice?: number;
  routerOneTimePrice?: number;
  tvName?: string;
  tvMonthlyPrice?: number;
  tvOneTimePrice?: number;
  phoneName?: string;
  phoneMonthlyPrice?: number;
  phoneLines?: number;
  // Totals
  monthlyTotal: number;
  oneTimeTotal: number;
  setupFee: number;
  // Phone options
  phonePorting?: boolean;
  phonePortingProvider?: string;
  phonePortingNumbers?: string[];
  phoneBookEntry?: string;
  phoneEvn?: boolean;
  // Bank
  bankAccountHolder?: string;
  bankIban?: string;
  // Provider
  previousProvider?: string;
  cancelPreviousProvider?: boolean;
  // Discounts
  discounts?: Array<{
    name: string;
    amount: number;
    type: 'monthly' | 'one_time';
  }>;
}

interface PDFRequest {
  html?: string; // Legacy support
  filename?: string;
  vzfData?: VZFData;
}

// Helper to format currency
function formatCurrency(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' EUR';
}

// Helper to wrap text
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  const avgCharWidth = fontSize * 0.5;
  const maxChars = Math.floor(maxWidth / avgCharWidth);

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

async function generateVZFPdf(data: VZFData): Promise<Uint8Array> {
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
    page.drawText(text, { x, y: yPos, font, size, color });
  };
  
  // Helper to draw a horizontal line
  const drawLine = (yPos: number, color = lightGray) => {
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: pageWidth - margin, y: yPos },
      thickness: 1,
      color,
    });
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
  drawText(`Bestellnummer: ${data.orderNumber}`, margin + 10, y, { font: helveticaBold, size: 10 });
  drawText(`Datum: ${data.date}`, margin + 300, y, { font: helvetica, size: 10 });
  y -= 35;
  
  // ========== KUNDENDATEN ==========
  drawSectionHeader('KUNDENDATEN');
  
  const fullName = data.salutation 
    ? `${data.salutation} ${data.customerFirstName || ''} ${data.customerLastName || data.customerName}`.trim()
    : data.customerName;
  drawRow('Name:', fullName);
  
  const fullAddress = `${data.street} ${data.houseNumber}${data.apartment ? ', ' + data.apartment : ''}${data.floor ? ' (' + data.floor + ')' : ''}`;
  drawRow('Anschlussadresse:', fullAddress);
  drawRow('', `${data.postalCode || ''} ${data.city}`);
  
  if (data.customerEmail) drawRow('E-Mail:', data.customerEmail);
  if (data.customerPhone) drawRow('Telefon:', data.customerPhone);
  
  y -= 10;
  
  // ========== TARIFDETAILS ==========
  drawSectionHeader('TARIFDETAILS');
  
  drawRow('Gewählter Tarif:', data.tariffName);
  drawRow('Monatlicher Grundpreis:', formatCurrency(data.tariffPrice));
  drawRow('Mindestvertragslaufzeit:', `${data.contractDuration} Monate`);
  
  if (data.downloadSpeed) {
    y -= 5;
    drawText('Geschwindigkeiten:', margin, y, { font: helveticaBold, size: 9 });
    y -= 14;
    drawRow('Download (max.):', data.downloadSpeed, 10);
    if (data.downloadSpeedNormal) drawRow('Download (normal):', data.downloadSpeedNormal, 10);
    if (data.downloadSpeedMin) drawRow('Download (min.):', data.downloadSpeedMin, 10);
    drawRow('Upload (max.):', data.uploadSpeed || '-', 10);
    if (data.uploadSpeedNormal) drawRow('Upload (normal):', data.uploadSpeedNormal, 10);
    if (data.uploadSpeedMin) drawRow('Upload (min.):', data.uploadSpeedMin, 10);
  }
  
  y -= 10;
  
  // ========== GEWÄHLTE OPTIONEN ==========
  if ((data.selectedOptions && data.selectedOptions.length > 0) || data.routerName || data.tvName || data.phoneName) {
    drawSectionHeader('GEWÄHLTE OPTIONEN');
    
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
    drawRow('Kündigung durch COM-IN:', data.cancelPreviousProvider ? 'Ja' : 'Nein');
    
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
  drawSectionHeader('KOSTENÜBERSICHT');
  
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
  drawText(formatCurrency(data.monthlyTotal), margin + contentWidth - 120, y, { font: helveticaBold, size: 14, color: accentColor });
  y -= 18;
  
  drawText('Einmalige Kosten:', margin + 20, y, { font: helvetica, size: 10 });
  drawText(formatCurrency(data.oneTimeTotal), margin + contentWidth - 120, y, { font: helvetica, size: 11 });
  y -= 14;
  
  drawText(`  davon Bereitstellung:`, margin + 20, y, { font: helvetica, size: 9, color: rgb(0.5, 0.5, 0.5) });
  drawText(formatCurrency(data.setupFee), margin + contentWidth - 120, y, { font: helvetica, size: 9, color: rgb(0.5, 0.5, 0.5) });
  
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
  drawLine(y, rgb(0.8, 0.8, 0.8));
  y -= 15;
  
  const footerText = 'Diese Vertragszusammenfassung wurde automatisch erstellt und dient als Nachweis gemäß § 312d BGB.';
  const footerLines = wrapText(footerText, contentWidth, 8);
  for (const line of footerLines) {
    drawText(line, margin, y, { font: helvetica, size: 8, color: rgb(0.5, 0.5, 0.5) });
    y -= 11;
  }
  
  y -= 5;
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
    const requestData: PDFRequest = await req.json();
    const { filename = "VZF.pdf", vzfData } = requestData;

    console.log("Generating PDF for:", filename);

    if (!vzfData) {
      console.error("No VZF data provided");
      return new Response(
        JSON.stringify({ error: "VZF data is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("VZF Data received:", JSON.stringify(vzfData).substring(0, 500));

    // Generate PDF using pdf-lib
    const pdfBytes = await generateVZFPdf(vzfData);
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...pdfBytes));

    console.log("PDF generated successfully, size:", pdfBytes.length, "bytes");

    return new Response(
      JSON.stringify({ 
        success: true, 
        type: "pdf",
        pdf: base64,
        filename: filename
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate PDF" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
