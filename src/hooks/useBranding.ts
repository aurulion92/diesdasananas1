import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BrandingSettings {
  logo_url: string;
  company_name: string;
  welcome_title: string;
  welcome_subtitle: string;
  hotline_number: string;
  hotline_hours: string;
  new_customer_title: string;
  new_customer_description: string;
  existing_customer_title: string;
  existing_customer_description: string;
  // Customer type selection
  customer_type_title: string;
  customer_type_subtitle: string;
  private_customer_title: string;
  private_customer_description: string;
  business_customer_title: string;
  business_customer_description: string;
  // Business type selection
  business_selection_title: string;
  business_selection_subtitle: string;
  easy_business_title: string;
  easy_business_subtitle: string;
  easy_business_feature_1: string;
  easy_business_feature_2: string;
  easy_business_feature_3: string;
  easy_business_feature_4: string;
  easy_business_ideal: string;
  easy_business_button: string;
  individual_solutions_title: string;
  individual_solutions_subtitle: string;
  individual_feature_1: string;
  individual_feature_2: string;
  individual_feature_3: string;
  individual_feature_4: string;
  individual_feature_5: string;
  individual_feature_6: string;
  individual_feature_7: string;
  individual_feature_8: string;
  individual_button: string;
  individual_footer: string;
  // KMU specific
  kmu_netto_hint: string;
  kmu_cart_netto_label: string;
}

const DEFAULT_BRANDING: BrandingSettings = {
  logo_url: '',
  company_name: 'COM-IN',
  welcome_title: 'Willkommen bei COM-IN',
  welcome_subtitle: 'Glasfaser-Internet für Ingolstadt',
  hotline_number: '+49 841 88511-0',
  hotline_hours: 'Mo-Fr 8-18 Uhr',
  new_customer_title: 'Neukunde',
  new_customer_description: 'Jetzt Verfügbarkeit prüfen und einen neuen Anschluss bestellen',
  existing_customer_title: 'Bestandskunde?',
  existing_customer_description: 'Vertragsänderung, Umzug, Daten ändern oder Tarif-Upgrade',
  // Customer type selection
  customer_type_title: 'Für wen bestellen Sie?',
  customer_type_subtitle: 'Wählen Sie Ihre Kundenart',
  private_customer_title: 'Privatkunde',
  private_customer_description: 'Internet für Ihr Zuhause',
  business_customer_title: 'Geschäftskunde',
  business_customer_description: 'Internet für Ihr Unternehmen',
  // Business type selection
  business_selection_title: 'Geschäftskunden-Lösungen',
  business_selection_subtitle: 'Wählen Sie die passende Lösung für Ihr Unternehmen',
  easy_business_title: 'Business-Internet (EasyBusiness)',
  easy_business_subtitle: 'Klassischer Internetanschluss für Unternehmen',
  easy_business_feature_1: 'Asymmetrische Bandbreiten (hoher Download, angepasster Upload – ideal für Büro- & Cloud-Anwendungen)',
  easy_business_feature_2: 'Bessere Service-Level als bei Privatkunden',
  easy_business_feature_3: 'Erweiterte Telefonie-Optionen',
  easy_business_feature_4: 'Direkt online bestellbar',
  easy_business_ideal: 'Ideal für Büros, Praxen, Handel und kleine Unternehmen mit Internetbedarf',
  easy_business_button: 'Jetzt online bestellen',
  individual_solutions_title: 'Individuelle Unternehmenslösungen',
  individual_solutions_subtitle: '(D-Dienste & Dark Fiber)',
  individual_feature_1: 'Garantierte und symmetrische Bandbreiten',
  individual_feature_2: 'Feste Bandbreiten von 10 Mbit/s bis 100 Gbit/s',
  individual_feature_3: 'Standortvernetzung & Rechenzentrumsanbindung',
  individual_feature_4: 'Redundante Zuführung möglich',
  individual_feature_5: 'Professionelle Service-Level-Agreements',
  individual_feature_6: '19″ Router (z. B. Cisco, Juniper) inklusive',
  individual_feature_7: 'Feste, öffentliche IP-Adressen',
  individual_feature_8: 'Kurzfristig upgradebar',
  individual_button: 'Jetzt beraten lassen',
  individual_footer: '(keine Online-Bestellung, individuelle Planung)',
  // KMU specific
  kmu_netto_hint: 'Alle Preise verstehen sich zzgl. MwSt.',
  kmu_cart_netto_label: 'netto',
};

export const useBranding = () => {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'branding_settings')
        .maybeSingle();

      if (data?.value) {
        setBranding({ ...DEFAULT_BRANDING, ...(data.value as object) });
      }
      setLoading(false);
    };

    fetchBranding();
  }, []);

  return { branding, loading };
};

export { DEFAULT_BRANDING };
