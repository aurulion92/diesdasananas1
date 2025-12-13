import { supabase } from '@/integrations/supabase/client';

export interface PDFGenerationResult {
  success: boolean;
  type: 'pdf' | 'html';
  pdf?: string; // Base64 encoded PDF
  html?: string; // Fallback HTML
  filename?: string;
  error?: string;
}

/**
 * Generate a PDF from HTML content using the edge function
 */
export async function generatePDF(html: string, filename: string): Promise<PDFGenerationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-pdf', {
      body: { html, filename }
    });

    if (error) {
      console.error('PDF generation error:', error);
      throw new Error(error.message);
    }

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
 * Fallback: Open HTML in a new tab for printing
 */
export function openHTMLForPrint(html: string): void {
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  }
}

/**
 * Generate and download VZF as PDF
 */
export async function downloadVZFAsPDF(html: string, orderNumber: string): Promise<boolean> {
  const filename = `VZF_${orderNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  const result = await generatePDF(html, filename);
  
  if (result.success) {
    if (result.type === 'pdf' && result.pdf) {
      downloadPDFFromBase64(result.pdf, filename);
      return true;
    } else if (result.type === 'html' && result.html) {
      // Fallback to print dialog
      openHTMLForPrint(result.html);
      return true;
    }
  }
  
  return false;
}

/**
 * Generate and open VZF as PDF in new tab
 */
export async function openVZFAsPDF(html: string, orderNumber: string): Promise<boolean> {
  const filename = `VZF_${orderNumber}.pdf`;
  
  const result = await generatePDF(html, filename);
  
  if (result.success) {
    if (result.type === 'pdf' && result.pdf) {
      openPDFInNewTab(result.pdf);
      return true;
    } else if (result.type === 'html' && result.html) {
      openHTMLForPrint(result.html);
      return true;
    }
  }
  
  return false;
}
