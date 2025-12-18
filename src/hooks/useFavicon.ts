import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_FAVICON = '/favicon.png';
const DEFAULT_TITLE = 'COM-IN | einfach Internet - Glasfaser bestellen';

export const useFavicon = (forceClear: boolean = false) => {
  useEffect(() => {
    const updateFavicon = (url: string | null) => {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (link) {
        if (url) {
          link.href = url;
        } else {
          link.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
        }
      }
    };

    if (forceClear) {
      updateFavicon(null);
      return;
    }

    const fetchFavicon = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'branding_settings')
        .maybeSingle();

      if (data?.value) {
        const settings = data.value as { favicon_url?: string };
        if (settings.favicon_url && settings.favicon_url.trim()) {
          updateFavicon(settings.favicon_url);
        } else {
          updateFavicon(DEFAULT_FAVICON);
        }
      } else {
        updateFavicon(DEFAULT_FAVICON);
      }
    };

    fetchFavicon();
  }, [forceClear]);
};

export const clearFavicon = () => {
  const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
  if (link) {
    link.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
  }
};

export const clearTitle = () => {
  document.title = '';
};

export const restoreFavicon = async () => {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'branding_settings')
    .maybeSingle();

  const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
  if (link) {
    if (data?.value) {
      const settings = data.value as { favicon_url?: string };
      if (settings.favicon_url && settings.favicon_url.trim()) {
        link.href = settings.favicon_url;
      } else {
        link.href = DEFAULT_FAVICON;
      }
    } else {
      link.href = DEFAULT_FAVICON;
    }
  }
};

export const restoreTitle = async () => {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'branding_settings')
    .maybeSingle();

  if (data?.value) {
    const settings = data.value as { site_title?: string };
    document.title = settings.site_title?.trim() || DEFAULT_TITLE;
  } else {
    document.title = DEFAULT_TITLE;
  }
};
