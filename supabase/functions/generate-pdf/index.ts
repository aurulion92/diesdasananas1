import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Open Sans font URLs from Google Fonts
const OPEN_SANS_REGULAR_URL = "https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVI.woff2";
const OPEN_SANS_BOLD_URL = "https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsg-1x4gaVI.woff2";

// Cache for fonts
let openSansRegular: ArrayBuffer | null = null;
let openSansBold: ArrayBuffer | null = null;

async function loadOpenSansFonts() {
  if (!openSansRegular) {
    console.log("Loading Open Sans Regular font...");
    const response = await fetch(OPEN_SANS_REGULAR_URL);
    openSansRegular = await response.arrayBuffer();
  }
  if (!openSansBold) {
    console.log("Loading Open Sans Bold font...");
    const response = await fetch(OPEN_SANS_BOLD_URL);
    openSansBold = await response.arrayBuffer();
  }
  return { regular: openSansRegular, bold: openSansBold };
}

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
  downloadSpeedMin?: string;
  uploadSpeedMin?: string;
  downloadSpeedNormal?: string;
  uploadSpeedNormal?: string;
  contractDuration?: number;
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
  discounts?: Array<{
    name: string;
    amount: number;
    type: 'monthly' | 'one_time';
  }>;
}

interface PDFRequest {
  html?: string;
  filename?: string;
  vzfData?: VZFData;
}

// Helper to format currency
function formatCurrency(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' €';
}

// Sanitize text for PDF - now only handles € symbol since Open Sans supports German umlauts
function sanitizeText(text: string): string {
  return text.replace(/€/g, 'EUR');
}

// Try to fill form fields in template PDF
async function fillTemplatePdf(templatePdfBytes: Uint8Array, data: VZFData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templatePdfBytes, { ignoreEncryption: true });
  
  // Try to get form and fill fields
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`Found ${fields.length} form fields in template`);
    
    // Build content for each field based on actual VZF PDF field names
    // Fields from the uploaded template:
    // - Dienste und Geräte (services and devices - multiline)
    // - monatliche Grundbeträge_Name_Leistung (monthly services names)
    // - monatliche Grundbeträge_Betrag (monthly services amounts)
    // - einmalige Beträge_Name_Leistung (one-time services names)
    // - einmalige Beträge_Betrag (one-time services amounts)
    // - Summe mntl. Grundbeträge (monthly total)
    // - Summe mntl. einmalige Beträge (one-time total)
    // - Mbit/s_1 through Mbit/s_6 (speeds)
    // - Datum (date)
    
    // Build services and devices text
    const servicesLines: string[] = [];
    if (data.tariffName) servicesLines.push(data.tariffName);

    // Always show TV state (template expects an explicit line)
    servicesLines.push(data.tvName ?? 'Kein TV');

    if (data.routerName) servicesLines.push(data.routerName);
    if (data.phoneName) servicesLines.push(data.phoneName);

    const extraOptions = (data.selectedOptions ?? []).map(o => o?.name).filter(Boolean) as string[];
    if (extraOptions.length) {
      for (const optName of extraOptions) {
        if (optName !== data.routerName) servicesLines.push(optName);
      }
    } else {
      servicesLines.push('Keine optionale Hardware');
    }

    // Build monthly costs
    const monthlyNames: string[] = [];
    const monthlyAmounts: string[] = [];
    
    if (data.tariffName && data.tariffPrice) {
      monthlyNames.push(data.tariffName);
      monthlyAmounts.push(formatCurrency(data.tariffPrice));
    }
    // Show router even if price is 0 (e.g. with FTTH Aktion discount)
    if (data.routerName && data.routerMonthlyPrice !== undefined) {
      monthlyNames.push(data.routerName);
      monthlyAmounts.push(formatCurrency(data.routerMonthlyPrice));
    }
    // Add monthly discounts as separate line items with negative amounts
    if (data.discounts && data.discounts.length > 0) {
      for (const discount of data.discounts) {
        if (discount.type === 'monthly' && discount.amount > 0) {
          monthlyNames.push(discount.name);
          monthlyAmounts.push(`-${formatCurrency(discount.amount)}`);
        }
      }
    }
    if (data.tvName && data.tvMonthlyPrice && data.tvMonthlyPrice > 0) {
      monthlyNames.push(data.tvName);
      monthlyAmounts.push(formatCurrency(data.tvMonthlyPrice));
    }
    if (data.phoneName && data.phoneMonthlyPrice && data.phoneMonthlyPrice > 0) {
      monthlyNames.push(data.phoneName);
      monthlyAmounts.push(formatCurrency(data.phoneMonthlyPrice));
    }
    
    // Build one-time costs
    const oneTimeNames: string[] = [];
    const oneTimeAmounts: string[] = [];
    
    if (data.setupFee && data.setupFee > 0) {
      oneTimeNames.push('Bereitstellungspreis');
      oneTimeAmounts.push(formatCurrency(data.setupFee));
    }
    if (data.routerOneTimePrice && data.routerOneTimePrice > 0) {
      oneTimeNames.push(data.routerName || 'Router');
      oneTimeAmounts.push(formatCurrency(data.routerOneTimePrice));
    }
    
    // Extract speed values
    const downloadMax = data.downloadSpeed?.replace(' Mbit/s', '') || '';
    const downloadNormal = data.downloadSpeedNormal?.replace(' Mbit/s', '') || '';
    const downloadMin = data.downloadSpeedMin?.replace(' Mbit/s', '') || '';
    const uploadMax = data.uploadSpeed?.replace(' Mbit/s', '') || '';
    const uploadNormal = data.uploadSpeedNormal?.replace(' Mbit/s', '') || '';
    const uploadMin = data.uploadSpeedMin?.replace(' Mbit/s', '') || '';
    
    // Map exact field names to values
    const exactFieldMappings: Record<string, string> = {
      'Dienste und Geräte': servicesLines.join('\n'),
      'monatliche Grundbeträge_Name_Leistung': monthlyNames.join('\n'),
      'monatliche Grundbeträge_Betrag': monthlyAmounts.join('\n'),
      'einmalige Beträge_Name_Leistung': oneTimeNames.join('\n'),
      'einmalige Beträge_Betrag': oneTimeAmounts.join('\n'),
      'Summe mntl. Grundbeträge': data.monthlyTotal ? formatCurrency(data.monthlyTotal) : '',
      'Summe mntl. einmalige Beträge': data.oneTimeTotal ? formatCurrency(data.oneTimeTotal) : '',
      'Mbit/s_1': downloadMax,
      'Mbit/s_2': downloadNormal,
      'Mbit/s_3': downloadMin,
      'Mbit/s_4': uploadMax,
      'Mbit/s_5': uploadNormal,
      'Mbit/s_6': uploadMin,
      'Datum': data.date || new Date().toLocaleDateString('de-DE'),
    };
    
    // Fill each field using exact name matching
    for (const field of fields) {
      const fieldName = field.getName();
      console.log(`Field: ${fieldName}`);
      
      if (exactFieldMappings[fieldName] !== undefined) {
        try {
          const textField = form.getTextField(fieldName);
          const value = exactFieldMappings[fieldName];
          textField.setText(sanitizeText(value));
          console.log(`Filled field "${fieldName}" with: ${value.substring(0, 80)}`);
        } catch (e) {
          console.log(`Could not fill field "${fieldName}":`, e);
        }
      }
    }
    
    // Don't flatten - it causes stack overflow with some PDFs
    // The form fields will remain editable but data is visible
    console.log("Form fields filled, skipping flatten to avoid stack overflow");
    
  } catch (formError) {
    console.log('No form fields found or error accessing form:', formError);
    // Continue without form filling - the template will be returned as-is
  }
  
  try {
    const savedBytes = await pdfDoc.save();
    console.log("PDF saved successfully, size:", savedBytes.length);
    return savedBytes;
  } catch (saveError) {
    console.error("Error saving PDF:", saveError);
    throw saveError;
  }
}

// Generate VZF PDF from scratch (fallback)
async function generateVZFPdfFromScratch(data: VZFData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  
  // Load and embed Open Sans fonts
  const fonts = await loadOpenSansFonts();
  const openSans = await pdfDoc.embedFont(fonts.regular);
  const openSansBold = await pdfDoc.embedFont(fonts.bold);
  
  const primaryColor = rgb(0, 0.2, 0.4);
  const textColor = rgb(0.2, 0.2, 0.2);
  const lightGray = rgb(0.95, 0.95, 0.95);
  const accentColor = rgb(0.93, 0.46, 0.05);
  
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;
  
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  
  const checkNewPage = (requiredSpace: number) => {
    if (y < margin + requiredSpace) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };
  
  const drawText = (text: string, x: number, yPos: number, options: { font?: any; size?: number; color?: any } = {}) => {
    const font = options.font || openSans;
    const size = options.size || 10;
    const color = options.color || textColor;
    page.drawText(sanitizeText(text), { x, y: yPos, font, size, color });
  };
  
  const drawSectionHeader = (title: string) => {
    checkNewPage(40);
    y -= 20;
    page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 22, color: primaryColor });
    drawText(title, margin + 10, y, { font: openSansBold, size: 11, color: rgb(1, 1, 1) });
    y -= 25;
  };
  
  const drawRow = (label: string, value: string, indent = 0) => {
    checkNewPage(20);
    drawText(label, margin + indent, y, { font: openSans, size: 9, color: rgb(0.4, 0.4, 0.4) });
    drawText(value, margin + 200 + indent, y, { font: openSans, size: 9 });
    y -= 14;
  };
  
  const orderNumber = data.orderNumber || `COMIN-${new Date().getFullYear()}-XXXX`;
  const date = data.date || new Date().toLocaleDateString('de-DE');
  
  // Header
  drawText('COM-IN Telekommunikations GmbH', pageWidth - margin - 180, y, { font: openSansBold, size: 9, color: primaryColor });
  y -= 12;
  drawText('Erni-Singerl-Straße 2b, 85053 Ingolstadt', pageWidth - margin - 180, y, { font: openSans, size: 8 });
  y -= 11;
  drawText('Tel: 0841 88511-0', pageWidth - margin - 180, y, { font: openSans, size: 8 });
  
  y = pageHeight - margin - 20;
  drawText('VERTRAGSZUSAMMENFASSUNG', margin, y, { font: openSansBold, size: 18, color: primaryColor });
  y -= 25;
  
  page.drawRectangle({ x: margin, y: y - 8, width: contentWidth, height: 24, color: lightGray });
  drawText(`Bestellnummer: ${orderNumber}  |  Datum: ${date}`, margin + 10, y, { font: openSans, size: 10 });
  y -= 35;
  
  // Kundendaten
  drawSectionHeader('Kundendaten');
  const fullName = `${data.salutation || ''} ${data.customerFirstName || ''} ${data.customerLastName || data.customerName || ''}`.trim();
  drawRow('Name:', fullName);
  drawRow('Adresse:', `${data.street || ''} ${data.houseNumber || ''}, ${data.postalCode || ''} ${data.city || ''}`);
  if (data.customerEmail) drawRow('E-Mail:', data.customerEmail);
  if (data.customerPhone) drawRow('Telefon:', data.customerPhone);
  y -= 10;
  
  // Dienste und Geräte
  drawSectionHeader('Dienste und Geräte');
  if (data.tariffName) drawRow('Tarif:', data.tariffName);
  if (data.routerName) drawRow('Router:', data.routerName);
  if (data.tvName) drawRow('TV:', data.tvName);
  if (data.phoneName) {
    const phoneQty = data.phoneLines && data.phoneLines > 1 ? `${data.phoneLines}x ` : '';
    drawRow('Telefon:', `${phoneQty}${data.phoneName}`);
  }
  if (data.selectedOptions) {
    for (const opt of data.selectedOptions) {
      const qty = opt.quantity && opt.quantity > 1 ? `${opt.quantity}x ` : '';
      drawRow('Option:', `${qty}${opt.name}`);
    }
  }
  y -= 10;
  
  // Geschwindigkeiten
  drawSectionHeader('Geschwindigkeiten des Internetdienstes');
  drawRow('', 'Im Download          Im Upload');
  if (data.downloadSpeed) drawRow('Maximal:', `${data.downloadSpeed}          ${data.uploadSpeed || ''}`);
  if (data.downloadSpeedNormal) drawRow('Normalerweise:', `${data.downloadSpeedNormal}          ${data.uploadSpeedNormal || ''}`);
  if (data.downloadSpeedMin) drawRow('Minimal:', `${data.downloadSpeedMin}          ${data.uploadSpeedMin || ''}`);
  y -= 10;
  
  // Preis
  drawSectionHeader('Preis');
  y -= 5;
  drawText('Monatliche Grundbeträge', margin, y, { font: openSansBold, size: 9 });
  y -= 14;
  if (data.tariffName && data.tariffPrice) drawRow(data.tariffName, formatCurrency(data.tariffPrice));
  if (data.routerName && data.routerMonthlyPrice) drawRow(data.routerName, formatCurrency(data.routerMonthlyPrice));
  if (data.tvName && data.tvMonthlyPrice) drawRow(data.tvName, formatCurrency(data.tvMonthlyPrice));
  if (data.phoneName && data.phoneMonthlyPrice) {
    const phoneQty = data.phoneLines && data.phoneLines > 1 ? `${data.phoneLines}x ` : '';
    drawRow(`${phoneQty}${data.phoneName}`, formatCurrency(data.phoneMonthlyPrice * (data.phoneLines || 1)));
  }
  if (data.selectedOptions) {
    for (const opt of data.selectedOptions) {
      if (opt.monthlyPrice && opt.monthlyPrice > 0) {
        const qty = opt.quantity && opt.quantity > 1 ? `${opt.quantity}x ` : '';
        drawRow(`${qty}${opt.name}`, formatCurrency(opt.monthlyPrice * (opt.quantity || 1)));
      }
    }
  }
  if (data.discounts) {
    for (const discount of data.discounts) {
      if (discount.type === 'monthly') {
        drawRow(discount.name, `-${formatCurrency(discount.amount)}`);
      }
    }
  }
  
  page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 18, color: lightGray });
  drawText('Summe der monatlichen Grundbeträge', margin + 5, y, { font: openSansBold, size: 9 });
  drawText(formatCurrency(data.monthlyTotal || 0), margin + contentWidth - 80, y, { font: openSansBold, size: 10, color: accentColor });
  y -= 25;
  
  drawText('Einmalige Beträge', margin, y, { font: openSansBold, size: 9 });
  y -= 14;
  if (data.setupFee) drawRow('Bereitstellungspreis:', formatCurrency(data.setupFee));
  if (data.routerOneTimePrice) drawRow(data.routerName || 'Router', formatCurrency(data.routerOneTimePrice));
  if (data.selectedOptions) {
    for (const opt of data.selectedOptions) {
      if (opt.oneTimePrice && opt.oneTimePrice > 0) {
        const qty = opt.quantity && opt.quantity > 1 ? `${opt.quantity}x ` : '';
        drawRow(`${qty}${opt.name}`, formatCurrency(opt.oneTimePrice * (opt.quantity || 1)));
      }
    }
  }
  if (data.discounts) {
    for (const discount of data.discounts) {
      if (discount.type === 'one_time') {
        drawRow(discount.name, `-${formatCurrency(discount.amount)}`);
      }
    }
  }
  
  page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 18, color: lightGray });
  drawText('Summe der einmaligen Beträge', margin + 5, y, { font: openSansBold, size: 9 });
  drawText(formatCurrency(data.oneTimeTotal || 0), margin + contentWidth - 80, y, { font: openSansBold, size: 10 });
  y -= 25;
  
  // Laufzeit
  drawSectionHeader('Laufzeit, Verlängerung und Kündigung');
  const duration = data.contractDuration || 24;
  drawText(`Die Mindestvertragslaufzeit beträgt ${duration} Monat(e), beginnend ab dem Tag der Dienstbereitstellung.`, margin, y, { font: openSans, size: 9 });
  y -= 14;
  drawText('Das Vertragsverhältnis verlängert sich um jeweils einen weiteren Monat, sofern es nicht mit einer', margin, y, { font: openSans, size: 9 });
  y -= 12;
  drawText('Frist von einem (1) Monat zum Ende der Mindestvertragslaufzeit gekündigt wird.', margin, y, { font: openSans, size: 9 });
  
  // Footer
  checkNewPage(60);
  y = margin + 30;
  page.drawLine({ start: { x: margin, y: y + 10 }, end: { x: pageWidth - margin, y: y + 10 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  drawText('COM-IN Telekommunikations GmbH | Erni-Singerl-Straße 2b | 85053 Ingolstadt', margin, y - 5, { font: openSans, size: 8, color: rgb(0.5, 0.5, 0.5) });
  
  return await pdfDoc.save();
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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

    let pdfBytes: Uint8Array;
    
    // Try to fetch VZF template from database
    const { data: templateData } = await supabase
      .from("document_templates")
      .select("pdf_url, name")
      .eq("is_active", true)
      .or("use_case.eq.order_vzf,use_cases.cs.{order_vzf}")
      .not("pdf_url", "is", null)
      .maybeSingle();
    
    if (templateData?.pdf_url) {
      console.log(`Using VZF template: ${templateData.name} from ${templateData.pdf_url}`);
      
      try {
        // Fetch the template PDF
        const templateResponse = await fetch(templateData.pdf_url);
        if (!templateResponse.ok) {
          throw new Error(`Failed to fetch template: ${templateResponse.status}`);
        }
        
        const templatePdfBytes = new Uint8Array(await templateResponse.arrayBuffer());
        console.log(`Template PDF loaded, size: ${templatePdfBytes.length} bytes`);
        
        // Fill the template with data
        pdfBytes = await fillTemplatePdf(templatePdfBytes, vzfData);
        console.log("Template PDF filled successfully");
        
      } catch (templateError) {
        console.error("Error using template, falling back to generated PDF:", templateError);
        pdfBytes = await generateVZFPdfFromScratch(vzfData);
      }
    } else {
      console.log("No VZF template found in database, generating from scratch");
      pdfBytes = await generateVZFPdfFromScratch(vzfData);
    }
    
    // Convert to base64 (chunked to avoid call stack overflow)
    const uint8ToBase64 = (bytes: Uint8Array): string => {
      const chunkSize = 0x8000;
      let binary = "";
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    };

    const base64 = uint8ToBase64(pdfBytes);

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
