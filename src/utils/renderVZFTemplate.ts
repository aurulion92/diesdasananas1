import { getTemplateByUseCase, renderTemplate } from '@/services/templateService';
import { generateVZFContent, VZFData } from './generateVZF';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export interface VZFRenderData {
  // Customer
  customerName: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  
  // Address
  street: string;
  houseNumber: string;
  city: string;
  
  // Tariff
  tariffName: string;
  tariffPrice: string;
  tariffDownload: string;
  tariffUpload: string;
  contractDuration: string;
  
  // Router
  routerName: string;
  routerPrice: string;
  
  // TV
  tvName: string;
  tvPrice: string;
  
  // Pricing
  monthlyTotal: string;
  oneTimeTotal: string;
  setupFee: string;
  
  // Meta
  orderNumber: string;
  vzfTimestamp: string;
}

/**
 * Build placeholder data from VZF data for template rendering
 */
export function buildVZFPlaceholders(data: VZFRenderData): Record<string, string> {
  return {
    kunde_name: data.customerName,
    kunde_vorname: data.customerFirstName,
    kunde_nachname: data.customerLastName,
    kunde_email: data.customerEmail,
    kunde_telefon: data.customerPhone,
    adresse_strasse: data.street,
    adresse_hausnummer: data.houseNumber,
    adresse_stadt: data.city,
    tarif_name: data.tariffName,
    tarif_preis: data.tariffPrice,
    tarif_download: data.tariffDownload,
    tarif_upload: data.tariffUpload,
    vertragslaufzeit: data.contractDuration,
    router_name: data.routerName,
    router_preis: data.routerPrice,
    tv_name: data.tvName,
    tv_preis: data.tvPrice,
    gesamt_monatlich: data.monthlyTotal,
    gesamt_einmalig: data.oneTimeTotal,
    bereitstellung: data.setupFee,
    bestellnummer: data.orderNumber,
    datum_heute: format(new Date(), 'dd.MM.yyyy', { locale: de }),
    vzf_timestamp: data.vzfTimestamp,
  };
}

/**
 * Render VZF from database template if available, otherwise fall back to hardcoded version
 */
export async function renderVZFFromTemplate(
  vzfData: VZFData,
  renderData: VZFRenderData
): Promise<string> {
  // Try to get template from database
  const template = await getTemplateByUseCase('order_vzf');
  
  if (template) {
    // Use database template
    const placeholders = buildVZFPlaceholders(renderData);
    return renderTemplate(template.content, placeholders);
  }
  
  // Fall back to hardcoded VZF generation
  return generateVZFContent(vzfData);
}

/**
 * Check if a VZF template is configured in the database
 */
export async function hasVZFTemplate(): Promise<boolean> {
  const template = await getTemplateByUseCase('order_vzf');
  return template !== null;
}

/**
 * Download VZF using database template if available
 */
export async function downloadVZFWithTemplate(
  vzfData: VZFData,
  renderData: VZFRenderData,
  filename?: string
): Promise<void> {
  const content = await renderVZFFromTemplate(vzfData, renderData);
  
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `VZF_${renderData.orderNumber}_${format(new Date(), 'yyyy-MM-dd')}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
