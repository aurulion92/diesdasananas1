import { TariffOption, TariffAddon } from '@/data/tariffs';

interface VZFData {
  tariff: TariffOption;
  router: TariffAddon | null;
  tvType: 'none' | 'comin' | 'waipu';
  tvPackage: TariffAddon | null;
  tvHdAddon: TariffAddon | null;
  tvHardware: TariffAddon[];
  waipuStick: boolean;
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
      return `Das Produkt "FiberBasic 100" beinhaltet einen Glasfaser-Festnetzanschluss für Internetdienste. Im monatlichen Entgelt ist eine Flatrate für die Internetnutzung sowie Telefon-Flatrate ins deutsche Festnetz enthalten. Einzelheiten zum Produkt und zu buchbaren Leistungen ergeben sich aus der Leistungsbeschreibung, Preisliste und AGB (www.comin-glasfaser.de).`;
    }
    return `Das Produkt "${tariff.name}" beinhaltet einen Glasfaser-Festnetzanschluss für Internetdienste. Im monatlichen Entgelt ist eine Flatrate für die Internetnutzung enthalten. Telefonie inkl. Flatrates in deutsche Fest- und Mobilfunknetze kann optional gebucht werden. Einzelheiten zum Produkt und zu buchbaren Leistungen ergeben sich aus der Leistungsbeschreibung, Preisliste und AGB (www.comin-glasfaser.de).`;
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
  const tvOneTime = tvHardware.reduce((sum, h) => sum + (h.oneTimePrice || 0), 0) + (waipuStick ? 40 : 0);

  const dateStr = new Date().toLocaleDateString('de-DE');
  const orderId = `VZF-${Date.now().toString(36).toUpperCase()}`;

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Vertragszusammenfassung - COM-IN</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #333; background: white; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-top: 8px solid #003366; padding-top: 15px; }
    .header-left { font-size: 10pt; color: #666; }
    .header-right { text-align: right; font-size: 9pt; color: #666; }
    .logo { font-size: 24pt; font-weight: bold; color: #003366; margin-bottom: 5px; }
    .logo span { color: #ff6600; }
    h1 { font-size: 18pt; color: #003366; margin: 25px 0 15px 0; }
    h2 { font-size: 12pt; color: #333; margin: 20px 0 10px 0; font-weight: bold; }
    .intro { margin-bottom: 20px; }
    .intro ul { margin-left: 20px; margin-top: 10px; }
    .intro li { margin-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th { background: #ff6600; color: white; text-align: left; padding: 8px 10px; font-weight: normal; font-size: 10pt; }
    td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .footnote { font-size: 8pt; color: #666; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
    .page-break { page-break-before: always; }
    .section-title { background: #ff6600; color: white; padding: 8px 10px; margin-bottom: 0; font-weight: normal; }
    .contract-info td:first-child { width: 50%; }
    ${isUpgrade ? '.upgrade-notice { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 12px; margin-bottom: 20px; }' : ''}
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${tariff.name}<br>
      ID:${orderId}
    </div>
    <div class="header-right">
      <div class="logo">COM<span>IN</span></div>
      COM-IN Telekommunikations GmbH<br>
      Erni-Singerl-Straße 2b<br>
      85053 Ingolstadt<br>
      Tel.: 0841 88511-0<br>
      E-Mail: kontakt@comin-glasfaser.de
    </div>
  </div>

  <h1>Vertragszusammenfassung</h1>
  
  ${isUpgrade ? `
  <div class="upgrade-notice">
    <strong>Tarifwechsel:</strong> Wechsel von ${currentTariff} zu ${tariff.name}
  </div>
  ` : ''}

  <div class="intro">
    <ul>
      <li>Diese Vertragszusammenfassung enthält die Hauptbestandteile dieses Dienstleistungsangebots, wie es das EU-Recht (1) vorschreibt.</li>
      <li>Sie erleichtert den Vergleich verschiedener Angebote.</li>
      <li>Vollständige Informationen über die Dienstleistung sind in anderen Dokumenten enthalten.</li>
    </ul>
  </div>

  <table>
    <tr><th>Dienste / Produkte / Geräte</th><th>ggf. Produktdetails</th></tr>
    <tr><td>${tariff.name}</td><td>${getTariffDescription()}</td></tr>
    <tr><td>${tv.name}</td><td>${tv.details}</td></tr>
    <tr><td>${router && router.id !== 'router-none' ? router.name : 'Kein Router'}</td><td>${router && router.id !== 'router-none' ? router.description : '-'}</td></tr>
    <tr><td>${getHardwareDescription()}</td><td></td></tr>
  </table>

  <p class="footnote">[1] Artikel 102 Absatz 3 der Richtlinie (EU) 2018/1972 des Europäischen Parlaments und des Rates vom 11. Dezember 2018 über den europäischen Kodex für die elektronische Kommunikation (ABl. L 321 vom 17.12.2018, S. 36)</p>

  <div class="page-break"></div>

  <h2>Geschwindigkeiten des Internetdienstes und Abhilfen bei Problemen</h2>
  <table>
    <tr><th>Datenübertragungsraten</th><th>im Download</th><th>im Upload</th></tr>
    <tr><td>Maximal</td><td>${speeds.maxDown}</td><td>${speeds.maxUp}</td></tr>
    <tr><td>Normalerweise zur Verfügung stehend</td><td>${speeds.normalDown}</td><td>${speeds.normalUp}</td></tr>
    <tr><td>Minimal</td><td>${speeds.minDown}</td><td>${speeds.minUp}</td></tr>
  </table>

  <h2>Preis</h2>
  <table>
    <tr><th>Entgelt</th><th>Einmalig</th><th>Aktion</th><th>Monatlich</th><th>sonstiges</th></tr>
    <tr>
      <td>${tariff.name}</td>
      <td>${tariffSetup.toFixed(2).replace('.', ',')} €</td>
      <td>${setupFeeWaived ? 'entfällt' : ''}</td>
      <td>${tariffMonthly.toFixed(2).replace('.', ',')} €</td>
      <td>${isFiberBasic ? 'Telefon-Flatrate inklusive' : 'Unbegrenzt für 0 ct/Min. in dt. Festnetze und dt. Mobilfunknetze telefonieren, ins Ausland ab 2,5 ct / Min.'}</td>
    </tr>
    <tr>
      <td>${tv.name}</td>
      <td>${tvOneTime > 0 ? tvOneTime.toFixed(2).replace('.', ',') + ' €' : '0 €'}</td>
      <td></td>
      <td>${tvMonthly > 0 ? tvMonthly.toFixed(2).replace('.', ',') + ' €' : '0 €'}</td>
      <td></td>
    </tr>
    <tr>
      <td>${router && router.id !== 'router-none' ? router.name : 'Kein Router'}</td>
      <td>0 €</td>
      <td>${routerDiscount > 0 ? `monatl. ${routerDiscount.toFixed(0)} € Rabatt *` : ''}</td>
      <td>${routerMonthly.toFixed(2).replace('.', ',')} €</td>
      <td></td>
    </tr>
    ${phoneEnabled && !isFiberBasic ? `
    <tr>
      <td>Telefon-Flat Festnetz (${phoneLines} Leitung${phoneLines > 1 ? 'en' : ''})</td>
      <td>0 €</td>
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
      <td>0 €</td>
      <td>Aktivierung innerhalb 3 Werktage</td>
    </tr>
    ` : ''}
  </table>

  <div class="page-break"></div>

  <h2>Laufzeit, Verlängerung und Kündigung</h2>
  <table class="contract-info">
    <tr><th colspan="2">Weitere Produktinformationen</th></tr>
    <tr><td>Vertragslaufzeit</td><td>${contractDuration} Monate</td></tr>
    <tr><td>Verlängerung</td><td>automatisch</td></tr>
    <tr><td>Kündigungsfrist</td><td>1 Monat</td></tr>
    <tr><td>Vorzeitiges Kündigungsrecht</td><td>-</td></tr>
    <tr><td>Entgelt bei vorzeitiger Kündigung</td><td>-</td></tr>
  </table>

  <h2>Funktionsmerkmale für Endnutzer mit Behinderungen:</h2>
  <p>Funktionsmerkmale für Endnutzer mit Behinderungen stellen wir Ihnen separat unter www.comin-glasfaser.de zur Verfügung.</p>

  ${promoCode || routerDiscount > 0 ? `
  <p class="footnote">* Die Aktion "Glasfaserboxen" gilt für Vertragsabschlüsse von Neukunden und Upgrades von Bestandskunden auf einfach 150, einfach 300, einfach 600 oder einfach 1000 in dem Aktionszeitraum 01.09.2025 – 31.12.2025. Keine Kombination mit anderen Aktionen möglich. Für die Dauer von 24 Monaten erhält der Kunde eine monatliche Gutschrift von 4,- € für die FRITZ!Box 5690 oder FRITZ!Box 5690 Pro zur Verrechnung auf sein Kundenkonto. Eine Barauszahlung ist nicht möglich. Alle Preise inkl. gesetzl. MwSt., Mindestvertragslaufzeit 24 Monate.</p>
  ` : ''}

  <p class="footnote" style="margin-top: 30px;">Erstellt am: ${dateStr}</p>
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
