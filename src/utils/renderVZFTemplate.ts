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
  
  // Speed transparency (Transparenzverordnung) - optional, will be calculated if not provided
  downloadMax?: string;
  downloadNormal?: string;
  downloadMin?: string;
  uploadMax?: string;
  uploadNormal?: string;
  uploadMin?: string;
  
  // Tariff description - optional
  produktBeschreibung?: string;
  
  // Router
  routerName: string;
  routerPrice: string;
  routerOneTime?: string;
  routerAktion?: string;
  
  // TV
  tvName: string;
  tvPrice: string;
  tvOneTime?: string;
  tvAktion?: string;
  tvBeschreibung?: string;
  
  // Hardware - optional
  hardwareName?: string;
  hardwarePrice?: string;
  hardwareOneTime?: string;
  hardwareAktion?: string;
  
  // Pricing
  monthlyTotal: string;
  oneTimeTotal: string;
  setupFee: string;
  tariffAktion?: string;
  tariffSonstiges?: string;
  
  // Contract - optional
  vorzeitigesKuendigungsrecht?: string;
  entgeltVorzeitigeKuendigung?: string;
  aktionHinweis?: string;
  
  // Meta
  orderNumber: string;
  vzfTimestamp: string;
  wunschtermin?: string;
}

/**
 * Extract download speed from string like "150 Mbit/s" -> 150
 */
function extractSpeed(speedStr: string): number {
  const match = speedStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Build placeholder data from VZF data for template rendering
 */
export function buildVZFPlaceholders(data: VZFRenderData): Record<string, string> {
  // Calculate speed values if not provided
  const downloadMax = extractSpeed(data.tariffDownload);
  const uploadMax = extractSpeed(data.tariffUpload);
  
  // Use provided values or calculate defaults (83% for normal, 67% for min)
  const downloadMaxStr = data.downloadMax || String(downloadMax);
  const downloadNormalStr = data.downloadNormal || String(Math.round(downloadMax * 0.83));
  const downloadMinStr = data.downloadMin || String(Math.round(downloadMax * 0.67));
  const uploadMaxStr = data.uploadMax || String(uploadMax);
  const uploadNormalStr = data.uploadNormal || String(Math.round(uploadMax * 0.8));
  const uploadMinStr = data.uploadMin || String(Math.round(uploadMax * 0.67));
  
  // Default product description
  const produktBeschreibung = data.produktBeschreibung || 
    `Das Produkt "${data.tariffName}" beinhaltet einen Glasfaser-Festnetzanschluss für Internetdienste. Im monatlichen Entgelt ist eine Flatrate für die Internetnutzung enthalten.`;
  
  return {
    // Customer
    kunde_name: data.customerName,
    kunde_vorname: data.customerFirstName,
    kunde_nachname: data.customerLastName,
    kunde_email: data.customerEmail,
    kunde_telefon: data.customerPhone,
    
    // Address
    adresse_strasse: data.street,
    adresse_hausnummer: data.houseNumber,
    adresse_stadt: data.city,
    
    // Tariff
    tarif_name: data.tariffName,
    tarif_preis: data.tariffPrice,
    tarif_download: data.tariffDownload,
    tarif_upload: data.tariffUpload,
    vertragslaufzeit: data.contractDuration,
    
    // Speed transparency
    download_max: downloadMaxStr,
    download_normal: downloadNormalStr,
    download_min: downloadMinStr,
    upload_max: uploadMaxStr,
    upload_normal: uploadNormalStr,
    upload_min: uploadMinStr,
    
    // Product description
    produkt_beschreibung: produktBeschreibung,
    
    // Router
    router_name: data.routerName,
    router_preis: data.routerPrice,
    router_monatlich: data.routerPrice,
    router_einmalig: data.routerOneTime || '0 €',
    router_aktion: data.routerAktion || '',
    router_beschreibung: data.routerName === 'Kein Router' ? '' : 'WLAN-Router für Glasfaser-Anschluss mit Mesh-Unterstützung und DECT-Basis.',
    
    // TV
    tv_name: data.tvName,
    tv_preis: data.tvPrice,
    tv_monatlich: data.tvPrice,
    tv_einmalig: data.tvOneTime || '0 €',
    tv_aktion: data.tvAktion || '',
    tv_beschreibung: data.tvBeschreibung || '',
    
    // Hardware
    hardware_name: data.hardwareName || 'Keine optionale Hardware',
    hardware_monatlich: data.hardwarePrice || '',
    hardware_einmalig: data.hardwareOneTime || '0 €',
    hardware_aktion: data.hardwareAktion || '',
    hardware_beschreibung: '',
    
    // Pricing
    gesamt_monatlich: data.monthlyTotal,
    gesamt_einmalig: data.oneTimeTotal,
    bereitstellung: data.setupFee,
    tarif_einmalig: data.setupFee,
    tarif_aktion: data.tariffAktion || '',
    tarif_monatlich: data.tariffPrice,
    tarif_sonstiges: data.tariffSonstiges || '',
    
    // Contract
    vorzeitiges_kuendigungsrecht: data.vorzeitigesKuendigungsrecht || 'Siehe AGB unter www.comin-glasfaser.de',
    entgelt_vorzeitige_kuendigung: data.entgeltVorzeitigeKuendigung || 'Gemäß AGB unter www.comin-glasfaser.de',
    aktion_hinweis: data.aktionHinweis || '',
    
    // Meta
    bestellnummer: data.orderNumber,
    datum_heute: format(new Date(), 'dd.MM.yyyy', { locale: de }),
    vzf_timestamp: data.vzfTimestamp,
    wunschtermin: data.wunschtermin || 'Schnellstmöglich',
  };
}

/**
 * Create default VZFRenderData with empty/default values
 */
export function createDefaultVZFRenderData(): Partial<VZFRenderData> {
  return {
    customerName: '',
    customerFirstName: '',
    customerLastName: '',
    customerEmail: '',
    customerPhone: '',
    street: '',
    houseNumber: '',
    city: '',
    tariffName: '',
    tariffPrice: '0,00 €',
    tariffDownload: '0 Mbit/s',
    tariffUpload: '0 Mbit/s',
    contractDuration: '24 Monate',
    routerName: 'Kein Router',
    routerPrice: '0,00 €',
    tvName: 'Kein TV',
    tvPrice: '0,00 €',
    monthlyTotal: '0,00 €',
    oneTimeTotal: '0,00 €',
    setupFee: '99,00 €',
    orderNumber: '',
    vzfTimestamp: format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de }),
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
