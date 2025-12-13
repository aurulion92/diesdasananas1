import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
  dark_primary_hue: '28',
  dark_primary_saturation: '100',
  dark_primary_lightness: '55',
  dark_accent_hue: '28',
  dark_accent_saturation: '100',
  dark_accent_lightness: '55',
};

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  designSettings: DesignSettings;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme;
      if (stored) return stored;
    }
    return 'light';
  });
  
  const [designSettings, setDesignSettings] = useState<DesignSettings>(DEFAULT_DESIGN);
  const [loading, setLoading] = useState(true);

  const getEffectiveTheme = useCallback((): 'light' | 'dark' => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);

  const applyDesignSettings = useCallback((settings: DesignSettings, isDark: boolean) => {
    const root = document.documentElement;
    
    if (isDark) {
      root.classList.add('dark');
      root.style.setProperty('--primary', `${settings.dark_primary_hue || '28'} ${settings.dark_primary_saturation || '100'}% ${settings.dark_primary_lightness || '55'}%`);
      root.style.setProperty('--accent', `${settings.dark_accent_hue || '28'} ${settings.dark_accent_saturation || '100'}% ${settings.dark_accent_lightness || '55'}%`);
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--primary', `${settings.primary_hue} ${settings.primary_saturation}% ${settings.primary_lightness}%`);
      root.style.setProperty('--accent', `${settings.accent_hue} ${settings.accent_saturation}% ${settings.accent_lightness}%`);
    }
    
    root.style.setProperty('--ring', `${settings.accent_hue} ${settings.accent_saturation}% ${settings.accent_lightness}%`);
    root.style.setProperty('--radius', `${settings.border_radius}rem`);
  }, []);

  // Fetch design settings on mount
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
        }
      } catch (error) {
        console.error('Failed to load design settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Apply design when theme or settings change
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

  return (
    <ThemeContext.Provider
      value={{
        theme,
        effectiveTheme: getEffectiveTheme(),
        setTheme,
        toggleTheme,
        designSettings,
        loading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

export { DEFAULT_DESIGN };
