import { TariffOption, TariffAddon } from '@/data/tariffs';

export interface VZFData {
  tariff: TariffOption;
  router: TariffAddon | null;
  tvType: 'none' | 'comin' | 'waipu';
  tvPackage: TariffAddon | null;
  tvHdAddon: TariffAddon | null;
  tvHardware: TariffAddon[];
  waipuStick: boolean;
  waipuStickPrice?: number; // Price from database for waipu 4K Stick
  phoneEnabled: boolean;
  phoneLines: number;
  routerDiscount: number;
  setupFee: number;
  setupFeeWaived: boolean;
  contractDuration: number;
  expressActivation: boolean;
  promoCode?: string;
  isFiberBasic: boolean;
  isUpgrade?: boolean;
  currentTariff?: string;
  referralBonus?: number;
}

export function generateVZFContent(data: VZFData): string {
  const {
    tariff,
    router,
    tvType,
    tvPackage,
    tvHdAddon,
    tvHardware,
    waipuStick,
    phoneEnabled,
    phoneLines,
    routerDiscount,
    setupFee,
    setupFeeWaived,
    contractDuration,
    expressActivation,
    promoCode,
    isFiberBasic,
    isUpgrade,
    currentTariff,
    referralBonus = 0,
  } = data;

  // Calculate speeds based on tariff
  const getSpeedDetails = (tariff: TariffOption) => {
    const download = tariff.downloadSpeed;
    const upload = tariff.uploadSpeed;
    return {
      maxDown: `${download} Mbit/s`,
      maxUp: `${upload} Mbit/s`,
      normalDown: `${Math.round(download * 0.83)} Mbit/s`,
      normalUp: `${Math.round(upload * 0.8)} Mbit/s`,
      minDown: `${Math.round(download * 0.67)} Mbit/s`,
      minUp: `${Math.round(upload * 0.67)} Mbit/s`,
    };
  };

  const speeds = getSpeedDetails(tariff);

  // Get tariff description
  const getTariffDescription = () => {
    if (isFiberBasic) {
      return `Das Produkt "FiberBasic 100" beinhaltet einen Glasfaser-Festnetzanschluss für Internetdienste. Im monatlichen Entgelt ist eine Flatrate für die Internetnutzung sowie Telefon-Flatrate ins deutsche Festnetz enthalten.`;
    }
    return `Das Produkt "${tariff.name}" beinhaltet einen Glasfaser-Festnetzanschluss für Internetdienste. Im monatlichen Entgelt ist eine Flatrate für die Internetnutzung enthalten. Telefonie inkl. Flatrates in deutsche Fest- und Mobilfunknetze kann optional gebucht werden.`;
  };

  // Build TV description
  const getTvDescription = () => {
    if (tvType === 'none') return { name: 'Kein TV', details: '-' };
    if (tvType === 'comin') {
      let details = 'COM-IN TV Kabelfernsehen Grundpaket';
      if (tvHdAddon) details += ` + ${tvHdAddon.name}`;
      return { name: 'COM-IN TV', details };
    }
    if (tvType === 'waipu' && tvPackage) {
      return { name: tvPackage.name, details: 'Streaming TV über Internet' };
    }
    return { name: 'Kein TV', details: '-' };
  };

  const tv = getTvDescription();

  // Build hardware description
  const getHardwareDescription = () => {
    const items: string[] = [];
    if (tvHardware.length > 0) {
      items.push(...tvHardware.map(h => h.name));
    }
    if (waipuStick) items.push('waipu.tv 4K Stick');
    return items.length > 0 ? items.join(', ') : 'Keine optionale Hardware';
  };

  // Calculate prices
  const tariffMonthly = isFiberBasic && contractDuration === 12 ? tariff.monthlyPrice12 : tariff.monthlyPrice;
  const routerMonthly = router && router.id !== 'router-none' 
    ? Math.max(0, (router.monthlyPrice || 0) - routerDiscount) 
    : 0;
  const tvMonthly = (tvType === 'comin' ? 10 : 0) + 
    (tvPackage?.monthlyPrice || 0) + 
    (tvHdAddon?.monthlyPrice || 0) +
    tvHardware.reduce((sum, h) => sum + (h.monthlyPrice || 0), 0);
  const phoneMonthly = phoneEnabled && !isFiberBasic ? phoneLines * 2.95 : 0;

  const tariffSetup = setupFeeWaived ? 0 : setupFee;
  const expressSetup = expressActivation ? 200 : 0;
  const waipuStickPriceValue = data.waipuStickPrice ?? 59.99;
  const tvOneTime = tvHardware.reduce((sum, h) => sum + (h.oneTimePrice || 0), 0) + (waipuStick ? waipuStickPriceValue : 0);

  const dateStr = new Date().toLocaleDateString('de-DE');
  const orderId = Date.now().toString().slice(-7);

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Vertragszusammenfassung - COM-IN</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    body { 
      font-family: 'Open Sans', 'Segoe UI', Arial, sans-serif; 
      font-size: 9pt; 
      line-height: 1.4; 
      color: #333; 
      background: white;
      width: 210mm;
      min-height: 297mm;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 0;
      position: relative;
      page-break-after: always;
    }
    .page:last-child {
      page-break-after: auto;
    }
    
    /* Header Bar - Dark Blue */
    .header-bar {
      background: #003366;
      height: 22mm;
      width: 100%;
    }
    
    /* Content Area */
    .content {
      padding: 8mm 15mm 15mm 15mm;
      position: relative;
    }
    
    /* Product Title and ID - Left Side */
    .product-info {
      position: absolute;
      left: 15mm;
      top: 5mm;
    }
    .product-name {
      font-size: 14pt;
      font-weight: normal;
      color: #003366;
    }
    .product-id {
      font-size: 8pt;
      color: #003366;
    }
    
    /* Company Info - Right Side */
    .company-block {
      position: absolute;
      right: 15mm;
      top: 5mm;
      text-align: right;
    }
    .logo {
      font-size: 28pt;
      font-weight: bold;
      letter-spacing: -1px;
      margin-bottom: 3mm;
    }
    .logo-com {
      color: #003366;
    }
    .logo-in {
      display: inline-block;
      background: #ff6600;
      color: white;
      padding: 0 3px;
      border-radius: 2px;
    }
    .company-details {
      font-size: 8pt;
      color: #003366;
      line-height: 1.5;
    }
    .company-details a {
      color: #ff6600;
      text-decoration: none;
    }
    
    /* Main Title */
    h1 {
      font-size: 16pt;
      font-weight: bold;
      color: #003366;
      margin: 35mm 0 5mm 0;
    }
    
    h2 {
      font-size: 10pt;
      font-weight: bold;
      color: #333;
      margin: 8mm 0 3mm 0;
    }
    
    /* Intro List */
    .intro-list {
      margin: 4mm 0 6mm 0;
      padding-left: 5mm;
    }
    .intro-list li {
      margin-bottom: 2mm;
      font-size: 9pt;
      color: #333;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5mm;
      font-size: 8pt;
    }
    th {
      background: #ff6600;
      color: white;
      text-align: left;
      padding: 2.5mm 3mm;
      font-weight: normal;
      font-size: 8pt;
    }
    td {
      padding: 2.5mm 3mm;
      border-bottom: 0.3mm solid #e0e0e0;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #f8f8f8;
    }
    
    /* Footnotes */
    .footnote {
      font-size: 7pt;
      color: #666;
      margin-top: 5mm;
    }
    .footnote-ref {
      font-size: 6pt;
      vertical-align: super;
    }
    
    /* Upgrade Notice */
    .upgrade-notice {
      background: #e8f5e9;
      border-left: 3px solid #4caf50;
      padding: 3mm;
      margin-bottom: 5mm;
      font-size: 9pt;
    }
    
    /* Action Box */
    .action-box {
      background: #fff8e1;
      border: 1px solid #ffc107;
      padding: 3mm;
      margin-top: 5mm;
      font-size: 8pt;
    }
    
    /* Print styles */
    @media print {
      body {
        width: 210mm;
      }
      .page {
        margin: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <!-- PAGE 1 -->
  <div class="page">
    <div class="header-bar"></div>
    <div class="content">
      <div class="product-info">
        <div class="product-name">${tariff.name}</div>
        <div class="product-id">ID:${orderId}</div>
      </div>
      
      <div class="company-block">
        <div class="logo"><span class="logo-com">COM</span><span class="logo-in">IN</span></div>
        <div class="company-details">
          COM-IN Telekommunikations GmbH<br>
          Erni-Singerl-Straße 2b<br>
          85053 Ingolstadt<br>
          Tel.: 0841 88511-0<br>
          E-Mail: <a href="mailto:kontakt@comin-glasfaser.de">kontakt@comin-glasfaser.de</a>
        </div>
      </div>
      
      <h1>Vertragszusammenfassung</h1>
      
      ${isUpgrade ? `
      <div class="upgrade-notice">
        <strong>Tarifwechsel:</strong> Wechsel von ${currentTariff} zu ${tariff.name}
      </div>
      ` : ''}
      
      <ul class="intro-list">
        <li>Diese Vertragszusammenfassung enthält die Hauptbestandteile dieses Dienstleistungsangebots, wie es das EU-Recht <sup>(1)</sup> vorschreibt.</li>
        <li>Sie erleichtert den Vergleich verschiedener Angebote.</li>
        <li>Vollständige Informationen über die Dienstleistung sind in anderen Dokumenten enthalten.</li>
      </ul>
      
      <table>
        <tr>
          <th style="width: 30%;">Dienste / Produkte / Geräte</th>
          <th>ggf. Produktdetails</th>
        </tr>
        <tr>
          <td><strong>${tariff.name}</strong></td>
          <td>${getTariffDescription()} Einzelheiten zum Produkt und zu buchbaren Leistungen ergeben sich aus der Leistungsbeschreibung, Preisliste und AGB (www.comin-glasfaser.de).</td>
        </tr>
        <tr>
          <td>${tv.name}</td>
          <td>${tv.details}</td>
        </tr>
        <tr>
          <td>${router && router.id !== 'router-none' ? router.name : 'Kein Router'}</td>
          <td>${router && router.id !== 'router-none' ? router.description || 'WLAN-Router zur Miete' : '-'}</td>
        </tr>
        <tr>
          <td>Optionale Hardware</td>
          <td>${getHardwareDescription()}</td>
        </tr>
      </table>
      
      <p class="footnote"><sup>(1)</sup> Artikel 102 Absatz 3 der Richtlinie (EU) 2018/1972 des Europäischen Parlaments und des Rates vom 11. Dezember 2018 über den europäischen Kodex für die elektronische Kommunikation (ABl. L 321 vom 17.12.2018, S. 36)</p>
    </div>
  </div>
  
  <!-- PAGE 2 -->
  <div class="page">
    <div class="header-bar"></div>
    <div class="content">
      <div class="product-info">
        <div class="product-name">${tariff.name}</div>
        <div class="product-id">ID:${orderId}</div>
      </div>
      
      <div class="company-block">
        <div class="logo"><span class="logo-com">COM</span><span class="logo-in">IN</span></div>
        <div class="company-details">
          COM-IN Telekommunikations GmbH<br>
          Erni-Singerl-Straße 2b<br>
          85053 Ingolstadt<br>
          Tel.: 0841 88511-0<br>
          E-Mail: <a href="mailto:kontakt@comin-glasfaser.de">kontakt@comin-glasfaser.de</a>
        </div>
      </div>
      
      <h2 style="margin-top: 35mm;">Geschwindigkeiten des Internetdienstes und Abhilfen bei Problemen</h2>
      <table>
        <tr>
          <th>Datenübertragungsraten</th>
          <th>im Download</th>
          <th>im Upload</th>
        </tr>
        <tr>
          <td>Maximal</td>
          <td>${speeds.maxDown}</td>
          <td>${speeds.maxUp}</td>
        </tr>
        <tr>
          <td>Normalerweise zur Verfügung stehend</td>
          <td>${speeds.normalDown}</td>
          <td>${speeds.normalUp}</td>
        </tr>
        <tr>
          <td>Minimal</td>
          <td>${speeds.minDown}</td>
          <td>${speeds.minUp}</td>
        </tr>
      </table>
      
      <p style="font-size: 8pt; margin-bottom: 5mm;">Weitere Informationen zur Geschwindigkeitsminderung finden Sie unter www.comin-glasfaser.de. Ihre Beschwerden können Sie jederzeit über unser Kontaktformular auf www.comin-glasfaser.de einreichen.</p>
      
      <h2>Preis</h2>
      <table>
        <tr>
          <th>Entgelt</th>
          <th>Einmalig</th>
          <th>Aktion</th>
          <th>Monatlich</th>
          <th>sonstiges</th>
        </tr>
        <tr>
          <td><strong>${tariff.name}</strong></td>
          <td>${tariffSetup.toFixed(2).replace('.', ',')} €</td>
          <td>${setupFeeWaived ? 'entfällt' : ''}</td>
          <td>${tariffMonthly.toFixed(2).replace('.', ',')} €</td>
          <td>${isFiberBasic ? 'Telefon-Flatrate inklusive' : 'Unbegrenzt für 0 ct/Min. in dt. Festnetze und dt. Mobilfunknetze telefonieren'}</td>
        </tr>
        <tr>
          <td>${tv.name}</td>
          <td>${tvOneTime > 0 ? tvOneTime.toFixed(2).replace('.', ',') + ' €' : '0,00 €'}</td>
          <td></td>
          <td>${tvMonthly > 0 ? tvMonthly.toFixed(2).replace('.', ',') + ' €' : '0,00 €'}</td>
          <td></td>
        </tr>
        <tr>
          <td>${router && router.id !== 'router-none' ? router.name : 'Kein Router'}</td>
          <td>0,00 €</td>
          <td>${routerDiscount > 0 ? `monatl. -${routerDiscount.toFixed(0)} € *` : ''}</td>
          <td>${routerMonthly.toFixed(2).replace('.', ',')} €</td>
          <td></td>
        </tr>
        ${phoneEnabled && !isFiberBasic ? `
        <tr>
          <td>Telefon-Flat Festnetz (${phoneLines} Leitung${phoneLines > 1 ? 'en' : ''})</td>
          <td>0,00 €</td>
          <td></td>
          <td>${phoneMonthly.toFixed(2).replace('.', ',')} €</td>
          <td></td>
        </tr>
        ` : ''}
        ${expressActivation ? `
        <tr>
          <td>Express-Anschaltung</td>
          <td>${expressSetup.toFixed(2).replace('.', ',')} €</td>
          <td></td>
          <td>0,00 €</td>
          <td>Aktivierung innerhalb 3 Werktage</td>
        </tr>
        ` : ''}
        ${referralBonus > 0 ? `
        <tr>
          <td>Kunden werben Kunden Prämie</td>
          <td>-${referralBonus.toFixed(2).replace('.', ',')} €</td>
          <td></td>
          <td>0,00 €</td>
          <td>Gutschrift auf Einmalkosten</td>
        </tr>
        ` : ''}
      </table>
      
      ${promoCode || routerDiscount > 0 ? `
      <div class="action-box">
        <strong>* Aktion "Glasfaserboxen":</strong> Gilt für Vertragsabschlüsse von Neukunden und Upgrades von Bestandskunden auf einfach 150, einfach 300, einfach 600 oder einfach 1000 in dem Aktionszeitraum 01.09.2025 – 31.12.2025. Keine Kombination mit anderen Aktionen möglich. Für die Dauer von 24 Monaten erhält der Kunde eine monatliche Gutschrift von 4,- € für die FRITZ!Box zur Verrechnung auf sein Kundenkonto. Alle Preise inkl. gesetzl. MwSt.
      </div>
      ` : ''}
    </div>
  </div>
  
  <!-- PAGE 3 -->
  <div class="page">
    <div class="header-bar"></div>
    <div class="content">
      <div class="product-info">
        <div class="product-name">${tariff.name}</div>
        <div class="product-id">ID:${orderId}</div>
      </div>
      
      <div class="company-block">
        <div class="logo"><span class="logo-com">COM</span><span class="logo-in">IN</span></div>
        <div class="company-details">
          COM-IN Telekommunikations GmbH<br>
          Erni-Singerl-Straße 2b<br>
          85053 Ingolstadt<br>
          Tel.: 0841 88511-0<br>
          E-Mail: <a href="mailto:kontakt@comin-glasfaser.de">kontakt@comin-glasfaser.de</a>
        </div>
      </div>
      
      <h2 style="margin-top: 35mm;">Laufzeit, Verlängerung und Kündigung</h2>
      <table>
        <tr>
          <th colspan="2">Weitere Produktinformationen</th>
        </tr>
        <tr>
          <td style="width: 50%;"><strong>Vertragslaufzeit</strong></td>
          <td>${contractDuration} Monate</td>
        </tr>
        <tr>
          <td><strong>Verlängerung</strong></td>
          <td>automatisch um jeweils einen Monat</td>
        </tr>
        <tr>
          <td><strong>Kündigungsfrist</strong></td>
          <td>1 Monat zum Ende der Mindestlaufzeit, danach jederzeit mit 1 Monat Frist</td>
        </tr>
        <tr>
          <td><strong>Vorzeitiges Kündigungsrecht</strong></td>
          <td>Siehe AGB unter www.comin-glasfaser.de</td>
        </tr>
        <tr>
          <td><strong>Entgelt bei vorzeitiger Kündigung</strong></td>
          <td>Gemäß AGB</td>
        </tr>
      </table>
      
      <h2>Funktionsmerkmale für Endnutzer mit Behinderungen</h2>
      <p style="font-size: 8pt; margin-bottom: 8mm;">Funktionsmerkmale für Endnutzer mit Behinderungen stellen wir Ihnen separat unter www.comin-glasfaser.de zur Verfügung.</p>
      
      <h2>Weitere Informationen</h2>
      <table>
        <tr>
          <th colspan="2">Dokumente und Kontakt</th>
        </tr>
        <tr>
          <td style="width: 50%;">Leistungsbeschreibung</td>
          <td>www.comin-glasfaser.de/leistungsbeschreibung</td>
        </tr>
        <tr>
          <td>Allgemeine Geschäftsbedingungen (AGB)</td>
          <td>www.comin-glasfaser.de/agb</td>
        </tr>
        <tr>
          <td>Preisliste</td>
          <td>www.comin-glasfaser.de/preisliste</td>
        </tr>
        <tr>
          <td>Kundenservice</td>
          <td>0841 88511-0 (Mo-Fr 8-17 Uhr)</td>
        </tr>
        <tr>
          <td>E-Mail</td>
          <td>kontakt@comin-glasfaser.de</td>
        </tr>
      </table>
      
      <div style="margin-top: 15mm; padding-top: 5mm; border-top: 0.5mm solid #e0e0e0;">
        <p style="font-size: 8pt; color: #666;">
          Erstellt am: ${dateStr}<br>
          Dokument-ID: VZF-${orderId}
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

  return html;
}

export function downloadVZF(data: VZFData, filename?: string) {
  const html = generateVZFContent(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `COMIN_Vertragszusammenfassung_VZF.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
