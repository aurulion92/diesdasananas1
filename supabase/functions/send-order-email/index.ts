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
  downloadSpeedNormal?: string;
  uploadSpeedNormal?: string;
  downloadSpeedMin?: string;
  uploadSpeedMin?: string;
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
    optionId?: string;
  }>;
  discounts?: Array<{
    name: string;
    amount: number;
    type: 'monthly' | 'one_time';
  }>;
  birthDate?: string;
  phoneNumber?: string;
  consentAdvertising?: boolean;
}

interface OrderEmailRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string;
  salutation?: string;
  vzfData?: VZFData;
}

interface MissingK7Id {
  type: string;
  name: string;
  id?: string;
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
  return amount.toFixed(2).replace('.', ',') + ' €';
}

// Sanitize text for PDF (replace special chars)
function sanitizeText(text: string): string {
  return text
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss').replace(/€/g, 'EUR');
}

// Clean numeric ID (remove decimals)
function cleanNumericId(value: string | null): string {
  if (!value) return '';
  return value.replace(/,\d+$/, '').replace(/\.\d+$/, '').trim();
}

// Convert Uint8Array to base64 string without Stack Overflow
// Uses chunked approach instead of spread operator
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

// Fill Vertragszusammenfassung PDF
async function fillVZFPdf(data: VZFData, orderId: string, customerName: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
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
    const font = options.font || helvetica;
    const size = options.size || 10;
    const color = options.color || textColor;
    page.drawText(sanitizeText(text), { x, y: yPos, font, size, color });
  };
  
  const drawSectionHeader = (title: string) => {
    checkNewPage(40);
    y -= 20;
    page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 22, color: primaryColor });
    drawText(title, margin + 10, y, { font: helveticaBold, size: 11, color: rgb(1, 1, 1) });
    y -= 25;
  };
  
  const drawRow = (label: string, value: string, indent = 0) => {
    checkNewPage(20);
    drawText(label, margin + indent, y, { font: helvetica, size: 9, color: rgb(0.4, 0.4, 0.4) });
    drawText(value, margin + 200 + indent, y, { font: helvetica, size: 9 });
    y -= 14;
  };
  
  const orderNumber = data.orderNumber || `COMIN-${new Date().getFullYear()}-${orderId.substring(0, 4).toUpperCase()}`;
  const date = data.date || new Date().toLocaleDateString('de-DE');
  
  // Header
  drawText('COM-IN Telekommunikations GmbH', pageWidth - margin - 180, y, { font: helveticaBold, size: 9, color: primaryColor });
  y -= 12;
  drawText('Erni-Singerl-Strasse 2b, 85053 Ingolstadt', pageWidth - margin - 180, y, { font: helvetica, size: 8 });
  y -= 11;
  drawText('Tel: 0841 88511-0', pageWidth - margin - 180, y, { font: helvetica, size: 8 });
  
  y = pageHeight - margin - 20;
  drawText('VERTRAGSZUSAMMENFASSUNG', margin, y, { font: helveticaBold, size: 18, color: primaryColor });
  y -= 25;
  
  page.drawRectangle({ x: margin, y: y - 8, width: contentWidth, height: 24, color: lightGray });
  drawText(`Datum: ${date}`, margin + 10, y, { font: helvetica, size: 10 });
  y -= 35;
  
  // Dienste und Geräte
  drawSectionHeader('Dienste und Geraete');
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
  drawText('Monatliche Grundbetraege', margin, y, { font: helveticaBold, size: 9 });
  y -= 14;
  if (data.tariffName && data.tariffPrice) drawRow(data.tariffName, formatCurrency(data.tariffPrice));
  if (data.routerName && data.routerMonthlyPrice) drawRow(data.routerName, formatCurrency(data.routerMonthlyPrice));
  if (data.tvName && data.tvMonthlyPrice) drawRow(data.tvName, formatCurrency(data.tvMonthlyPrice));
  if (data.phoneName && data.phoneMonthlyPrice) {
    const phoneQty = data.phoneLines && data.phoneLines > 1 ? `${data.phoneLines}x ` : '';
    drawRow(`${phoneQty}${data.phoneName}`, formatCurrency(data.phoneMonthlyPrice * (data.phoneLines || 1)));
  }
  // Show selected options with prices
  if (data.selectedOptions) {
    for (const opt of data.selectedOptions) {
      if (opt.monthlyPrice && opt.monthlyPrice > 0) {
        const qty = opt.quantity && opt.quantity > 1 ? `${opt.quantity}x ` : '';
        const totalPrice = opt.monthlyPrice * (opt.quantity || 1);
        drawRow(`${qty}${opt.name}`, formatCurrency(totalPrice));
      }
    }
  }
  // Show monthly discounts
  if (data.discounts) {
    for (const discount of data.discounts) {
      if (discount.type === 'monthly') {
        drawRow(discount.name, `-${formatCurrency(discount.amount)}`);
      }
    }
  }
  
  page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 18, color: lightGray });
  drawText('Summe der monatlichen Grundbetraege', margin + 5, y, { font: helveticaBold, size: 9 });
  drawText(formatCurrency(data.monthlyTotal || 0), margin + contentWidth - 80, y, { font: helveticaBold, size: 10, color: accentColor });
  y -= 25;
  
  drawText('Einmalige Betraege', margin, y, { font: helveticaBold, size: 9 });
  y -= 14;
  if (data.setupFee) drawRow('Bereitstellungspreis:', formatCurrency(data.setupFee));
  if (data.routerOneTimePrice) drawRow(data.routerName || 'Router', formatCurrency(data.routerOneTimePrice));
  // Show one-time option prices
  if (data.selectedOptions) {
    for (const opt of data.selectedOptions) {
      if (opt.oneTimePrice && opt.oneTimePrice > 0) {
        const qty = opt.quantity && opt.quantity > 1 ? `${opt.quantity}x ` : '';
        const totalPrice = opt.oneTimePrice * (opt.quantity || 1);
        drawRow(`${qty}${opt.name}`, formatCurrency(totalPrice));
      }
    }
  }
  // Show one-time discounts
  if (data.discounts) {
    for (const discount of data.discounts) {
      if (discount.type === 'one_time') {
        drawRow(discount.name, `-${formatCurrency(discount.amount)}`);
      }
    }
  }
  
  page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 18, color: lightGray });
  drawText('Summe der einmaligen Betraege', margin + 5, y, { font: helveticaBold, size: 9 });
  drawText(formatCurrency(data.oneTimeTotal || 0), margin + contentWidth - 80, y, { font: helveticaBold, size: 10 });
  y -= 25;
  
  // Aktionen & Rabatte (if any)
  if (data.discounts && data.discounts.length > 0) {
    drawSectionHeader('Aktionen & Rabatte');
    for (const discount of data.discounts) {
      const typeStr = discount.type === 'monthly' ? '/Monat' : ' einmalig';
      drawRow(discount.name, `-${formatCurrency(discount.amount)}${typeStr}`);
    }
    y -= 10;
  }
  
  // Laufzeit
  drawSectionHeader('Laufzeit, Verlaengerung und Kuendigung');
  const duration = data.contractDuration || 24;
  drawText(`Die Mindestvertragslaufzeit betraegt ${duration} Monat(e), beginnend ab dem Tag der Dienstbereitstellung.`, margin, y, { font: helvetica, size: 9 });
  y -= 14;
  drawText('Das Vertragsverhaeltnis verlaengert sich um jeweils einen weiteren Monat, sofern es nicht mit einer', margin, y, { font: helvetica, size: 9 });
  y -= 12;
  drawText('Frist von einem (1) Monat zum Ende der Mindestvertragslaufzeit gekuendigt wird.', margin, y, { font: helvetica, size: 9 });
  
  // Footer
  checkNewPage(60);
  y = margin + 30;
  page.drawLine({ start: { x: margin, y: y + 10 }, end: { x: pageWidth - margin, y: y + 10 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  drawText('COM-IN Telekommunikations GmbH | Erni-Singerl-Strasse 2b | 85053 Ingolstadt', margin, y - 5, { font: helvetica, size: 8, color: rgb(0.5, 0.5, 0.5) });
  
  return await pdfDoc.save();
}

// Fill Auftragsformular PDF
async function fillAuftragPdf(data: VZFData, orderId: string, customerName: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
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
    const font = options.font || helvetica;
    const size = options.size || 10;
    const color = options.color || textColor;
    page.drawText(sanitizeText(text), { x, y: yPos, font, size, color });
  };
  
  const drawSectionHeader = (title: string) => {
    checkNewPage(40);
    y -= 20;
    page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 22, color: primaryColor });
    drawText(title, margin + 10, y, { font: helveticaBold, size: 11, color: rgb(1, 1, 1) });
    y -= 25;
  };
  
  const drawRow = (label: string, value: string) => {
    checkNewPage(20);
    drawText(label, margin, y, { font: helvetica, size: 9, color: rgb(0.4, 0.4, 0.4) });
    drawText(value, margin + 180, y, { font: helvetica, size: 9 });
    y -= 14;
  };
  
  const orderNumber = data.orderNumber || `COMIN-${new Date().getFullYear()}-${orderId.substring(0, 4).toUpperCase()}`;
  const date = data.date || new Date().toLocaleDateString('de-DE');
  
  // Header
  drawText('COM-IN Telekommunikations GmbH', pageWidth - margin - 180, y, { font: helveticaBold, size: 9, color: primaryColor });
  y -= 12;
  drawText('Erni-Singerl-Strasse 2b', pageWidth - margin - 180, y, { font: helvetica, size: 8 });
  y -= 11;
  drawText('85053 Ingolstadt', pageWidth - margin - 180, y, { font: helvetica, size: 8 });
  
  y = pageHeight - margin - 20;
  drawText('Auftragsformular Glasfaserdienste', margin, y, { font: helveticaBold, size: 18, color: primaryColor });
  y -= 18;
  drawText('Privatkunden', margin, y, { font: helvetica, size: 12, color: textColor });
  y -= 25;
  
  page.drawRectangle({ x: margin, y: y - 8, width: contentWidth, height: 24, color: lightGray });
  drawText(`Datum: ${date}`, margin + 10, y, { font: helvetica, size: 10 });
  y -= 35;
  
  // 1. Auftraggeber / Kundendaten
  drawSectionHeader('1. Auftraggeber / Kundendaten');
  
  drawText('Rechnungsanschrift', margin, y, { font: helveticaBold, size: 10 });
  y -= 16;
  const fullName = `${data.salutation || ''} ${data.customerFirstName || ''} ${data.customerLastName || customerName}`.trim();
  drawRow('Name:', fullName);
  drawRow('Strasse:', `${data.street || ''} ${data.houseNumber || ''}`);
  drawRow('PLZ / Ort:', `${data.postalCode || ''} ${data.city || ''}`);
  y -= 10;
  
  drawText('Installationsanschrift', margin, y, { font: helveticaBold, size: 10 });
  y -= 16;
  drawRow('Name:', fullName);
  drawRow('Strasse:', `${data.street || ''} ${data.houseNumber || ''}`);
  drawRow('PLZ / Ort:', `${data.postalCode || ''} ${data.city || ''}`);
  y -= 10;
  
  drawText('Persoenliche Daten', margin, y, { font: helveticaBold, size: 10 });
  y -= 16;
  if (data.phoneNumber || data.customerPhone) drawRow('Ihre Rueckrufnummer(n):', data.phoneNumber || data.customerPhone || '');
  if (data.birthDate) drawRow('Ihr Geburtsdatum:', data.birthDate);
  if (data.customerEmail) drawRow('Ihre E-Mail-Adresse:', data.customerEmail);
  y -= 10;
  
  // 2. Dienste und Geräte
  drawSectionHeader('2. Dienste und Geraete');
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
  
  // 3. Preis
  drawSectionHeader('3. Preis');
  drawText('Monatliche Grundbetraege', margin, y, { font: helveticaBold, size: 9 });
  y -= 14;
  if (data.tariffName && data.tariffPrice) drawRow(data.tariffName, formatCurrency(data.tariffPrice));
  if (data.routerName && data.routerMonthlyPrice) drawRow(data.routerName, formatCurrency(data.routerMonthlyPrice));
  if (data.tvName && data.tvMonthlyPrice) drawRow(data.tvName, formatCurrency(data.tvMonthlyPrice));
  if (data.phoneName && data.phoneMonthlyPrice) {
    const phoneQty = data.phoneLines && data.phoneLines > 1 ? `${data.phoneLines}x ` : '';
    drawRow(`${phoneQty}${data.phoneName}`, formatCurrency(data.phoneMonthlyPrice * (data.phoneLines || 1)));
  }
  // Show selected options with monthly prices
  if (data.selectedOptions) {
    for (const opt of data.selectedOptions) {
      if (opt.monthlyPrice && opt.monthlyPrice > 0) {
        const qty = opt.quantity && opt.quantity > 1 ? `${opt.quantity}x ` : '';
        const totalPrice = opt.monthlyPrice * (opt.quantity || 1);
        drawRow(`${qty}${opt.name}`, formatCurrency(totalPrice));
      }
    }
  }
  // Show monthly discounts inline
  if (data.discounts) {
    for (const discount of data.discounts) {
      if (discount.type === 'monthly') {
        drawRow(discount.name, `-${formatCurrency(discount.amount)}`);
      }
    }
  }
  
  page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 18, color: lightGray });
  drawText('Summe der monatlichen Grundbetraege', margin + 5, y, { font: helveticaBold, size: 9 });
  drawText(formatCurrency(data.monthlyTotal || 0), margin + contentWidth - 80, y, { font: helveticaBold, size: 10, color: accentColor });
  y -= 25;
  
  drawText('Einmalige Betraege', margin, y, { font: helveticaBold, size: 9 });
  y -= 14;
  if (data.setupFee) drawRow('Bereitstellung:', formatCurrency(data.setupFee));
  if (data.routerOneTimePrice) drawRow(data.routerName || 'Router einmalig', formatCurrency(data.routerOneTimePrice));
  // Show selected options with one-time prices
  if (data.selectedOptions) {
    for (const opt of data.selectedOptions) {
      if (opt.oneTimePrice && opt.oneTimePrice > 0) {
        const qty = opt.quantity && opt.quantity > 1 ? `${opt.quantity}x ` : '';
        const totalPrice = opt.oneTimePrice * (opt.quantity || 1);
        drawRow(`${qty}${opt.name}`, formatCurrency(totalPrice));
      }
    }
  }
  // Show one-time discounts inline
  if (data.discounts) {
    for (const discount of data.discounts) {
      if (discount.type === 'one_time') {
        drawRow(discount.name, `-${formatCurrency(discount.amount)}`);
      }
    }
  }
  
  page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 18, color: lightGray });
  drawText('Summe der einmaligen Betraege', margin + 5, y, { font: helveticaBold, size: 9 });
  drawText(formatCurrency(data.oneTimeTotal || 0), margin + contentWidth - 80, y, { font: helveticaBold, size: 10 });
  y -= 30;
  
  // New page for remaining sections
  page = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - margin;
  
  // 4. Bemerkung / Sonderaktion
  drawSectionHeader('4. Bemerkung / Sonderaktion');
  if (data.discounts && data.discounts.length > 0) {
    for (const discount of data.discounts) {
      drawRow(discount.name, `-${formatCurrency(discount.amount)}`);
    }
  } else {
    drawText('Keine Sonderaktionen', margin, y, { font: helvetica, size: 9 });
    y -= 14;
  }
  y -= 10;
  
  // 5. Wechselservice
  drawSectionHeader('5. Wechselservice');
  if (data.previousProvider) {
    drawRow('Bisheriger Anbieter:', data.previousProvider);
    drawRow('Kuendigung durch COM-IN:', data.cancelPreviousProvider ? 'Ja' : 'Nein');
  } else {
    drawText('Kein Anbieterwechsel', margin, y, { font: helvetica, size: 9 });
    y -= 14;
  }
  y -= 10;
  
  // 6. Rufnummernmitnahme
  drawSectionHeader('8. Rufnummernmitnahme');
  if (data.phonePorting) {
    drawRow('Rufnummernmitnahme:', 'Ja');
    if (data.phonePortingProvider) drawRow('Bisheriger Anbieter:', data.phonePortingProvider);
    if (data.phonePortingNumbers && data.phonePortingNumbers.length > 0) {
      drawRow('Rufnummern:', data.phonePortingNumbers.join(', '));
    }
  } else {
    drawText('Keine Rufnummernmitnahme', margin, y, { font: helvetica, size: 9 });
    y -= 14;
  }
  y -= 10;
  
  // 9. Telefonbucheintrag
  drawSectionHeader('9. Eintrag in Endnutzerverzeichnisse');
  if (data.phoneBookEntry && data.phoneBookEntry !== 'none') {
    drawRow('Telefonbucheintrag:', data.phoneBookEntry);
  } else {
    drawText('Kein Telefonbucheintrag gewuenscht', margin, y, { font: helvetica, size: 9 });
    y -= 14;
  }
  y -= 10;
  
  // 10. Werbeeinwilligung
  drawSectionHeader('10. Werbeeinwilligung');
  drawRow('Werbeeinwilligung erteilt:', data.consentAdvertising ? 'Ja' : 'Nein');
  y -= 10;
  
  // SEPA Mandat page
  page = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - margin;
  
  drawSectionHeader('SEPA-Lastschrift-Mandat');
  y -= 10;
  drawText('Kontoinhaber', margin, y, { font: helveticaBold, size: 10 });
  y -= 16;
  drawRow('Name:', data.bankAccountHolder || '');
  y -= 10;
  
  drawText('Kreditinstitut', margin, y, { font: helveticaBold, size: 10 });
  y -= 16;
  drawRow('IBAN:', data.bankIban || '');
  y -= 20;
  
  drawText('Ich ermaechtige die COM-IN Telekommunikations GmbH, Erni-Singerl-Strasse 2b,', margin, y, { font: helvetica, size: 9 });
  y -= 12;
  drawText('85053 Ingolstadt (Zahlungsempfaenger) Zahlungen von meinem Konto mittels', margin, y, { font: helvetica, size: 9 });
  y -= 12;
  drawText('Lastschrift einzuziehen.', margin, y, { font: helvetica, size: 9 });
  
  return await pdfDoc.save();
}

// Fetch PDF from URL
async function fetchPdfFromUrl(url: string): Promise<Uint8Array | null> {
  try {
    console.log(`Fetching PDF from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch PDF: ${response.status}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    console.error(`Error fetching PDF: ${error}`);
    return null;
  }
}

// Check for missing K7 IDs
async function checkMissingK7Ids(
  supabase: any,
  orderId: string,
  productId: string | null,
  street: string,
  houseNumber: string,
  city: string,
  selectedOptions: any[]
): Promise<MissingK7Id[]> {
  const missingIds: MissingK7Id[] = [];
  
  // Check product K7 ID
  if (productId) {
    const { data: product } = await supabase
      .from('products')
      .select('product_id_k7, name')
      .eq('id', productId)
      .single();
    
    if (product && !cleanNumericId(product.product_id_k7)) {
      missingIds.push({ type: 'Produkt', name: product.name, id: productId });
    }
  }
  
  // Check building K7 ID
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, gebaeude_id_k7, street, house_number')
    .ilike('street', street)
    .ilike('house_number', houseNumber)
    .ilike('city', city)
    .limit(1);
  
  if (buildings && buildings.length > 0) {
    const building = buildings[0];
    if (!cleanNumericId(building.gebaeude_id_k7)) {
      missingIds.push({ type: 'Gebäude K7 ID', name: `${street} ${houseNumber}, ${city}`, id: building.id });
    }
    
    // Check building K7 services (Vorleistungsprodukt)
    const { data: k7Services } = await supabase
      .from('building_k7_services')
      .select('*')
      .eq('building_id', building.id);
    
    if (!k7Services || k7Services.length === 0) {
      missingIds.push({ type: 'Vorleistungsprodukt (K7 Services)', name: `${street} ${houseNumber}, ${city}`, id: building.id });
    } else {
      // Check if any K7 service has missing IDs
      const hasCompleteK7 = k7Services.some((k7: any) => 
        cleanNumericId(k7.leistungsprodukt_id) && cleanNumericId(k7.nt_dsl_bandbreite_id)
      );
      if (!hasCompleteK7) {
        missingIds.push({ type: 'Vorleistungsprodukt IDs (leistungsprodukt_id/nt_dsl_bandbreite_id)', name: `${street} ${houseNumber}, ${city}` });
      }
    }
  } else {
    missingIds.push({ type: 'Gebäude nicht gefunden', name: `${street} ${houseNumber}, ${city}` });
  }
  
  // Check option K7 IDs
  for (const opt of selectedOptions || []) {
    if (opt.optionId && productId) {
      const { data: mapping } = await supabase
        .from('product_option_mappings')
        .select('option_id_k7')
        .eq('option_id', opt.optionId)
        .eq('product_id', productId)
        .maybeSingle();
      
      if (!mapping?.option_id_k7 || !cleanNumericId(mapping.option_id_k7)) {
        missingIds.push({ type: 'Option K7 ID', name: opt.name || 'Unbekannte Option', id: opt.optionId });
      }
    }
  }
  
  return missingIds;
}

// Send fallback email to admin
async function sendFallbackEmail(
  emailSettings: any,
  fallbackEmail: string,
  orderId: string,
  orderData: any,
  missingK7Ids: MissingK7Id[],
  vzfData: VZFData
): Promise<void> {
  const orderNumber = vzfData.orderNumber || `COMIN-${new Date().getFullYear()}-${orderId.substring(0, 4).toUpperCase()}`;
  
  // Build missing K7 IDs list HTML
  const missingK7Html = missingK7Ids.map(m => 
    `<li><strong>${m.type}:</strong> ${m.name}${m.id ? ` (ID: ${m.id})` : ''}</li>`
  ).join('\n');
  
  // Build order details HTML
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        h1 { color: #c00; }
        h2 { color: #003366; border-bottom: 1px solid #003366; padding-bottom: 5px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .warning h3 { color: #856404; margin-top: 0; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 5px; }
      </style>
    </head>
    <body>
      <h1>⚠️ Neue Bestellung - Elektronische Verarbeitung nicht möglich</h1>
      
      <div class="warning">
        <h3>Fehlende K7-IDs für XML-Generierung:</h3>
        <ul>
          ${missingK7Html}
        </ul>
        <p><em>Diese Bestellung kann nicht automatisch als XML für K7 verarbeitet werden und muss manuell bearbeitet werden.</em></p>
      </div>
      
      <h2>Bestellnummer: ${orderNumber}</h2>
      <p><strong>Bestelldatum:</strong> ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}</p>
      
      <div class="section">
        <h3>👤 Kundendaten</h3>
        <table>
          <tr><th>Name</th><td>${vzfData.salutation || ''} ${vzfData.customerFirstName || ''} ${vzfData.customerLastName || vzfData.customerName || ''}</td></tr>
          <tr><th>E-Mail</th><td>${vzfData.customerEmail || ''}</td></tr>
          <tr><th>Telefon</th><td>${vzfData.customerPhone || ''}</td></tr>
        </table>
      </div>
      
      <div class="section">
        <h3>📍 Anschlussadresse</h3>
        <table>
          <tr><th>Straße</th><td>${vzfData.street || ''} ${vzfData.houseNumber || ''}</td></tr>
          <tr><th>PLZ / Ort</th><td>${vzfData.postalCode || ''} ${vzfData.city || ''}</td></tr>
          ${vzfData.floor ? `<tr><th>Etage</th><td>${vzfData.floor}</td></tr>` : ''}
          ${vzfData.apartment ? `<tr><th>Wohnung</th><td>${vzfData.apartment}</td></tr>` : ''}
        </table>
      </div>
      
      <div class="section">
        <h3>📦 Bestellte Produkte</h3>
        <table>
          <tr><th>Tarif</th><td>${vzfData.tariffName || ''}</td><td>${vzfData.tariffPrice ? formatCurrency(vzfData.tariffPrice) + '/Monat' : ''}</td></tr>
          ${vzfData.routerName ? `<tr><th>Router</th><td>${vzfData.routerName}</td><td>${vzfData.routerMonthlyPrice ? formatCurrency(vzfData.routerMonthlyPrice) + '/Monat' : ''}</td></tr>` : ''}
          ${vzfData.tvName ? `<tr><th>TV</th><td>${vzfData.tvName}</td><td>${vzfData.tvMonthlyPrice ? formatCurrency(vzfData.tvMonthlyPrice) + '/Monat' : ''}</td></tr>` : ''}
          ${vzfData.phoneName ? `<tr><th>Telefon</th><td>${vzfData.phoneName} (${vzfData.phoneLines || 1} Leitung(en))</td><td>${vzfData.phoneMonthlyPrice ? formatCurrency(vzfData.phoneMonthlyPrice) + '/Monat' : ''}</td></tr>` : ''}
        </table>
        ${vzfData.selectedOptions && vzfData.selectedOptions.length > 0 ? `
          <h4>Zusätzliche Optionen:</h4>
          <table>
            ${vzfData.selectedOptions.map(opt => `
              <tr>
                <td>${opt.quantity && opt.quantity > 1 ? opt.quantity + 'x ' : ''}${opt.name}</td>
                <td>${opt.monthlyPrice ? formatCurrency(opt.monthlyPrice) + '/Monat' : ''}${opt.oneTimePrice ? formatCurrency(opt.oneTimePrice) + ' einmalig' : ''}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}
      </div>
      
      <div class="section">
        <h3>💰 Preiszusammenfassung</h3>
        <table>
          <tr><th>Monatlich gesamt</th><td><strong>${formatCurrency(vzfData.monthlyTotal || 0)}</strong></td></tr>
          <tr><th>Einmalig gesamt</th><td><strong>${formatCurrency(vzfData.oneTimeTotal || 0)}</strong></td></tr>
          <tr><th>Bereitstellungspreis</th><td>${formatCurrency(vzfData.setupFee || 0)}</td></tr>
          <tr><th>Vertragslaufzeit</th><td>${vzfData.contractDuration || 24} Monate</td></tr>
        </table>
        ${vzfData.discounts && vzfData.discounts.length > 0 ? `
          <h4>Angewandte Rabatte:</h4>
          <ul>
            ${vzfData.discounts.map(d => `<li>${d.name}: -${formatCurrency(d.amount)} (${d.type === 'monthly' ? 'monatlich' : 'einmalig'})</li>`).join('')}
          </ul>
        ` : ''}
      </div>
      
      ${vzfData.phonePorting ? `
        <div class="section">
          <h3>📞 Rufnummernmitnahme</h3>
          <table>
            <tr><th>Bisheriger Anbieter</th><td>${vzfData.phonePortingProvider || ''}</td></tr>
            <tr><th>Rufnummern</th><td>${vzfData.phonePortingNumbers?.join(', ') || ''}</td></tr>
          </table>
        </div>
      ` : ''}
      
      ${vzfData.previousProvider ? `
        <div class="section">
          <h3>🔄 Anbieterwechsel</h3>
          <table>
            <tr><th>Bisheriger Anbieter</th><td>${vzfData.previousProvider}</td></tr>
            <tr><th>Kündigung durch COM-IN</th><td>${vzfData.cancelPreviousProvider ? 'Ja' : 'Nein'}</td></tr>
          </table>
        </div>
      ` : ''}
      
      <div class="section">
        <h3>🏦 Bankverbindung</h3>
        <table>
          <tr><th>Kontoinhaber</th><td>${vzfData.bankAccountHolder || ''}</td></tr>
          <tr><th>IBAN</th><td>${vzfData.bankIban || ''}</td></tr>
        </table>
      </div>
      
      <hr>
      <p style="color: #666; font-size: 12px;">
        Diese E-Mail wurde automatisch generiert, da die Bestellung nicht elektronisch über K7 verarbeitet werden kann.<br>
        Bestellungs-ID: ${orderId}
      </p>
    </body>
    </html>
  `;
  
  const subjectText = `⚠️ Neue Bestellung - Elektronische Verarbeitung nicht möglich (${orderNumber})`;
  const subjectEncoded = btoa(unescape(encodeURIComponent(subjectText)));
  
  const boundary = "----=_Fallback_" + Date.now().toString(36);
  
  console.log(`Sending fallback email to ${fallbackEmail}...`);
  
  const conn = await Deno.connect({
    hostname: emailSettings.smtp_host,
    port: parseInt(emailSettings.smtp_port) || 587,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readResponse = async (): Promise<string> => {
    const buffer = new Uint8Array(4096);
    const n = await conn.read(buffer);
    if (n === null) return "";
    return decoder.decode(buffer.subarray(0, n));
  };

  const sendCommand = async (cmd: string): Promise<string> => {
    await conn.write(encoder.encode(cmd + "\r\n"));
    return await readResponse();
  };

  try {
    await readResponse();
    await sendCommand(`EHLO localhost`);
    const tlsResponse = await sendCommand("STARTTLS");

    if (!tlsResponse.startsWith("220")) {
      throw new Error("STARTTLS not supported: " + tlsResponse);
    }

    const tlsConn = await Deno.startTls(conn, { hostname: emailSettings.smtp_host });

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

    await sendTlsCommand(`EHLO localhost`);
    let response = await sendTlsCommand("AUTH LOGIN");
    
    if (!response.startsWith("334")) throw new Error("AUTH LOGIN failed: " + response);
    
    response = await sendTlsCommand(btoa(emailSettings.smtp_user));
    if (!response.startsWith("334")) throw new Error("Username rejected: " + response);
    
    response = await sendTlsCommand(btoa(emailSettings.smtp_password));
    if (!response.startsWith("235")) throw new Error("Authentication failed: " + response);

    response = await sendTlsCommand(`MAIL FROM:<${emailSettings.sender_email}>`);
    if (!response.startsWith("250")) throw new Error("MAIL FROM failed: " + response);

    response = await sendTlsCommand(`RCPT TO:<${fallbackEmail}>`);
    if (!response.startsWith("250")) throw new Error("RCPT TO failed: " + response);

    response = await sendTlsCommand("DATA");
    if (!response.startsWith("354")) throw new Error("DATA command failed: " + response);

    const emailContent = [
      `From: ${emailSettings.sender_name} <${emailSettings.sender_email}>`,
      `To: ${fallbackEmail}`,
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
      `--${boundary}--`,
      `.`,
    ].join("\r\n");

    await tlsConn.write(encoder.encode(emailContent + "\r\n"));
    response = await readTlsResponse();
    
    if (!response.startsWith("250")) throw new Error("Email sending failed: " + response);
    
    console.log(`Fallback email sent successfully to ${fallbackEmail}`);

    await sendTlsCommand("QUIT");
    tlsConn.close();
  } catch (error) {
    conn.close();
    throw error;
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestData: OrderEmailRequest = await req.json();
    const { orderId, customerEmail, customerName, customerFirstName, customerLastName, customerPhone, salutation, vzfData } = requestData;

    console.log(`Processing order email for order ${orderId} to ${customerEmail}`);

    // Fetch email settings
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
      fallback_order_email?: string;
    };

    if (!emailSettings.smtp_host || !emailSettings.smtp_user || !emailSettings.smtp_password || !emailSettings.sender_email) {
      console.error("Incomplete email settings");
      return new Response(
        JSON.stringify({ error: "E-Mail-Einstellungen unvollstaendig" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order data for K7 check
    const { data: orderData } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    // Fetch email template
    const { data: templateData } = await supabase
      .from("document_templates")
      .select("content, name")
      .eq("is_active", true)
      .or("use_case.eq.order_confirmation_email,use_cases.cs.{order_confirmation_email}")
      .maybeSingle();

    // Fetch all attachment templates
    const { data: attachmentTemplates } = await supabase
      .from("document_templates")
      .select("name, use_case, use_cases, pdf_url")
      .eq("is_active", true);

    console.log("Found attachment templates:", attachmentTemplates?.length || 0);

    // Build placeholder data
    const orderNumber = vzfData?.orderNumber || `COMIN-${new Date().getFullYear()}-${orderId.substring(0, 4).toUpperCase()}`;
    const emailPlaceholders: Record<string, string> = {
      kunde_anrede: salutation || 'Herr/Frau',
      kunde_vorname: customerFirstName || customerName.split(' ')[0] || '',
      kunde_nachname: customerLastName || customerName.split(' ').slice(1).join(' ') || '',
      kunde_name: customerName,
      kunde_telefon: customerPhone || '',
      kunde_email: customerEmail,
      adresse_strasse: vzfData?.street || '',
      adresse_hausnummer: vzfData?.houseNumber || '',
      adresse_plz: vzfData?.postalCode || '',
      adresse_stadt: vzfData?.city || '',
      bestellnummer: orderNumber,
      produkt_name: vzfData?.tariffName ? `${vzfData.tariffName} - ${vzfData.contractDuration || 24} Monate` : '',
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
        <head><meta charset="utf-8"></head>
        <body>
          <p>Sehr geehrte/r ${customerName},</p>
          <p>vielen Dank für Ihre Bestellung. Ihre Bestellnummer: ${orderNumber}</p>
          <p>Mit freundlichen Grüßen,<br>COM-IN Telekommunikations GmbH</p>
        </body>
        </html>
      `;
    }

    // Prepare VZF data
    const fullVzfData: VZFData = {
      ...vzfData,
      orderNumber,
      date: vzfData?.date || new Date().toLocaleDateString('de-DE'),
      customerName,
      customerFirstName,
      customerLastName,
      customerEmail,
      customerPhone,
      salutation,
    };

    // Generate filled PDFs
    console.log("Generating filled VZF PDF...");
    const vzfPdfBytes = await fillVZFPdf(fullVzfData, orderId, customerName);
    console.log("VZF PDF generated, size:", vzfPdfBytes.length);

    console.log("Generating filled Auftrag PDF...");
    const auftragPdfBytes = await fillAuftragPdf(fullVzfData, orderId, customerName);
    console.log("Auftrag PDF generated, size:", auftragPdfBytes.length);

    // Find and fetch static PDF templates
    let agbPdfBytes: Uint8Array | null = null;
    let produktinfoPdfBytes: Uint8Array | null = null;

    if (attachmentTemplates) {
      for (const tpl of attachmentTemplates) {
        const useCases = tpl.use_cases || (tpl.use_case ? [tpl.use_case] : []);
        
        if (useCases.includes('order_attachment_agb') && tpl.pdf_url) {
          console.log("Fetching AGB PDF...");
          agbPdfBytes = await fetchPdfFromUrl(tpl.pdf_url);
        }
        if (useCases.includes('order_attachment_produktinfo') && tpl.pdf_url) {
          console.log("Fetching Produktinfo PDF...");
          produktinfoPdfBytes = await fetchPdfFromUrl(tpl.pdf_url);
        }
      }
    }

    // Build email with attachments
    const boundary = "----=_Part_" + Date.now().toString(36);
    const subjectText = `Bestellbestätigung - COM-IN (${orderNumber})`;
    const subjectEncoded = btoa(unescape(encodeURIComponent(subjectText)));

    const attachments: string[] = [];

    // Add VZF PDF - use chunked base64 encoding to avoid stack overflow
    const vzfBase64 = uint8ArrayToBase64(vzfPdfBytes);
    attachments.push(
      `--${boundary}`,
      `Content-Type: application/pdf; name="Vertragszusammenfassung_${orderNumber}.pdf"`,
      `Content-Disposition: attachment; filename="Vertragszusammenfassung_${orderNumber}.pdf"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      ...vzfBase64.match(/.{1,76}/g) || [vzfBase64],
      ``
    );

    // Add Auftrag PDF
    const auftragBase64 = uint8ArrayToBase64(auftragPdfBytes);
    attachments.push(
      `--${boundary}`,
      `Content-Type: application/pdf; name="Auftragsformular_${orderNumber}.pdf"`,
      `Content-Disposition: attachment; filename="Auftragsformular_${orderNumber}.pdf"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      ...auftragBase64.match(/.{1,76}/g) || [auftragBase64],
      ``
    );

    // Add AGB PDF if available
    if (agbPdfBytes) {
      const agbBase64 = uint8ArrayToBase64(agbPdfBytes);
      attachments.push(
        `--${boundary}`,
        `Content-Type: application/pdf; name="AGB.pdf"`,
        `Content-Disposition: attachment; filename="AGB.pdf"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        ...agbBase64.match(/.{1,76}/g) || [agbBase64],
        ``
      );
      console.log("AGB PDF attached");
    }

    // Add Produktinfo PDF if available
    if (produktinfoPdfBytes) {
      const produktinfoBase64 = uint8ArrayToBase64(produktinfoPdfBytes);
      attachments.push(
        `--${boundary}`,
        `Content-Type: application/pdf; name="Produktinformationsblatt.pdf"`,
        `Content-Disposition: attachment; filename="Produktinformationsblatt.pdf"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        ...produktinfoBase64.match(/.{1,76}/g) || [produktinfoBase64],
        ``
      );
      console.log("Produktinfo PDF attached");
    }

    // Connect to SMTP server
    console.log(`Connecting to ${emailSettings.smtp_host}:${emailSettings.smtp_port}`);
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const conn = await Deno.connect({
      hostname: emailSettings.smtp_host,
      port: parseInt(emailSettings.smtp_port) || 587,
    });

    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(4096);
      const n = await conn.read(buffer);
      if (n === null) return "";
      return decoder.decode(buffer.subarray(0, n));
    };

    const sendCommand = async (cmd: string): Promise<string> => {
      await conn.write(encoder.encode(cmd + "\r\n"));
      return await readResponse();
    };

    try {
      let response = await readResponse();
      console.log("SMTP greeting received");

      response = await sendCommand(`EHLO localhost`);
      response = await sendCommand("STARTTLS");

      if (!response.startsWith("220")) {
        throw new Error("STARTTLS not supported: " + response);
      }

      const tlsConn = await Deno.startTls(conn, { hostname: emailSettings.smtp_host });

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

      response = await sendTlsCommand(`EHLO localhost`);
      response = await sendTlsCommand("AUTH LOGIN");
      
      if (!response.startsWith("334")) throw new Error("AUTH LOGIN failed: " + response);
      
      response = await sendTlsCommand(btoa(emailSettings.smtp_user));
      if (!response.startsWith("334")) throw new Error("Username rejected: " + response);
      
      response = await sendTlsCommand(btoa(emailSettings.smtp_password));
      if (!response.startsWith("235")) throw new Error("Authentication failed: " + response);
      
      console.log("Authentication successful");

      response = await sendTlsCommand(`MAIL FROM:<${emailSettings.sender_email}>`);
      if (!response.startsWith("250")) throw new Error("MAIL FROM failed: " + response);

      response = await sendTlsCommand(`RCPT TO:<${customerEmail}>`);
      if (!response.startsWith("250")) throw new Error("RCPT TO failed: " + response);

      response = await sendTlsCommand("DATA");
      if (!response.startsWith("354")) throw new Error("DATA command failed: " + response);

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
        ...attachments,
        `--${boundary}--`,
        `.`,
      ].join("\r\n");

      await tlsConn.write(encoder.encode(emailContent + "\r\n"));
      response = await readTlsResponse();
      
      if (!response.startsWith("250")) throw new Error("Email sending failed: " + response);
      
      const attachmentCount = 2 + (agbPdfBytes ? 1 : 0) + (produktinfoPdfBytes ? 1 : 0);
      console.log(`Customer email sent successfully with ${attachmentCount} PDF attachments`);

      await sendTlsCommand("QUIT");
      tlsConn.close();

    } catch (smtpError) {
      conn.close();
      throw smtpError;
    }

    // After customer email is sent, check for missing K7 IDs and send fallback if needed
    let fallbackSent = false;
    if (emailSettings.fallback_order_email && orderData) {
      try {
        console.log("Checking for missing K7 IDs...");
        
        // Get selected options with option IDs from vzfData
        const selectedOptionsWithIds = vzfData?.selectedOptions || [];
        
        const missingK7Ids = await checkMissingK7Ids(
          supabase,
          orderId,
          orderData.product_id,
          orderData.street,
          orderData.house_number,
          orderData.city,
          selectedOptionsWithIds
        );
        
        if (missingK7Ids.length > 0) {
          console.log(`Found ${missingK7Ids.length} missing K7 IDs:`, missingK7Ids);
          
          await sendFallbackEmail(
            emailSettings,
            emailSettings.fallback_order_email,
            orderId,
            orderData,
            missingK7Ids,
            fullVzfData
          );
          fallbackSent = true;
        } else {
          console.log("All K7 IDs are present, no fallback email needed");
        }
      } catch (fallbackError) {
        console.error("Error checking/sending fallback email:", fallbackError);
        // Don't fail the main response if fallback fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `E-Mail mit PDF-Anhängen erfolgreich gesendet${fallbackSent ? ' (+ Fallback an Admin)' : ''}` 
      }),
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
