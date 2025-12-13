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
