import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OutputFormatSettings {
  format: 'pdf' | 'xml';
}

const DEFAULT_OUTPUT_FORMAT: OutputFormatSettings = {
  format: 'pdf',
};

export const useOutputFormat = () => {
  const [outputFormat, setOutputFormat] = useState<OutputFormatSettings>(DEFAULT_OUTPUT_FORMAT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'output_format_settings')
        .maybeSingle();

      if (data?.value) {
        setOutputFormat({ ...DEFAULT_OUTPUT_FORMAT, ...(data.value as object) });
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  return { outputFormat, isXmlMode: outputFormat.format === 'xml', loading };
};
