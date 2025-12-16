import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback email for K7 ID issues
const FALLBACK_EMAIL = 'samuel.wunderle@comin-glasfaser.de';

// Send fallback email when K7 IDs are missing
async function sendFallbackEmail(
  order: any, 
  missingK7Items: Array<{ type: string; name: string; reason: string }>,
  productK7Id: string,
  buildingK7Id: string
): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured, cannot send fallback email');
    return;
  }

  const resend = new Resend(resendApiKey);

  const vzfData = order.vzf_data || {};
  const selectedOptions = order.selected_options || [];

  // Build order summary
  const orderSummary = `
    <h2>Bestellübersicht</h2>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <tr><td><strong>Bestellnummer</strong></td><td>${vzfData.orderNumber || order.id}</td></tr>
      <tr><td><strong>Kunde</strong></td><td>${order.customer_name} (${order.customer_email})</td></tr>
      <tr><td><strong>Telefon</strong></td><td>${order.customer_phone || '-'}</td></tr>
      <tr><td><strong>Adresse</strong></td><td>${order.street} ${order.house_number}, ${order.postal_code || ''} ${order.city}</td></tr>
      <tr><td><strong>Tarif</strong></td><td>${order.product_name}</td></tr>
      <tr><td><strong>Monatlich</strong></td><td>${order.monthly_total?.toFixed(2).replace('.', ',')} €</td></tr>
      <tr><td><strong>Einmalig</strong></td><td>${order.one_time_total?.toFixed(2).replace('.', ',')} €</td></tr>
      <tr><td><strong>Produkt K7-ID</strong></td><td>${productK7Id || '<span style="color:red">FEHLT</span>'}</td></tr>
      <tr><td><strong>Gebäude K7-ID</strong></td><td>${buildingK7Id || '<span style="color:red">FEHLT</span>'}</td></tr>
    </table>
  `;

  // Build options list
  let optionsHtml = '';
  if (selectedOptions.length > 0) {
    optionsHtml = `
      <h3>Gebuchte Optionen</h3>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <tr style="background: #f5f5f5;"><th>Option</th><th>Preis</th><th>Anzahl</th></tr>
        ${selectedOptions.map((opt: any) => `
          <tr>
            <td>${opt.name || opt.type || 'Unbekannt'}</td>
            <td>${opt.monthlyPrice ? opt.monthlyPrice + ' €/Monat' : ''} ${opt.oneTimePrice ? opt.oneTimePrice + ' € einmalig' : ''}</td>
            <td>${opt.quantity || opt.lines || 1}</td>
          </tr>
        `).join('')}
      </table>
    `;
  }

  // Build missing K7 IDs table
  const missingK7Html = `
    <h2 style="color: #d32f2f;">⚠️ Fehlende K7-IDs</h2>
    <p>Die K7-XML konnte nicht vollständig generiert werden, da folgende K7-IDs fehlen:</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; background: #fff3cd;">
      <tr style="background: #ffc107;"><th>Typ</th><th>Name</th><th>Grund</th></tr>
      ${missingK7Items.map(item => `
        <tr>
          <td>${item.type}</td>
          <td><strong>${item.name}</strong></td>
          <td>${item.reason}</td>
        </tr>
      `).join('')}
    </table>
    <p style="margin-top: 16px;"><strong>Handlungsempfehlung:</strong> Bitte hinterlegen Sie die fehlenden K7-IDs im Admin-Panel unter Produkte → Optionen und generieren Sie die XML anschließend erneut.</p>
  `;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        table { margin: 16px 0; }
        h1 { color: #003366; }
        h2 { color: #003366; margin-top: 24px; }
      </style>
    </head>
    <body>
      <h1>🔧 K7-XML Generierung fehlgeschlagen</h1>
      <p>Bei der folgenden Bestellung konnten nicht alle erforderlichen K7-IDs gefunden werden:</p>
      ${orderSummary}
      ${optionsHtml}
      ${missingK7Html}
      <hr style="margin: 32px 0;">
      <p style="color: #666; font-size: 12px;">
        Diese E-Mail wurde automatisch vom COM-IN Bestellsystem generiert.<br>
        Bestellung vom: ${new Date(order.created_at).toLocaleString('de-DE')}
      </p>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: 'COM-IN Bestellsystem <noreply@comin-glasfaser.de>',
      to: [FALLBACK_EMAIL],
      subject: `⚠️ K7-IDs fehlen: Bestellung ${vzfData.orderNumber || order.id.substring(0, 8)} - ${order.customer_name}`,
      html: emailHtml,
    });
    console.log('Fallback email sent to', FALLBACK_EMAIL);
  } catch (emailError) {
    console.error('Failed to send fallback email:', emailError);
  }
}

// Generate a random GUID
function generateGuid(): string {
  return crypto.randomUUID();
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Clean numeric ID (remove decimals like "25523,00" -> "25523")
function cleanNumericId(value: string | null): string {
  if (!value) return '';
  return value.replace(/,\d+$/, '').replace(/\.\d+$/, '').trim();
}

// Helper to escape XML special characters
function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Map provider name to K7 EKP ID
function getProviderK7Id(providerName: string | null): string {
  if (!providerName) return '411'; // Default to Faxverfahren
  
  const lowerName = providerName.toLowerCase();
  
  if (lowerName.includes('telekom') || lowerName.includes('t-online')) return '2';
  if (lowerName.includes('vodafone') && lowerName.includes('kabel')) return '171';
  if (lowerName.includes('vodafone') || lowerName.includes('d2')) return '8';
  if (lowerName.includes('o2') || lowerName.includes('telefonica')) return '17';
  if (lowerName.includes('mnet') || lowerName.includes('m-net')) return '44';
  if (lowerName.includes('1&1') || lowerName.includes('1und1')) return '181';
  
  return '411'; // Faxverfahren for unknown/manual providers
}

// Parse phone number into area code and number
function parsePhoneNumber(phoneNumber: string): { areaCode: string; number: string } {
  if (!phoneNumber) return { areaCode: '', number: '' };
  
  // Remove spaces, dashes, slashes
  const cleaned = phoneNumber.replace(/[\s\-\/]/g, '');
  
  // Check for common German area code patterns
  // Format could be: 0841123456789, +49841123456789, 0841/123456789
  let digits = cleaned.replace(/[^\d]/g, '');
  
  // Remove leading country code if present
  if (digits.startsWith('49')) {
    digits = '0' + digits.substring(2);
  } else if (digits.startsWith('0049')) {
    digits = '0' + digits.substring(4);
  }
  
  // Try to extract area code (typically 3-5 digits after 0)
  // German area codes: 030 (Berlin), 089 (Munich), 0841 (Ingolstadt), etc.
  if (digits.startsWith('0')) {
    // Check for 2-digit area codes (major cities)
    const twoDigitCodes = ['30', '40', '69', '89'];
    const threeDigitCodes = ['841', '851', '911', '621', '711', '351', '511', '201', '211', '221', '228', '231', '234', '241'];
    
    const potentialCode = digits.substring(1, 4);
    if (twoDigitCodes.includes(digits.substring(1, 3))) {
      return { areaCode: '0' + digits.substring(1, 3), number: digits.substring(3) };
    } else if (threeDigitCodes.some(c => potentialCode.startsWith(c))) {
      const matchedCode = threeDigitCodes.find(c => potentialCode.startsWith(c))!;
      return { areaCode: '0' + matchedCode, number: digits.substring(1 + matchedCode.length) };
    } else {
      // Default: assume 4-digit area code
      return { areaCode: digits.substring(0, 5), number: digits.substring(5) };
    }
  }
  
  return { areaCode: '', number: digits };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    console.log('Generating K7 XML for order:', orderId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    console.log('Order loaded:', order.customer_name);

    // Extract vzf_data for additional info
    const vzfData = order.vzf_data || {};
    const alternateBillingAddress = vzfData.alternateBillingAddress;
    const alternatePaymentPerson = vzfData.alternatePaymentPerson;
    const phonePortingData = vzfData.phonePortingData;
    const orderNotes = vzfData.orderNotes || null; // Bemerkung zur Bestellung

    // Fetch product with speeds for bandwidth matching
    let productK7Id = '';
    let productDownloadSpeed = 0;
    let productUploadSpeed = 0;
    let isSondertarif = false;
    let sondertarifK7OptionIds: string[] = [];
    
    if (order.product_id) {
      const { data: product } = await supabase
        .from('products')
        .select('product_id_k7, name, download_speed, upload_speed, is_sondertarif, sondertarif_k7_option_ids')
        .eq('id', order.product_id)
        .single();
      
      if (product) {
        if (product.product_id_k7) {
          productK7Id = cleanNumericId(product.product_id_k7);
        }
        productDownloadSpeed = product.download_speed || 0;
        productUploadSpeed = product.upload_speed || 0;
        isSondertarif = product.is_sondertarif || false;
        sondertarifK7OptionIds = (product.sondertarif_k7_option_ids || []).map((id: string) => cleanNumericId(id)).filter((id: string) => id);
        
        console.log('Product:', product.name, 'K7 ID:', productK7Id, 'Speeds:', productDownloadSpeed + '/' + productUploadSpeed);
        if (isSondertarif) {
          console.log('Sondertarif detected, K7 Option IDs:', sondertarifK7OptionIds);
        }
      }
    }

    // Fetch building K7 data with bandwidth matching
    let buildingK7Id = '';
    let bandbreiteId = '';
    let vorleistungsproduktId = '';
    let buildingPostalCode = '';
    
    const { data: buildings } = await supabase
      .from('buildings')
      .select('id, gebaeude_id_k7, postal_code')
      .ilike('street', order.street)
      .ilike('house_number', order.house_number)
      .ilike('city', order.city)
      .limit(1);

    if (buildings && buildings.length > 0) {
      const building = buildings[0];
      buildingK7Id = cleanNumericId(building.gebaeude_id_k7);
      buildingPostalCode = (building.postal_code || '').trim();
      
      const { data: k7Services } = await supabase
        .from('building_k7_services')
        .select('*')
        .eq('building_id', building.id);

      if (k7Services && k7Services.length > 0) {
        const targetBandwidth = `${productDownloadSpeed}/${productUploadSpeed}`;
        
        let matchedK7 = k7Services.find(k7 => {
          if (!k7.bandbreite) return false;
          if (k7.bandbreite === targetBandwidth) return true;
          const parts = k7.bandbreite.split('/');
          if (parts.length === 2) {
            const down = parseInt(parts[0], 10);
            const up = parseInt(parts[1], 10);
            return down === productDownloadSpeed && up === productUploadSpeed;
          }
          return false;
        });
        
        if (!matchedK7) {
          console.log('No bandwidth match found for', targetBandwidth, '- using first K7 service');
          matchedK7 = k7Services[0];
        } else {
          console.log('Matched K7 service for bandwidth:', targetBandwidth);
        }
        
        buildingK7Id = cleanNumericId(matchedK7.std_kabel_gebaeude_id) || buildingK7Id;
        bandbreiteId = cleanNumericId(matchedK7.nt_dsl_bandbreite_id);
        vorleistungsproduktId = cleanNumericId(matchedK7.leistungsprodukt_id);
        console.log('K7 Data:', { buildingK7Id, bandbreiteId, vorleistungsproduktId });
      }
    }

    const postalCode = String(order.postal_code || buildingPostalCode).trim();

    // Fetch selected options with K7 IDs
    // For quantitative options, add the K7 ID multiple times (once per quantity)
    // Track missing K7 IDs for fallback email
    const selectedOptions = order.selected_options || [];
    const optionK7Ids: string[] = [];
    const missingK7Items: Array<{ type: string; name: string; reason: string }> = [];
    
    for (const opt of selectedOptions) {
      if (opt.optionId && order.product_id) {
        const { data: mapping } = await supabase
          .from('product_option_mappings')
          .select('option_id_k7')
          .eq('option_id', opt.optionId)
          .eq('product_id', order.product_id)
          .maybeSingle();
        
        if (mapping?.option_id_k7) {
          const cleanedK7Id = cleanNumericId(mapping.option_id_k7);
          // Use quantity for regular options, lines for phone options
          const quantity = opt.lines || opt.quantity || 1;
          
          // Add the K7 ID multiple times for quantitative options (including phone lines)
          for (let i = 0; i < quantity; i++) {
            optionK7Ids.push(cleanedK7Id);
          }
          console.log('Option K7 ID:', mapping.option_id_k7, 'for option', opt.name || opt.type, 'quantity:', quantity);
        } else {
          // K7 ID is missing for this option
          const optionName = opt.name || opt.type || 'Unbekannte Option';
          console.warn(`Missing K7 ID for option: ${optionName}`);
          missingK7Items.push({
            type: 'Option',
            name: optionName,
            reason: `Keine K7-ID im product_option_mappings für Produkt ${order.product_name} hinterlegt`
          });
        }
      }
    }

    // Fetch produktbezogene Promotion K7-IDs for the ordered product
    if (order.product_id) {
      const { data: promotionDiscounts } = await supabase
        .from('promotion_discounts')
        .select('k7_template_id, promotion_id')
        .eq('target_product_id', order.product_id)
        .not('k7_template_id', 'is', null);
      
      if (promotionDiscounts && promotionDiscounts.length > 0) {
        // Check which promotions were actually applied to this order
        const appliedPromotions = order.applied_promotions || [];
        const appliedPromotionIds = appliedPromotions.map((p: any) => p.id || p.promotionId);
        
        for (const discount of promotionDiscounts) {
          // Only add K7 ID if this promotion was applied to the order
          const wasApplied = appliedPromotionIds.includes(discount.promotion_id);
          if (wasApplied && discount.k7_template_id) {
            const cleanedK7Id = cleanNumericId(discount.k7_template_id);
            if (cleanedK7Id && !optionK7Ids.includes(cleanedK7Id)) {
              optionK7Ids.push(cleanedK7Id);
              console.log('Promotion K7 ID:', cleanedK7Id, 'for promotion:', discount.promotion_id);
            }
          }
        }
      }
    }

    // Add Sondertarif K7 Options IDs (mandatory for Sondertarif products)
    if (isSondertarif && sondertarifK7OptionIds.length > 0) {
      for (const sondertarifId of sondertarifK7OptionIds) {
        if (sondertarifId && !optionK7Ids.includes(sondertarifId)) {
          optionK7Ids.push(sondertarifId);
          console.log('Sondertarif K7 Option ID:', sondertarifId);
        }
      }
    }

    // Check for missing critical K7 IDs and send fallback email if needed
    if (!productK7Id) {
      missingK7Items.push({
        type: 'Produkt',
        name: order.product_name,
        reason: 'Keine product_id_k7 im Produkt hinterlegt'
      });
    }
    if (!buildingK7Id) {
      missingK7Items.push({
        type: 'Gebäude',
        name: `${order.street} ${order.house_number}, ${order.city}`,
        reason: 'Kein gebaeude_id_k7 oder building_k7_services für diese Adresse vorhanden'
      });
    }

    // If there are missing K7 IDs, send fallback email
    if (missingK7Items.length > 0) {
      console.warn(`Missing K7 IDs detected: ${missingK7Items.length} items`);
      await sendFallbackEmail(order, missingK7Items, productK7Id, buildingK7Id);
      
      // Return error response with details about missing K7 IDs
      return new Response(JSON.stringify({ 
        error: 'K7-IDs fehlen',
        missingItems: missingK7Items,
        message: `Es fehlen ${missingK7Items.length} K7-ID(s). Eine Fallback-Email wurde an ${FALLBACK_EMAIL} gesendet.`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate GUIDs for XML elements
    const headerGuid = generateGuid();
    const customerGuid = generateGuid();
    const rechnungsAdresseGuid = generateGuid();
    const anschlussAdresseGuid = generateGuid();
    const rechnungsAnsprechpartnerGuid = generateGuid();
    const anschlussAnsprechpartnerGuid = generateGuid();
    const produktGuid = generateGuid();
    const anschlussGuid = generateGuid();
    const telefonbuchGuid = generateGuid();
    const lieferAdresseGuid = generateGuid();
    const lieferAnsprechpartnerGuid = generateGuid();
    const kontoinhaberAdresseGuid = generateGuid();
    const kontoinhaberAnsprechpartnerGuid = generateGuid();
    const voipRAccountGuid = generateGuid();

    const today = formatDate(new Date());
    const orderDate = order.created_at ? formatDate(new Date(order.created_at)) : today;
    const installationDate = order.desired_start_date || today;
    
    // Determine customer type
    const isKmu = vzfData.customerType === 'kmu';
    const organisationsstufe = isKmu ? '2' : '6';
    
    // Parse customer name
    const firstName = order.customer_first_name || '';
    const lastName = order.customer_last_name || order.customer_name || '';

    // Determine EVN preference
    const versandpraeferenz = order.phone_evn ? 'RECH_MAIL_EVN_PORTAL' : 'RECH_MAIL';

    // Build options XML
    let optionsXml = '';
    for (const k7Id of optionK7Ids) {
      optionsXml += `
                        <Option xsi:type="ProduktOptionType">
                          <ProduktOption>
                            <LookupValue>${k7Id}</LookupValue>
                          </ProduktOption>
                          <GueltigVon>${today}</GueltigVon>
                        </Option>`;
    }

    // Phone book settings
    const phoneBookUmfang = order.phone_book_show_address ? '3' : '1';
    const phoneBookSuchverzeichnis = isKmu ? 'F' : 'P';

    // === Build UserExtInfo ===
    let userExtInfoXml = `
      <UserExtInfo>
        <ExtInfo3>${order.id}</ExtInfo3>`;
    
    // KwK (Kunden werben Kunden)
    if (order.referral_customer_number) {
      userExtInfoXml += `
        <ExtInfo4>${escapeXml(order.referral_customer_number)} - 50/50</ExtInfo4>`;
      console.log('KwK referral:', order.referral_customer_number);
    }
    
    
    userExtInfoXml += `
      </UserExtInfo>`;

    // === Build AbweichenderKontoinhaber if needed ===
    let abweichenderKontoinhaberXml = '';
    const hasAlternatePayment = alternatePaymentPerson?.enabled && alternatePaymentPerson?.name;
    
    if (hasAlternatePayment) {
      abweichenderKontoinhaberXml = `
        <AbweichenderKontoinhaber>
          <KontoinhaberAbweichendVomRechnungsempfaenger>true</KontoinhaberAbweichendVomRechnungsempfaenger>
          <KontoinhaberAdresse>
            <LookupGuid>${kontoinhaberAdresseGuid}</LookupGuid>
          </KontoinhaberAdresse>
          <KontoinhaberAnsprechpartner>
            <LookupGuid>${kontoinhaberAnsprechpartnerGuid}</LookupGuid>
          </KontoinhaberAnsprechpartner>
          <Rechnungsempfaenger>${escapeXml(alternatePaymentPerson.name)}</Rechnungsempfaenger>
        </AbweichenderKontoinhaber>`;
      console.log('Abweichender Kontoinhaber:', alternatePaymentPerson.name);
    }

    // === Build additional addresses ===
    let additionalAddressesXml = '';
    
    // Lieferadresse
    const hasAlternateBilling = alternateBillingAddress?.enabled && alternateBillingAddress?.street;
    if (hasAlternateBilling) {
      const lieferName = alternateBillingAddress.name || `${firstName} ${lastName}`;
      const lieferNameParts = lieferName.split(' ');
      const lieferVorname = lieferNameParts.slice(0, -1).join(' ') || firstName;
      const lieferNachname = lieferNameParts.slice(-1)[0] || lastName;
      
      additionalAddressesXml += `
        <Adresse xsi:type="AdresseType" Guid="${lieferAdresseGuid}">
          <Postleitzahl>${escapeXml(alternateBillingAddress.postalCode || postalCode)}</Postleitzahl>
          <Ort>${escapeXml(alternateBillingAddress.city || order.city)}</Ort>
          <Strasse>${escapeXml(alternateBillingAddress.street)} ${escapeXml(alternateBillingAddress.houseNumber || '')}</Strasse>
          <Adressart>
            <LookupValue>LIEFER</LookupValue>
          </Adressart>
          <Ansprechpartner>
            <Ansprechpartner xsi:type="AnsprechpartnerType" Guid="${lieferAnsprechpartnerGuid}">
              <Vorname>${escapeXml(lieferVorname)}</Vorname>
              <Nachname>${escapeXml(lieferNachname)}</Nachname>
              <Telefon>${escapeXml(order.customer_phone || '')}</Telefon>
              <E_Mail>${escapeXml(order.customer_email)}</E_Mail>
              <Ansprechpartnerart>
                <LookupValue>LIEFER</LookupValue>
              </Ansprechpartnerart>
            </Ansprechpartner>
          </Ansprechpartner>
        </Adresse>`;
      console.log('Lieferadresse:', alternateBillingAddress.street);
    }
    
    // Kontoinhaber-Adresse
    if (hasAlternatePayment) {
      const kontoinhaberName = alternatePaymentPerson.name || '';
      const kontoinhaberNameParts = kontoinhaberName.split(' ');
      const kontoinhaberVorname = kontoinhaberNameParts.slice(0, -1).join(' ') || '';
      const kontoinhaberNachname = kontoinhaberNameParts.slice(-1)[0] || kontoinhaberName;
      
      // Use alternate billing address for Kontoinhaber if available, otherwise use main address
      const kontoinhaberStreet = alternateBillingAddress?.enabled ? 
        `${alternateBillingAddress.street} ${alternateBillingAddress.houseNumber || ''}` : 
        `${order.street} ${order.house_number}`;
      const kontoinhaberCity = alternateBillingAddress?.enabled ? (alternateBillingAddress.city || order.city) : order.city;
      const kontoinhaberPLZ = alternateBillingAddress?.enabled
        ? (alternateBillingAddress.postalCode || postalCode)
        : postalCode;
      
      additionalAddressesXml += `
        <Adresse xsi:type="AdresseType" Guid="${kontoinhaberAdresseGuid}">
          <Postleitzahl>${escapeXml(kontoinhaberPLZ || '')}</Postleitzahl>
          <Ort>${escapeXml(kontoinhaberCity || '')}</Ort>
          <Strasse>${escapeXml(kontoinhaberStreet)}</Strasse>
          <Adressart>
            <LookupValue>KONTOINH</LookupValue>
          </Adressart>
          <Ansprechpartner>
            <Ansprechpartner xsi:type="AnsprechpartnerType" Guid="${kontoinhaberAnsprechpartnerGuid}">
              <Vorname>${escapeXml(kontoinhaberVorname)}</Vorname>
              <Nachname>${escapeXml(kontoinhaberNachname)}</Nachname>
              <Telefon>${escapeXml(order.customer_phone || '')}</Telefon>
              <E_Mail>${escapeXml(order.customer_email)}</E_Mail>
              <Ansprechpartnerart>
                <LookupValue>KONTOINH</LookupValue>
              </Ansprechpartnerart>
            </Ansprechpartner>
          </Ansprechpartner>
        </Adresse>`;
    }

    // === Build Dienst UserExtInfo (for sonstiger EKP) ===
    let dienstUserExtInfoXml = '';
    if (order.cancel_previous_provider && order.previous_provider_name) {
      dienstUserExtInfoXml = `
          <UserExtInfo>
            <ExtInfo3>${escapeXml(order.previous_provider_name)}</ExtInfo3>
          </UserExtInfo>`;
      console.log('Sonstiger abgebender EKP:', order.previous_provider_name);
    }

    // === Build Portierung section ===
    let portierungVoipAccountXml = '';
    let flnpImportAuftraegeXml = '';
    const hasPortierung = order.phone_porting && order.phone_porting_numbers && 
                          Array.isArray(order.phone_porting_numbers) && 
                          order.phone_porting_numbers.length > 0;
    
    if (hasPortierung) {
      const portingNumbers = order.phone_porting_numbers;
      const firstNumber = portingNumbers[0]?.number || portingNumbers[0] || '';
      const parsed = parsePhoneNumber(firstNumber);
      
      const providerK7Id = getProviderK7Id(order.phone_porting_provider);
      
      // Get porting contact info
      const portierungVorname = phonePortingData?.connectionHolder?.split(' ').slice(0, -1).join(' ') || firstName;
      const portierungNachname = phonePortingData?.connectionHolder?.split(' ').slice(-1)[0] || lastName;
      
      portierungVoipAccountXml = `
            <Account xsi:type="VoIPAccountType" Guid="${voipRAccountGuid}">
              <Allgemein>
                <Accountart>
                  <LookupValue>R</LookupValue>
                </Accountart>
                <IntVorwahl>0049</IntVorwahl>
                <NatVorwahl>${escapeXml(parsed.areaCode)}</NatVorwahl>
                <Startnummer>${escapeXml(parsed.number)}</Startnummer>
              </Allgemein>
              <Erweitert>
                <Telefonbucheintrag>
                  <LookupGuid>${telefonbuchGuid}</LookupGuid>
                </Telefonbucheintrag>
                <PortierungEingehend>true</PortierungEingehend>
              </Erweitert>
            </Account>`;
      
      flnpImportAuftraegeXml = `
          <FLNPImportAuftraege>
            <FLNPAuftrag>
              <PortierungAdresse>
                <LookupGuid>${anschlussAdresseGuid}</LookupGuid>
              </PortierungAdresse>
              <AbgebenderEKP>
                <LookupValue>${providerK7Id}</LookupValue>
              </AbgebenderEKP>
              <WbciAnfrageTyp>
                <LookupValue>KUE_MRN</LookupValue>
              </WbciAnfrageTyp>
              <Portierungstermin>${order.desired_start_date || today}</Portierungstermin>
              <PortierungsansprechpartnerKunde>
                <Anrede><LookupValue>${isKmu ? 'Firma' : 'Herr'}</LookupValue></Anrede>
                <Vorname>${escapeXml(portierungVorname)}</Vorname>
                <Nachname>${escapeXml(portierungNachname)}</Nachname>
              </PortierungsansprechpartnerKunde>
              <VoIPAccounts>
                <VoIPAccount>
                  <VoIPAccount>
                    <LookupGuid>${voipRAccountGuid}</LookupGuid>
                  </VoIPAccount>
                </VoIPAccount>
              </VoIPAccounts>
            </FLNPAuftrag>
          </FLNPImportAuftraege>`;
      
      console.log('Portierung:', firstNumber, 'von Provider:', order.phone_porting_provider, '(K7 ID:', providerK7Id + ')');
    }

    // Standard VoIP R Account (without porting)
    const standardVoipRAccountXml = !hasPortierung ? `
            <Account xsi:type="VoIPAccountType">
              <Allgemein>
                <Accountart>
                  <LookupValue>R</LookupValue>
                </Accountart>
                <IntVorwahl>0049</IntVorwahl>
                <NatVorwahl>0</NatVorwahl>
              </Allgemein>
              <Erweitert>
                <Telefonbucheintrag>
                  <LookupGuid>${telefonbuchGuid}</LookupGuid>
                </Telefonbucheintrag>
              </Erweitert>
            </Account>` : '';

    // Build XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         SchemaVersion="7.2.5.1">
  <Header>
    <Guid>${headerGuid}</Guid>
    <ReferenceNumberPartner>${order.id}</ReferenceNumberPartner>
  </Header>
  <BusinessAct xsi:type="Create">
    <Data xsi:type="KundeType" Guid="${customerGuid}">${userExtInfoXml}
      <Mandant>
        <LookupValue>1</LookupValue>
      </Mandant>
      <Organisationsstufe>
        <LookupValue>${organisationsstufe}</LookupValue>
      </Organisationsstufe>
      <Name1>${escapeXml(lastName)}</Name1>
      <Name2>${escapeXml(firstName)}</Name2>${orderNotes ? `
      <Bemerkung>${escapeXml(orderNotes)}</Bemerkung>` : ''}
      <Kundennummer AutoGenerate="true"/>
      <Versandpraeferenz>
        <LookupValue>${versandpraeferenz}</LookupValue>
      </Versandpraeferenz>
      <Zahlweise xsi:type="ZahlweiseType">
        <Zahlungsart>
          <LookupValue>LB</LookupValue>
        </Zahlungsart>
        <IBAN>${(order.bank_iban || '').replace(/\s/g, '').toUpperCase()}</IBAN>${abweichenderKontoinhaberXml}
        <SEPALastschriftmandate>
          <SEPALastschriftmandat xsi:type="SEPALastschriftmandatType">
            <MandatsReferenz AutoGenerate="true"/>
            <GueltigVon>${today}</GueltigVon>
            <UnterzeichnetAm>${today}</UnterzeichnetAm>
          </SEPALastschriftmandat>
        </SEPALastschriftmandate>
      </Zahlweise>
      <Adressen>
        <Adresse xsi:type="AdresseType" Guid="${rechnungsAdresseGuid}">
          <Postleitzahl>${escapeXml(postalCode)}</Postleitzahl>
          <Ort>${escapeXml(order.city)}</Ort>
          <Strasse>${escapeXml(order.street)} ${escapeXml(order.house_number)}</Strasse>
          <Adressart>
            <LookupValue>RECH</LookupValue>
          </Adressart>
          <Ansprechpartner>
            <Ansprechpartner xsi:type="AnsprechpartnerType" Guid="${rechnungsAnsprechpartnerGuid}">
              <Vorname>${escapeXml(firstName)}</Vorname>
              <Nachname>${escapeXml(lastName)}</Nachname>
              <Geburtstag>${today}</Geburtstag>
              <Telefon>${escapeXml(order.customer_phone || '')}</Telefon>
              <E_Mail>${escapeXml(order.customer_email)}</E_Mail>
              <Ansprechpartnerart>
                <LookupValue>RECH</LookupValue>
              </Ansprechpartnerart>
              <OptIn>
                <OptInLiegtVor>${order.consent_advertising ? 'true' : 'false'}</OptInLiegtVor>
                <DatumDerEinwilligung>${today}</DatumDerEinwilligung>
                <Infomail>${order.consent_advertising ? 'true' : 'false'}</Infomail>
                <Infoanrufe>${order.consent_advertising ? 'true' : 'false'}</Infoanrufe>
                <Infopost>${order.consent_advertising ? 'true' : 'false'}</Infopost>
              </OptIn>
            </Ansprechpartner>
          </Ansprechpartner>
        </Adresse>
        <Adresse xsi:type="AdresseType" Guid="${anschlussAdresseGuid}">
          <Postleitzahl>${escapeXml(postalCode)}</Postleitzahl>
          <Ort>${escapeXml(order.city)}</Ort>
          <Strasse>${escapeXml(order.street)} ${escapeXml(order.house_number)}</Strasse>
          <Adressart>
            <LookupValue>AINHABER</LookupValue>
          </Adressart>
          <Ansprechpartner>
            <Ansprechpartner xsi:type="AnsprechpartnerType" Guid="${anschlussAnsprechpartnerGuid}">
              <Vorname>${escapeXml(firstName)}</Vorname>
              <Nachname>${escapeXml(lastName)}</Nachname>
              <Geburtstag>${today}</Geburtstag>
              <Telefon>${escapeXml(order.customer_phone || '')}</Telefon>
              <E_Mail>${escapeXml(order.customer_email)}</E_Mail>
              <Ansprechpartnerart>
                <LookupValue>AINHABER</LookupValue>
              </Ansprechpartnerart>
            </Ansprechpartner>
          </Ansprechpartner>
        </Adresse>${additionalAddressesXml}
      </Adressen>
      <Dienste>
        <Dienst xsi:type="DienstMultiplayType">${dienstUserExtInfoXml}
          <Produkte>
            <Produkt xsi:type="DienstProduktRefType" Guid="${produktGuid}">
              <Vertragsart>
                <LookupValue>VV</LookupValue>
              </Vertragsart>
              <Produkt>
                <LookupValue>${productK7Id}</LookupValue>
              </Produkt>
              <Vertragsbeginn>${today}</Vertragsbeginn>
              <Vertragsende AutoGenerate="true"/>
              <ZuletztErfasstAm>${orderDate}</ZuletztErfasstAm>
              <ZuletztUnterzeichhnetAm>${orderDate}</ZuletztUnterzeichhnetAm>
              <Optionen>${optionsXml}
              </Optionen>
            </Produkt>
          </Produkte>
          <Freischaltung>
            <Anschluss>
              <LookupGuid>${anschlussGuid}</LookupGuid>
            </Anschluss>
          </Freischaltung>
          <Accounts>
            <Account xsi:type="DSLAccountType">
              <Allgemein>
                <User AutoGenerate="true"/>
                <Passwort AutoGenerate="true"/>
                <GueltigVon>2200-01-01</GueltigVon>
                <GueltigBis>2200-01-01</GueltigBis>
              </Allgemein>
              <Erweitert>
                <Bandbreite>
                  <LookupValue>${bandbreiteId}</LookupValue>
                </Bandbreite>
              </Erweitert>
            </Account>
            <Account xsi:type="VoIPAccountType">
              <Allgemein>
                <Accountart>
                  <LookupValue>O</LookupValue>
                </Accountart>
                <Account AutoGenerate="true"/>
                <Passwort AutoGenerate="true"/>
              </Allgemein>
            </Account>${hasPortierung ? portierungVoipAccountXml : standardVoipRAccountXml}
          </Accounts>${flnpImportAuftraegeXml}
        </Dienst>
      </Dienste>
      <Anschluesse>
        <Anschluss xsi:type="AnschlussType" Guid="${anschlussGuid}">
          <Installationstermin>${installationDate}</Installationstermin>
          <Standort>
            <LookupGuid>${anschlussAdresseGuid}</LookupGuid>
          </Standort>
          <Anschlussinhaber>
            <LookupGuid>${anschlussAnsprechpartnerGuid}</LookupGuid>
          </Anschlussinhaber>
          <Ansprechpartner>
            <LookupGuid>${anschlussAnsprechpartnerGuid}</LookupGuid>
          </Ansprechpartner>
          <Gebaeude>
            <LookupID>${buildingK7Id}</LookupID>
          </Gebaeude>
          <VorleistungsproduktBSA>
            <LookupValue>${vorleistungsproduktId}</LookupValue>
          </VorleistungsproduktBSA>
        </Anschluss>
      </Anschluesse>
      <Telefonbucheintraege>
        <Telefonbucheintrag Guid="${telefonbuchGuid}">
          <Umfang>
            <LookupValue>${phoneBookUmfang}</LookupValue>
          </Umfang>
          <Suchverzeichnis>
            <LookupValue>${phoneBookSuchverzeichnis}</LookupValue>
          </Suchverzeichnis>
          <Vorname>${escapeXml(firstName)}</Vorname>
          <Nachname>${escapeXml(lastName)}</Nachname>
          <Postleitzahl>${escapeXml(postalCode)}</Postleitzahl>
          <Ort>${escapeXml(order.city)}</Ort>
          <Strasse>${escapeXml(order.street)} ${escapeXml(order.house_number)}</Strasse>
          <TelefonLautAccount>true</TelefonLautAccount>
          <GedruckteVerzeichnisse>${order.phone_book_printed ? 'true' : 'false'}</GedruckteVerzeichnisse>
          <ElektronischeVerzeichnisse>${order.phone_book_internet ? 'true' : 'false'}</ElektronischeVerzeichnisse>
          <TelefonischeAuskunftNurRufnummer>${order.phone_book_phone_info ? 'true' : 'false'}</TelefonischeAuskunftNurRufnummer>
          <Inverssuche>false</Inverssuche>
        </Telefonbucheintrag>
      </Telefonbucheintraege>
    </Data>
  </BusinessAct>
</Request>`;

    console.log('XML generated successfully');

    return new Response(JSON.stringify({ 
      xml,
      fileName: `Bestellung_${order.id.substring(0, 8)}.xml`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error generating K7 XML:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
