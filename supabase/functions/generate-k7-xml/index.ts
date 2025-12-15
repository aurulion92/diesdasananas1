import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Fetch product with speeds for bandwidth matching
    let productK7Id = '';
    let productDownloadSpeed = 0;
    let productUploadSpeed = 0;
    
    if (order.product_id) {
      const { data: product } = await supabase
        .from('products')
        .select('product_id_k7, name, download_speed, upload_speed')
        .eq('id', order.product_id)
        .single();
      
      if (product) {
        if (product.product_id_k7) {
          productK7Id = cleanNumericId(product.product_id_k7);
        }
        productDownloadSpeed = product.download_speed || 0;
        productUploadSpeed = product.upload_speed || 0;
        console.log('Product:', product.name, 'K7 ID:', productK7Id, 'Speeds:', productDownloadSpeed + '/' + productUploadSpeed);
      }
    }

    // Fetch building K7 data with bandwidth matching
    let buildingK7Id = '';
    let bandbreiteId = '';
    let vorleistungsproduktId = '';
    
    // First get building ID from address
    const { data: buildings } = await supabase
      .from('buildings')
      .select('id, gebaeude_id_k7')
      .ilike('street', order.street)
      .ilike('house_number', order.house_number)
      .ilike('city', order.city)
      .limit(1);

    if (buildings && buildings.length > 0) {
      const building = buildings[0];
      buildingK7Id = cleanNumericId(building.gebaeude_id_k7);
      
      // Fetch ALL K7 services for this building
      const { data: k7Services } = await supabase
        .from('building_k7_services')
        .select('*')
        .eq('building_id', building.id);

      if (k7Services && k7Services.length > 0) {
        // Try to find matching K7 service based on bandwidth
        // Format in DB: "1000/250", "500/100", "100/10", etc.
        const targetBandwidth = `${productDownloadSpeed}/${productUploadSpeed}`;
        
        let matchedK7 = k7Services.find(k7 => {
          if (!k7.bandbreite) return false;
          // Direct match
          if (k7.bandbreite === targetBandwidth) return true;
          // Try parsing the bandwidth string
          const parts = k7.bandbreite.split('/');
          if (parts.length === 2) {
            const down = parseInt(parts[0], 10);
            const up = parseInt(parts[1], 10);
            return down === productDownloadSpeed && up === productUploadSpeed;
          }
          return false;
        });
        
        // Fallback to first entry if no match found
        if (!matchedK7) {
          console.log('No bandwidth match found for', targetBandwidth, '- using first K7 service');
          matchedK7 = k7Services[0];
        } else {
          console.log('Matched K7 service for bandwidth:', targetBandwidth);
        }
        
        buildingK7Id = cleanNumericId(matchedK7.std_kabel_gebaeude_id) || buildingK7Id;
        bandbreiteId = cleanNumericId(matchedK7.nt_dsl_bandbreite_id);
        vorleistungsproduktId = cleanNumericId(matchedK7.leistungsprodukt_id);
        console.log('K7 Data:', { buildingK7Id, bandbreiteId, vorleistungsproduktId, matchedBandwidth: matchedK7.bandbreite });
      }
    }

    // Fetch selected options with K7 IDs
    const selectedOptions = order.selected_options || [];
    const optionK7Ids: string[] = [];
    
    for (const opt of selectedOptions) {
      if (opt.optionId && order.product_id) {
        // Get K7 ID from product_option_mappings
        const { data: mapping } = await supabase
          .from('product_option_mappings')
          .select('option_id_k7')
          .eq('option_id', opt.optionId)
          .eq('product_id', order.product_id)
          .single();
        
        if (mapping?.option_id_k7) {
          optionK7Ids.push(cleanNumericId(mapping.option_id_k7));
          console.log('Option K7 ID:', mapping.option_id_k7, 'for option', opt.name);
        }
      }
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

    const today = formatDate(new Date());
    
    // Determine customer type
    const isKmu = order.vzf_data?.customerType === 'kmu';
    const organisationsstufe = isKmu ? '2' : '6'; // 2=Firma, 6=Privatkunde
    
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

    // Phone book entry settings
    const phoneBookUmfang = order.phone_book_show_address ? '3' : '1'; // 3=with address, 1=only name+number
    const phoneBookSuchverzeichnis = isKmu ? 'F' : 'P'; // F=Firma, P=Privat

    // Build XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         SchemaVersion="7.2.5.1">
  <Header>
    <Guid>${headerGuid}</Guid>
    <ReferenceNumberPartner>${order.id}</ReferenceNumberPartner>
  </Header>
  <BusinessAct xsi:type="Create">
    <Data xsi:type="KundeType" Guid="${customerGuid}">
      <UserExtInfo>
        <ExtInfo3>${order.id}</ExtInfo3>
      </UserExtInfo>
      <Mandant>
        <LookupValue>1</LookupValue>
      </Mandant>
      <Organisationsstufe>
        <LookupValue>${organisationsstufe}</LookupValue>
      </Organisationsstufe>
      <Name1>${escapeXml(lastName)}</Name1>
      <Name2>${escapeXml(firstName)}</Name2>
      <Kundennummer AutoGenerate="true"/>
      <Versandpraeferenz>
        <LookupValue>${versandpraeferenz}</LookupValue>
      </Versandpraeferenz>
      <Zahlweise xsi:type="ZahlweiseType">
        <Zahlungsart>
          <LookupValue>LB</LookupValue>
        </Zahlungsart>
        <IBAN>${escapeXml(order.bank_iban || '')}</IBAN>
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
          <Postleitzahl>${escapeXml(order.postal_code || '')}</Postleitzahl>
          <Ort>${escapeXml(order.city)}</Ort>
          <Strasse>${escapeXml(order.street)} ${escapeXml(order.house_number)}</Strasse>
          <Adressart>
            <LookupValue>RECH</LookupValue>
          </Adressart>
          <Ansprechpartner>
            <Ansprechpartner xsi:type="AnsprechpartnerType" Guid="${rechnungsAnsprechpartnerGuid}">
              <Vorname>${escapeXml(firstName)}</Vorname>
              <Nachname>${escapeXml(lastName)}</Nachname>
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
          <Postleitzahl>${escapeXml(order.postal_code || '')}</Postleitzahl>
          <Ort>${escapeXml(order.city)}</Ort>
          <Strasse>${escapeXml(order.street)} ${escapeXml(order.house_number)}</Strasse>
          <Adressart>
            <LookupValue>AINHABER</LookupValue>
          </Adressart>
          <Ansprechpartner>
            <Ansprechpartner xsi:type="AnsprechpartnerType" Guid="${anschlussAnsprechpartnerGuid}">
              <Vorname>${escapeXml(firstName)}</Vorname>
              <Nachname>${escapeXml(lastName)}</Nachname>
              <Telefon>${escapeXml(order.customer_phone || '')}</Telefon>
              <E_Mail>${escapeXml(order.customer_email)}</E_Mail>
              <Ansprechpartnerart>
                <LookupValue>AINHABER</LookupValue>
              </Ansprechpartnerart>
            </Ansprechpartner>
          </Ansprechpartner>
        </Adresse>
      </Adressen>
      <Dienste>
        <Dienst xsi:type="DienstMultiplayType">
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
              <ZuletztErfasstAm>${today}</ZuletztErfasstAm>
              <ZuletztUnterzeichhnetAm>${today}</ZuletztUnterzeichhnetAm>
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
            </Account>
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
            </Account>
          </Accounts>
        </Dienst>
      </Dienste>
      <Anschluesse>
        <Anschluss xsi:type="AnschlussType" Guid="${anschlussGuid}">
          <Installationstermin>${order.desired_start_date || today}</Installationstermin>
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
          <Postleitzahl>${escapeXml(order.postal_code || '')}</Postleitzahl>
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

// Helper to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
