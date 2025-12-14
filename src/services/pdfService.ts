import { supabase } from '@/integrations/supabase/client';

export interface VZFPdfData {
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

export interface PDFGenerationResult {
  success: boolean;
  type: 'pdf' | 'html';
  pdf?: string; // Base64 encoded PDF
  html?: string; // Fallback HTML
  filename?: string;
  error?: string;
}

/**
 * Generate a PDF from VZF data using the edge function
 */
export async function generateVZFPDF(vzfData: VZFPdfData, filename: string): Promise<PDFGenerationResult> {
  try {
    console.log('Generating VZF PDF with data:', vzfData.orderNumber);
    
    const { data, error } = await supabase.functions.invoke('generate-pdf', {
      body: { vzfData, filename }
    });

    if (error) {
      console.error('PDF generation error:', error);
      throw new Error(error.message);
    }

    console.log('PDF generation response:', data);
    return data as PDFGenerationResult;
  } catch (error: any) {
    console.error('Failed to generate PDF:', error);
    return {
      success: false,
      type: 'html',
      error: error.message || 'Failed to generate PDF'
    };
  }
}

/**
 * Download a PDF from base64 data
 */
export function downloadPDFFromBase64(base64: string, filename: string): void {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Open a PDF in a new tab from base64 data
 */
export function openPDFInNewTab(base64: string): void {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

/**
 * Generate and download VZF as PDF
 */
export async function downloadVZFAsPDF(vzfData: VZFPdfData): Promise<boolean> {
  const filename = `VZF_${vzfData.orderNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  const result = await generateVZFPDF(vzfData, filename);
  
  if (result.success && result.type === 'pdf' && result.pdf) {
    downloadPDFFromBase64(result.pdf, filename);
    return true;
  }
  
  console.error('PDF generation failed:', result.error);
  return false;
}

/**
 * Generate and open VZF as PDF in new tab
 */
export async function openVZFAsPDF(vzfData: VZFPdfData): Promise<boolean> {
  const filename = `VZF_${vzfData.orderNumber}.pdf`;
  
  const result = await generateVZFPDF(vzfData, filename);
  
  if (result.success && result.type === 'pdf' && result.pdf) {
    openPDFInNewTab(result.pdf);
    return true;
  }
  
  console.error('PDF generation failed:', result.error);
  return false;
}

// Legacy support - keep old interface for backward compatibility
export async function generatePDF(html: string, filename: string): Promise<PDFGenerationResult> {
  console.warn('generatePDF with HTML is deprecated, use generateVZFPDF instead');
  return {
    success: false,
    type: 'html',
    error: 'HTML-based PDF generation is no longer supported'
  };
}

export function openHTMLForPrint(html: string): void {
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  }
}
