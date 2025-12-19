import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FieldLabels {
  // Building IDs
  building_id_1_label: string;
  building_id_1_description: string;
  building_id_2_label: string;
  building_id_2_description: string;
  
  // Infrastructure types
  infrastructure_type_1_label: string; // FTTH
  infrastructure_type_2_label: string; // FTTB
  infrastructure_type_3_label: string; // FTTH Limited
  
  // Status fields
  construction_done_label: string; // Tiefbau erledigt
  connection_point_set_label: string; // APL gesetzt
  cable_tv_available_label: string;
  gnv_available_label: string;
  
  // Customer types
  private_customer_short: string; // PK
  business_customer_short: string; // KMU
  private_tariffs_label: string;
  business_tariffs_label: string;
  
  // Building types
  building_type_efh_label: string;
  building_type_mfh_label: string;
  building_type_wowi_label: string;
  
  // Build status
  build_status_completed_label: string;
  build_status_in_progress_label: string;
  build_status_planned_label: string;
  
  // System names (for K7, etc.)
  system_1_name: string; // z.B. "Bestandssystem"
  system_2_name: string; // z.B. "Provisionierungssystem"
  
  // Import labels
  import_buildings_label: string;
  import_services_label: string;
}

export const DEFAULT_FIELD_LABELS: FieldLabels = {
  // Building IDs
  building_id_1_label: 'Gebäude-ID 1',
  building_id_1_description: 'Primäre Gebäude-Identifikationsnummer',
  building_id_2_label: 'Gebäude-ID 2',
  building_id_2_description: 'Sekundäre System-ID',
  
  // Infrastructure types
  infrastructure_type_1_label: 'FTTH',
  infrastructure_type_2_label: 'FTTB',
  infrastructure_type_3_label: 'FTTH Limited',
  
  // Status fields
  construction_done_label: 'Tiefbau erledigt',
  connection_point_set_label: 'Anschlusspunkt gesetzt',
  cable_tv_available_label: 'Kabel-TV verfügbar',
  gnv_available_label: 'Glasfaser-Netzverteiler vorhanden',
  
  // Customer types
  private_customer_short: 'PK',
  business_customer_short: 'GK',
  private_tariffs_label: 'Privatkunden-Tarife',
  business_tariffs_label: 'Geschäftskunden-Tarife',
  
  // Building types
  building_type_efh_label: 'EFH',
  building_type_mfh_label: 'MFH',
  building_type_wowi_label: 'WoWi',
  
  // Build status
  build_status_completed_label: 'Abgeschlossen',
  build_status_in_progress_label: 'Im Ausbau',
  build_status_planned_label: 'Geplant',
  
  // System names
  system_1_name: 'System 1',
  system_2_name: 'System 2',
  
  // Import labels
  import_buildings_label: 'Gebäude importieren',
  import_services_label: 'Dienste importieren',
};

export const useFieldLabels = () => {
  const [labels, setLabels] = useState<FieldLabels>(DEFAULT_FIELD_LABELS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLabels = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'field_labels')
        .maybeSingle();

      if (data?.value) {
        setLabels({ ...DEFAULT_FIELD_LABELS, ...(data.value as object) });
      }
      setLoading(false);
    };

    fetchLabels();
  }, []);

  return { labels, loading };
};
