import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DesignSettings {
  primary_hue: string;
  primary_saturation: string;
  primary_lightness: string;
  accent_hue: string;
  accent_saturation: string;
  accent_lightness: string;
  border_radius: string;
  preset: string;
  // Dark mode colors
  dark_primary_hue?: string;
  dark_primary_saturation?: string;
  dark_primary_lightness?: string;
  dark_accent_hue?: string;
  dark_accent_saturation?: string;
  dark_accent_lightness?: string;
}

const DEFAULT_DESIGN: DesignSettings = {
  primary_hue: '230',
  primary_saturation: '60',
  primary_lightness: '25',
  accent_hue: '28',
  accent_saturation: '100',
  accent_lightness: '50',
  border_radius: '0.75',
  preset: 'comin-default',
  // Dark mode defaults
  dark_primary_hue: '28',
  dark_primary_saturation: '100',
  dark_primary_lightness: '55',
  dark_accent_hue: '28',
  dark_accent_saturation: '100',
  dark_accent_lightness: '55',
};

type Theme = 'light' | 'dark' | 'system';

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme;
      if (stored) return stored;
    }
    return 'system';
  });
  
  const [designSettings, setDesignSettings] = useState<DesignSettings>(DEFAULT_DESIGN);
  const [loading, setLoading] = useState(true);

  // Determine effective theme based on system preference
  const getEffectiveTheme = useCallback((): 'light' | 'dark' => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);

  // Apply design settings to CSS variables
  const applyDesignSettings = useCallback((settings: DesignSettings, isDark: boolean) => {
    const root = document.documentElement;
    
    if (isDark) {
      root.classList.add('dark');
      // Apply dark mode colors
      root.style.setProperty('--primary', `${settings.dark_primary_hue || '28'} ${settings.dark_primary_saturation || '100'}% ${settings.dark_primary_lightness || '55'}%`);
      root.style.setProperty('--accent', `${settings.dark_accent_hue || '28'} ${settings.dark_accent_saturation || '100'}% ${settings.dark_accent_lightness || '55'}%`);
    } else {
      root.classList.remove('dark');
      // Apply light mode colors
      root.style.setProperty('--primary', `${settings.primary_hue} ${settings.primary_saturation}% ${settings.primary_lightness}%`);
      root.style.setProperty('--accent', `${settings.accent_hue} ${settings.accent_saturation}% ${settings.accent_lightness}%`);
    }
    
    // Common settings
    root.style.setProperty('--ring', `${settings.accent_hue} ${settings.accent_saturation}% ${settings.accent_lightness}%`);
    root.style.setProperty('--radius', `${settings.border_radius}rem`);
  }, []);

  // Fetch design settings from database
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'design_settings')
          .maybeSingle();

        if (data?.value) {
          const settings = { ...DEFAULT_DESIGN, ...(data.value as object) } as DesignSettings;
          setDesignSettings(settings);
          applyDesignSettings(settings, getEffectiveTheme() === 'dark');
        }
      } catch (error) {
        console.error('Failed to load design settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [applyDesignSettings, getEffectiveTheme]);

  // Apply theme changes
  useEffect(() => {
    const effectiveTheme = getEffectiveTheme();
    applyDesignSettings(designSettings, effectiveTheme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme, designSettings, applyDesignSettings, getEffectiveTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyDesignSettings(designSettings, mediaQuery.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, designSettings, applyDesignSettings]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const effectiveTheme = getEffectiveTheme();
    setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
  }, [getEffectiveTheme, setTheme]);

  return {
    theme,
    effectiveTheme: getEffectiveTheme(),
    setTheme,
    toggleTheme,
    designSettings,
    loading,
  };
};

export { DEFAULT_DESIGN };
