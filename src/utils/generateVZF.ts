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

  // Check if tariff has phone included
  const tariffIncludesPhone = isFiberBasic || tariff.includesPhone === true;
  
  // Get tariff description
  const getTariffDescription = () => {
    if (tariffIncludesPhone) {
      return `Das Produkt "${tariff.name}" beinhaltet einen Glasfaser-Festnetzanschluss für Internetdienste. Im monatlichen Entgelt ist eine Flatrate für die Internetnutzung sowie Telefon-Flatrate ins deutsche Festnetz enthalten. Einzelheiten zum Produkt und zu buchbaren Leistungen ergeben sich aus der Leistungsbeschreibung, Preisliste und AGB (www.comin-glasfaser.de).`;
    }
    if (phoneEnabled) {
      return `Das Produkt "${tariff.name}" beinhaltet einen Glasfaser-Festnetzanschluss für Internetdienste. Im monatlichen Entgelt ist eine Flatrate für die Internetnutzung enthalten. Telefonie inkl. Flatrates in deutsche Fest- und Mobilfunknetze wurde optional gebucht. Einzelheiten zum Produkt und zu buchbaren Leistungen ergeben sich aus der Leistungsbeschreibung, Preisliste und AGB (www.comin-glasfaser.de).`;
    }
    return `Das Produkt "${tariff.name}" beinhaltet einen Glasfaser-Festnetzanschluss für Internetdienste. Im monatlichen Entgelt ist eine Flatrate für die Internetnutzung enthalten. Einzelheiten zum Produkt und zu buchbaren Leistungen ergeben sich aus der Leistungsbeschreibung, Preisliste und AGB (www.comin-glasfaser.de).`;
  };

  // Build TV description
  const getTvName = () => {
    if (tvType === 'none') return 'Kein TV';
    if (tvType === 'comin') {
      let name = 'COM-IN TV';
      if (tvHdAddon) name += ` + ${tvHdAddon.name}`;
      return name;
    }
    if (tvType === 'waipu' && tvPackage) {
      return tvPackage.name;
    }
    return 'Kein TV';
  };

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

  // Format price helper
  const formatPrice = (price: number) => price.toFixed(2).replace('.', ',') + ' €';

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
      font-family: Arial, Helvetica, sans-serif; 
      font-size: 10pt; 
      line-height: 1.5; 
      color: #333; 
      background: white;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      position: relative;
      page-break-after: always;
      background: white;
    }
    .page:last-child {
      page-break-after: auto;
    }
    
    /* Blue Header Bar - using table for PDF compatibility */
    .header-bar {
      width: 100%;
      height: 45px;
      background-color: #003366;
      display: block;
    }
    
    /* Page Content */
    .page-content {
      padding: 20px 40px 40px 40px;
    }
    
    /* Letterhead Table for PDF compatibility */
    .letterhead-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .letterhead-table td {
      vertical-align: top;
      padding: 0;
      border: none;
    }
    .tariff-info {
      text-align: left;
      font-size: 11pt;
      color: #333;
    }
    .tariff-name {
      font-weight: bold;
      font-size: 14pt;
    }
    .tariff-id {
      font-size: 9pt;
      color: #666;
    }
    .logo-cell {
      text-align: right;
      width: 200px;
    }
    .logo-text {
      font-family: Arial, Helvetica, sans-serif;
      font-weight: bold;
      font-size: 28px;
    }
    .logo-com {
      color: #003366;
    }
    .logo-in-box {
      display: inline-block;
      background-color: #f57c00;
      color: white;
      padding: 4px 8px;
      border-radius: 3px;
      margin-left: 2px;
    }
    .company-info {
      text-align: right;
      font-size: 9pt;
      color: #003366;
      line-height: 1.6;
      padding-left: 20px;
    }
    .company-name {
      font-weight: bold;
      font-size: 10pt;
    }
    .company-info a {
      color: #003366;
      text-decoration: none;
    }
    
    /* Main Title */
    h1 {
      font-size: 22pt;
      font-weight: normal;
      color: #333;
      margin-bottom: 15px;
      margin-top: 15px;
    }
    
    /* Section Headers - Blue Bar */
    .section-header {
      background-color: #003366;
      color: white;
      font-size: 11pt;
      font-weight: bold;
      padding: 6px 10px;
      margin-top: 20px;
      margin-bottom: 0;
    }
    
    /* Intro Text */
    .intro-text {
      font-size: 9pt;
      font-style: italic;
      color: #333;
      margin-bottom: 15px;
      line-height: 1.6;
    }
    .intro-text sup {
      font-size: 7pt;
    }
    
    /* Tables */
    table.content-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      border: 1px solid #ccc;
    }
    table.content-table th {
      background-color: #e6eef5;
      color: #003366;
      text-align: left;
      padding: 8px 10px;
      font-weight: bold;
      font-size: 9pt;
      border: 1px solid #ccc;
    }
    table.content-table td {
      padding: 8px 10px;
      border: 1px solid #ccc;
      vertical-align: top;
    }
    table.content-table tr:nth-child(even) td {
      background-color: #fafafa;
    }
    .label-cell {
      font-weight: bold;
      width: 25%;
    }
    .content-cell {
      width: 75%;
    }
    
    /* Footnotes */
    .footnote {
      font-size: 7pt;
      color: #666;
      margin-top: 15px;
      line-height: 1.5;
    }
    .footnote sup {
      font-size: 6pt;
    }
    
    /* Upgrade Notice */
    .upgrade-notice {
      background-color: #e8f5e9;
      border-left: 3px solid #4caf50;
      padding: 10px;
      margin-bottom: 15px;
      font-size: 9pt;
    }
    
    /* Action Box */
    .action-note {
      font-size: 8pt;
      margin-top: 15px;
      padding: 10px;
      background-color: #fffde7;
      border: 1px solid #fff9c4;
    }
    
    /* Small text */
    .small-text {
      font-size: 8pt;
      color: #666;
    }
    
    /* Print styles */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .header-bar {
        background-color: #003366 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- PAGE 1 -->
  <div class="page">
    <div class="header-bar"></div>
    <div class="page-content">
      <table class="letterhead-table">
        <tr>
          <td class="tariff-info">
            <div class="tariff-name">${tariff.name}</div>
            <div class="tariff-id">ID:${Date.now().toString().slice(-7)}</div>
          </td>
          <td class="logo-cell">
            <span class="logo-text logo-com">COM</span><span class="logo-text logo-in-box">IN</span>
          </td>
          <td class="company-info">
            <div class="company-name">COM-IN Telekommunikations GmbH</div>
            Erni-Singerl-Straße 2b<br>
            85053 Ingolstadt<br>
            Tel.: 0841 88511-0<br>
            E-Mail: <a href="mailto:kontakt@comin-glasfaser.de">kontakt@comin-glasfaser.de</a>
          </td>
        </tr>
      </table>
      
      <h1>Vertragszusammenfassung</h1>
    
    ${isUpgrade ? `
    <div class="upgrade-notice">
      <strong>Tarifwechsel:</strong> Wechsel von ${currentTariff} zu ${tariff.name}
    </div>
    ` : ''}
    
    <p class="intro-text">
      Diese Vertragszusammenfassung enthält die Hauptbestandteile dieses Dienstleistungsangebots, wie es das EU-Recht<sup>(1)</sup> vorschreibt. Sie erleichtert den Vergleich verschiedener Angebote. Vollständige Informationen über die Dienstleistung sind in anderen Dokumenten enthalten.
    </p>
    
    <div class="section-header">Dienste / Produkte / Geräte</div>
    <table class="content-table">
      <tr>
        <td class="label-cell">${tariff.name}</td>
        <td class="content-cell">${getTariffDescription()}</td>
      </tr>
      <tr>
        <td class="label-cell">${getTvName()}</td>
        <td class="content-cell"></td>
      </tr>
      <tr>
        <td class="label-cell">${router && router.id !== 'router-none' ? router.name : 'Kein Router'}</td>
        <td class="content-cell">${router && router.id !== 'router-none' ? 'WLAN-Router für Glasfaser-Anschluss mit Mesh-Unterstützung und DECT-Basis.' : ''}</td>
      </tr>
      <tr>
        <td class="label-cell">${getHardwareDescription() === 'Keine optionale Hardware' ? 'Keine optionale Hardware' : 'Optionale Hardware'}</td>
        <td class="content-cell">${getHardwareDescription() !== 'Keine optionale Hardware' ? getHardwareDescription() : ''}</td>
      </tr>
    </table>
    
    <p class="footnote"><sup>(1)</sup> Artikel 102 Absatz 3 der Richtlinie (EU) 2018/1972 des Europäischen Parlaments und des Rates vom 11. Dezember 2018 über den europäischen Kodex für die elektronische Kommunikation (ABl. L 321 vom 17.12.2018, S. 36)</p>
    </div>
  </div>
  
  <!-- PAGE 2 -->
  <div class="page">
    <div class="header-bar"></div>
    <div class="page-content">
      <table class="letterhead-table">
        <tr>
          <td class="tariff-info">
            <div class="tariff-name">${tariff.name}</div>
            <div class="tariff-id">ID:${Date.now().toString().slice(-7)}</div>
          </td>
          <td class="logo-cell">
            <span class="logo-text logo-com">COM</span><span class="logo-text logo-in-box">IN</span>
          </td>
          <td class="company-info">
            <div class="company-name">COM-IN Telekommunikations GmbH</div>
            Erni-Singerl-Straße 2b<br>
            85053 Ingolstadt<br>
            Tel.: 0841 88511-0<br>
            E-Mail: <a href="mailto:kontakt@comin-glasfaser.de">kontakt@comin-glasfaser.de</a>
          </td>
        </tr>
      </table>
    
    <div class="section-header">Geschwindigkeiten des Internetdienstes und Abhilfen bei Problemen</div>
    <table class="content-table">
      <tr>
        <th>Datenübertragungsraten</th>
        <th>im Download</th>
        <th>im Upload</th>
      </tr>
      <tr>
        <td><strong>Maximal</strong></td>
        <td>${speeds.maxDown}</td>
        <td>${speeds.maxUp}</td>
      </tr>
      <tr>
        <td><strong>Normalerweise zur Verfügung stehend</strong></td>
        <td>${speeds.normalDown}</td>
        <td>${speeds.normalUp}</td>
      </tr>
      <tr>
        <td><strong>Minimal</strong></td>
        <td>${speeds.minDown}</td>
        <td>${speeds.minUp}</td>
      </tr>
    </table>
    
    <div class="section-header" style="margin-top: 8mm;">Preis</div>
    <table class="content-table">
      <tr>
        <th>Entgelt</th>
        <th>Einmalig</th>
        <th>Aktion</th>
        <th>Monatlich</th>
        <th>sonstiges</th>
      </tr>
      <tr>
        <td><strong>${tariff.name}</strong></td>
        <td>${formatPrice(tariffSetup)}</td>
        <td>${setupFeeWaived ? 'entfällt' : ''}</td>
        <td>${formatPrice(tariffMonthly)}</td>
        <td>${tariffIncludesPhone ? 'Telefon-Flatrate inklusive' : (phoneEnabled ? 'Unbegrenzt für 0 ct/Min. in dt. Festnetze und dt. Mobilfunknetze telefonieren' : '')}</td>
      </tr>
      <tr>
        <td>${getTvName()}</td>
        <td>${tvOneTime > 0 ? formatPrice(tvOneTime) : '0 €'}</td>
        <td></td>
        <td>${tvMonthly > 0 ? formatPrice(tvMonthly) : '0,00 €'}</td>
        <td></td>
      </tr>
      <tr>
        <td>${router && router.id !== 'router-none' ? router.name : 'Kein Router'}</td>
        <td>0 €</td>
        <td>${routerDiscount > 0 ? `monatl. ${routerDiscount.toFixed(0)} € Rabatt *` : ''}</td>
        <td>${routerMonthly > 0 ? formatPrice(routerMonthly) : ''}</td>
        <td></td>
      </tr>
      <tr>
        <td>${getHardwareDescription()}</td>
        <td>0 €</td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      ${phoneEnabled && !isFiberBasic ? `
      <tr>
        <td>Telefon-Flat (${phoneLines} Leitung${phoneLines > 1 ? 'en' : ''})</td>
        <td>0 €</td>
        <td></td>
        <td>${formatPrice(phoneMonthly)}</td>
        <td></td>
      </tr>
      ` : ''}
      ${expressActivation ? `
      <tr>
        <td>Express-Anschaltung</td>
        <td>${formatPrice(expressSetup)}</td>
        <td></td>
        <td>0,00 €</td>
        <td>Aktivierung innerhalb 3 Werktage</td>
      </tr>
      ` : ''}
      ${referralBonus > 0 ? `
      <tr>
        <td>Kunden werben Kunden Prämie</td>
        <td>-${formatPrice(referralBonus)}</td>
        <td></td>
        <td>0,00 €</td>
        <td>Gutschrift auf Einmalkosten</td>
      </tr>
      ` : ''}
    </table>
    
    ${routerDiscount > 0 ? `
    <p class="action-note">
      * Die Aktion „Glasfaserboxen" gilt für Vertragsabschlüsse von Neukunden und Upgrades von Bestandskunden auf einfach 150, einfach 300, einfach 600 oder einfach 1000 in dem Aktionszeitraum 01.09.2025 – 31.12.2025. Keine Kombination mit anderen Aktionen möglich. Für die Dauer von 24 Monaten erhält der Kunde eine monatliche Gutschrift von 4,- € für die FRITZ!Box 5690 oder FRITZ!Box 5690 Pro zur Verrechnung auf sein Kundenkonto. Eine Barauszahlung ist nicht möglich. Alle Preise inkl. gesetzl. MwSt., Mindestvertragslaufzeit 24 Monate.
    </p>
    ` : ''}
    </div>
  </div>
  
  <!-- PAGE 3 -->
  <div class="page">
    <div class="header-bar"></div>
    <div class="page-content">
      <table class="letterhead-table">
        <tr>
          <td class="tariff-info">
            <div class="tariff-name">${tariff.name}</div>
            <div class="tariff-id">ID:${Date.now().toString().slice(-7)}</div>
          </td>
          <td class="logo-cell">
            <span class="logo-text logo-com">COM</span><span class="logo-text logo-in-box">IN</span>
          </td>
          <td class="company-info">
            <div class="company-name">COM-IN Telekommunikations GmbH</div>
            Erni-Singerl-Straße 2b<br>
            85053 Ingolstadt<br>
            Tel.: 0841 88511-0<br>
            E-Mail: <a href="mailto:kontakt@comin-glasfaser.de">kontakt@comin-glasfaser.de</a>
          </td>
        </tr>
      </table>
    
    <div class="section-header">Laufzeit, Verlängerung und Kündigung</div>
    <table class="content-table">
      <tr>
        <th colspan="2">Weitere Produktinformationen</th>
      </tr>
      <tr>
        <td class="label-cell"><strong>Vertragslaufzeit</strong></td>
        <td>${contractDuration} Monate</td>
      </tr>
      <tr>
        <td class="label-cell"><strong>Verlängerung</strong></td>
        <td>automatisch</td>
      </tr>
      <tr>
        <td class="label-cell"><strong>Kündigungsfrist</strong></td>
        <td>1 Monat</td>
      </tr>
    </table>
    
    <div class="section-header" style="margin-top: 8mm;">Vorzeitiges Kündigungsrecht</div>
    <table class="content-table">
      <tr>
        <td>Siehe AGB unter www.comin-glasfaser.de</td>
      </tr>
    </table>
    
    <div class="section-header" style="margin-top: 8mm;">Entgelt bei vorzeitiger Kündigung</div>
    <table class="content-table">
      <tr>
        <td>Gemäß AGB unter www.comin-glasfaser.de</td>
      </tr>
    </table>
    
    <div class="section-header" style="margin-top: 8mm;">Funktionsmerkmale für Endnutzer mit Behinderungen:</div>
    <table class="content-table">
      <tr>
        <td>Funktionsmerkmale für Endnutzer mit Behinderungen stellen wir Ihnen separat unter www.comin-glasfaser.de zur Verfügung.</td>
      </tr>
    </table>
    
    ${routerDiscount > 0 ? `
    <p class="action-note" style="margin-top: 10mm;">
      * Die Aktion „Glasfaserboxen" gilt für Vertragsabschlüsse von Neukunden und Upgrades von Bestandskunden auf einfach 150, einfach 300, einfach 600 oder einfach 1000 in dem Aktionszeitraum 01.09.2025 – 31.12.2025. Keine Kombination mit anderen Aktionen möglich. Für die Dauer von 24 Monaten erhält der Kunde eine monatliche Gutschrift von 4,- € für die FRITZ!Box 5690 oder FRITZ!Box 5690 Pro zur Verrechnung auf sein Kundenkonto. Eine Barauszahlung ist nicht möglich. Alle Preise inkl. gesetzl. MwSt., Mindestvertragslaufzeit 24 Monate.
    </p>
    ` : ''}
    
    <div style="margin-top: 15mm; padding-top: 5mm; border-top: 0.5mm solid #e0e0e0;">
      <p class="small-text">
        Erstellt am: ${dateStr}<br>
        Dokument-ID: VZF-${Date.now().toString().slice(-7)}
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
