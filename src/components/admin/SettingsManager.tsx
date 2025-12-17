import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Palette, Mail, RotateCcw, Save, Eye, EyeOff, Shield, Trash2, RefreshCw, Building2, Image, AlertTriangle, Globe, Plus, X, Upload } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { BrandingSettings, DEFAULT_BRANDING } from '@/hooks/useBranding';

interface EmailSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  sender_email: string;
  sender_name: string;
  use_ssl: boolean;
  fallback_order_email: string;
}

interface DesignSettings {
  primary_hue: string;
  primary_saturation: string;
  primary_lightness: string;
  accent_hue: string;
  accent_saturation: string;
  accent_lightness: string;
  border_radius: string;
  preset: string;
  // Dark mode
  dark_primary_hue: string;
  dark_primary_saturation: string;
  dark_primary_lightness: string;
  dark_accent_hue: string;
  dark_accent_saturation: string;
  dark_accent_lightness: string;
}

interface RateLimitSettings {
  enabled: boolean;
  order_max_attempts: number;
  order_window_minutes: number;
  order_block_minutes: number;
  contact_max_attempts: number;
  contact_window_minutes: number;
  contact_block_minutes: number;
  login_max_attempts: number;
  login_window_minutes: number;
  login_block_minutes: number;
  ip_whitelist: string[];
}

interface RateLimitEntry {
  id: string;
  ip_address: string;
  action_type: string;
  attempts: number;
  blocked_until: string | null;
  first_attempt_at: string;
  last_attempt_at: string;
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

const DESIGN_PRESETS = [
  { 
    id: 'comin-default', 
    name: 'COM-IN Standard (Dunkelblau/Orange)',
    primary: { h: '230', s: '60', l: '25' },
    accent: { h: '28', s: '100', l: '50' },
    radius: '0.75'
  },
  { 
    id: 'modern-teal', 
    name: 'Modern Teal',
    primary: { h: '180', s: '70', l: '30' },
    accent: { h: '340', s: '85', l: '55' },
    radius: '1'
  },
  { 
    id: 'professional-gray', 
    name: 'Professionell Grau',
    primary: { h: '220', s: '15', l: '25' },
    accent: { h: '200', s: '75', l: '50' },
    radius: '0.5'
  },
  { 
    id: 'vibrant-purple', 
    name: 'Lebendig Violett',
    primary: { h: '270', s: '65', l: '35' },
    accent: { h: '45', s: '100', l: '55' },
    radius: '1'
  },
];

const DEFAULT_EMAIL: EmailSettings = {
  smtp_host: 'smtp.ionos.de',
  smtp_port: '587',
  smtp_user: '',
  smtp_password: '',
  sender_email: '',
  sender_name: 'COM-IN Glasfaser',
  use_ssl: true,
  fallback_order_email: '',
};

const DEFAULT_RATE_LIMIT: RateLimitSettings = {
  enabled: true,
  order_max_attempts: 3,
  order_window_minutes: 60,
  order_block_minutes: 60,
  contact_max_attempts: 5,
  contact_window_minutes: 30,
  contact_block_minutes: 30,
  login_max_attempts: 5,
  login_window_minutes: 15,
  login_block_minutes: 30,
  ip_whitelist: [],
};

export const SettingsManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(DEFAULT_EMAIL);
  const [designSettings, setDesignSettings] = useState<DesignSettings>(DEFAULT_DESIGN);
  const [rateLimitSettings, setRateLimitSettings] = useState<RateLimitSettings>(DEFAULT_RATE_LIMIT);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [rateLimitEntries, setRateLimitEntries] = useState<RateLimitEntry[]>([]);
  const [loadingRateLimits, setLoadingRateLimits] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchRateLimits();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    
    // Fetch email settings
    const { data: emailData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'email_settings')
      .maybeSingle();
    
    if (emailData?.value) {
      setEmailSettings({ ...DEFAULT_EMAIL, ...(emailData.value as object) });
    }

    // Fetch design settings
    const { data: designData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'design_settings')
      .maybeSingle();
    
    if (designData?.value) {
      const settings = { ...DEFAULT_DESIGN, ...(designData.value as object) } as DesignSettings;
      setDesignSettings(settings);
      applyDesignSettings(settings);
    }

    // Fetch rate limit settings
    const { data: rateLimitData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'rate_limit_settings')
      .maybeSingle();
    
    if (rateLimitData?.value) {
      setRateLimitSettings({ ...DEFAULT_RATE_LIMIT, ...(rateLimitData.value as object) });
    }

    // Fetch branding settings
    const { data: brandingData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'branding_settings')
      .maybeSingle();
    
    if (brandingData?.value) {
      setBrandingSettings({ ...DEFAULT_BRANDING, ...(brandingData.value as object) });
    }

    setLoading(false);
  };

  const fetchRateLimits = async () => {
    setLoadingRateLimits(true);
    const { data, error } = await supabase
      .from('rate_limits')
      .select('*')
      .order('last_attempt_at', { ascending: false })
      .limit(100);
    
    if (!error && data) {
      setRateLimitEntries(data);
    }
    setLoadingRateLimits(false);
  };

  const applyDesignSettings = (settings: DesignSettings) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', `${settings.primary_hue} ${settings.primary_saturation}% ${settings.primary_lightness}%`);
    root.style.setProperty('--accent', `${settings.accent_hue} ${settings.accent_saturation}% ${settings.accent_lightness}%`);
    root.style.setProperty('--ring', `${settings.accent_hue} ${settings.accent_saturation}% ${settings.accent_lightness}%`);
    root.style.setProperty('--radius', `${settings.border_radius}rem`);
  };

  const saveEmailSettings = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from('app_settings')
      .upsert([{
        key: 'email_settings',
        value: emailSettings as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString()
      }] as any, { onConflict: 'key' });

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Gespeichert', description: 'E-Mail-Einstellungen wurden gespeichert.' });
    }
    
    setSaving(false);
  };

  const saveDesignSettings = async () => {
    setSaving(true);
    
    // Save design settings (colors)
    const { error: designError } = await supabase
      .from('app_settings')
      .upsert([{
        key: 'design_settings',
        value: designSettings as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString()
      }] as any, { onConflict: 'key' });

    // Also save branding settings (includes logo)
    const { error: brandingError } = await supabase
      .from('app_settings')
      .upsert([{
        key: 'branding_settings',
        value: brandingSettings as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString()
      }] as any, { onConflict: 'key' });

    if (designError || brandingError) {
      toast({ title: 'Fehler', description: designError?.message || brandingError?.message, variant: 'destructive' });
    } else {
      applyDesignSettings(designSettings);
      toast({ title: 'Gespeichert', description: 'Design-Einstellungen und Logo wurden gespeichert.' });
    }
    
    setSaving(false);
  };

  const saveRateLimitSettings = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from('app_settings')
      .upsert([{
        key: 'rate_limit_settings',
        value: rateLimitSettings as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString()
      }] as any, { onConflict: 'key' });

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Gespeichert', description: 'Rate-Limit-Einstellungen wurden gespeichert.' });
    }
    
    setSaving(false);
  };

  const resetDesign = async () => {
    setDesignSettings(DEFAULT_DESIGN);
    applyDesignSettings(DEFAULT_DESIGN);
    
    // Also reset the logo
    const updatedBranding = { ...brandingSettings, logo_url: '' };
    setBrandingSettings(updatedBranding);
    
    // Save design settings
    const { error: designError } = await supabase
      .from('app_settings')
      .upsert([{
        key: 'design_settings',
        value: DEFAULT_DESIGN as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString()
      }] as any, { onConflict: 'key' });

    // Save branding settings with reset logo
    const { error: brandingError } = await supabase
      .from('app_settings')
      .upsert([{
        key: 'branding_settings',
        value: updatedBranding as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString()
      }] as any, { onConflict: 'key' });

    if (designError || brandingError) {
      toast({ title: 'Fehler', description: designError?.message || brandingError?.message, variant: 'destructive' });
    } else {
      toast({ title: 'Zurückgesetzt', description: 'Design und Logo wurden auf Standardwerte zurückgesetzt.' });
    }
  };

  const saveBrandingSettings = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from('app_settings')
      .upsert([{
        key: 'branding_settings',
        value: brandingSettings as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString()
      }] as any, { onConflict: 'key' });

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Gespeichert', description: 'Branding-Einstellungen wurden gespeichert. Die Änderungen sind auf der Bestellstrecke sofort sichtbar.' });
    }
    
    setSaving(false);
  };

  const resetBranding = async () => {
    setBrandingSettings(DEFAULT_BRANDING);
    
    const { error } = await supabase
      .from('app_settings')
      .upsert([{
        key: 'branding_settings',
        value: DEFAULT_BRANDING as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString()
      }] as any, { onConflict: 'key' });

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Zurückgesetzt', description: 'Branding wurde auf Standardwerte zurückgesetzt.' });
    }
  };

  const applyPreset = (presetId: string) => {
    const preset = DESIGN_PRESETS.find(p => p.id === presetId);
    if (preset) {
      const newSettings: DesignSettings = {
        ...designSettings,
        primary_hue: preset.primary.h,
        primary_saturation: preset.primary.s,
        primary_lightness: preset.primary.l,
        accent_hue: preset.accent.h,
        accent_saturation: preset.accent.s,
        accent_lightness: preset.accent.l,
        border_radius: preset.radius,
        preset: presetId,
      };
      setDesignSettings(newSettings);
      applyDesignSettings(newSettings);
    }
  };

  const unblockIP = async (id: string) => {
    const { error } = await supabase
      .from('rate_limits')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Entsperrt', description: 'IP wurde entsperrt.' });
      fetchRateLimits();
    }
  };

  const clearAllRateLimits = async () => {
    if (!confirm('Alle Rate-Limit-Einträge wirklich löschen?')) return;
    
    const { error } = await supabase
      .from('rate_limits')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Gelöscht', description: 'Alle Rate-Limit-Einträge wurden gelöscht.' });
      fetchRateLimits();
    }
  };

  const isBlocked = (entry: RateLimitEntry) => {
    if (!entry.blocked_until) return false;
    return new Date(entry.blocked_until) > new Date();
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'order_submission':
      case 'order':
        return 'Bestellung';
      case 'contact_form':
        return 'Kontaktformular';
      case 'admin_login':
      case 'login':
        return 'Login';
      case 'customer_login':
        return 'Kundenportal';
      default:
        return actionType;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Einstellungen</h2>
        <p className="text-muted-foreground">Verwalten Sie Design, E-Mail und Sicherheit</p>
      </div>

      <Tabs defaultValue="branding" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="design" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Farben
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            E-Mail
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Sicherheit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Branding & Texte
              </CardTitle>
              <CardDescription>
                Passen Sie Logo, Firmenname und Texte für die Bestellstrecke an
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Firmenname</Label>
                  <Input
                    id="company_name"
                    value={brandingSettings.company_name}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, company_name: e.target.value })}
                    placeholder="COM-IN"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo_url">Logo URL (leer = Text-Logo)</Label>
                  <Input
                    id="logo_url"
                    value={brandingSettings.logo_url}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                  {brandingSettings.logo_url && (
                    <div className="mt-2 p-2 bg-muted rounded flex items-center justify-center">
                      <img src={brandingSettings.logo_url} alt="Logo Vorschau" className="max-h-12" />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Willkommensseite</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="welcome_title">Überschrift</Label>
                    <Input
                      id="welcome_title"
                      value={brandingSettings.welcome_title}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, welcome_title: e.target.value })}
                      placeholder="Willkommen bei COM-IN"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="welcome_subtitle">Unterzeile</Label>
                    <Input
                      id="welcome_subtitle"
                      value={brandingSettings.welcome_subtitle}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, welcome_subtitle: e.target.value })}
                      placeholder="Glasfaser-Internet für Ingolstadt"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Header / Hotline</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hotline_number">Hotline Nummer</Label>
                    <Input
                      id="hotline_number"
                      value={brandingSettings.hotline_number}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, hotline_number: e.target.value })}
                      placeholder="+49 841 88511-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hotline_hours">Erreichbarkeit</Label>
                    <Input
                      id="hotline_hours"
                      value={brandingSettings.hotline_hours}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, hotline_hours: e.target.value })}
                      placeholder="Mo-Fr 8-18 Uhr"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Neukunde-Button</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_customer_title">Titel</Label>
                    <Input
                      id="new_customer_title"
                      value={brandingSettings.new_customer_title}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, new_customer_title: e.target.value })}
                      placeholder="Neukunde"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_customer_description">Beschreibung</Label>
                    <Textarea
                      id="new_customer_description"
                      value={brandingSettings.new_customer_description}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, new_customer_description: e.target.value })}
                      placeholder="Jetzt Verfügbarkeit prüfen..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Bestandskunde-Button</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="existing_customer_title">Titel</Label>
                    <Input
                      id="existing_customer_title"
                      value={brandingSettings.existing_customer_title}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, existing_customer_title: e.target.value })}
                      placeholder="Bestandskunde?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="existing_customer_description">Beschreibung</Label>
                    <Textarea
                      id="existing_customer_description"
                      value={brandingSettings.existing_customer_description}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, existing_customer_description: e.target.value })}
                      placeholder="Vertragsänderung, Umzug..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Kundentyp-Auswahl (PK/KMU)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_type_title">Überschrift</Label>
                    <Input
                      id="customer_type_title"
                      value={brandingSettings.customer_type_title || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, customer_type_title: e.target.value })}
                      placeholder="Sind Sie..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_type_subtitle">Unterüberschrift</Label>
                    <Input
                      id="customer_type_subtitle"
                      value={brandingSettings.customer_type_subtitle || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, customer_type_subtitle: e.target.value })}
                      placeholder="Wählen Sie Ihren Kundentyp"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="private_customer_title">Privatkunde Titel</Label>
                    <Input
                      id="private_customer_title"
                      value={brandingSettings.private_customer_title || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, private_customer_title: e.target.value })}
                      placeholder="Privatkunde"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="private_customer_description">Privatkunde Beschreibung</Label>
                    <Textarea
                      id="private_customer_description"
                      value={brandingSettings.private_customer_description || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, private_customer_description: e.target.value })}
                      placeholder="Internet für Ihr Zuhause"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business_customer_title">Geschäftskunde Titel</Label>
                    <Input
                      id="business_customer_title"
                      value={brandingSettings.business_customer_title || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, business_customer_title: e.target.value })}
                      placeholder="Geschäftskunde"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business_customer_description">Geschäftskunde Beschreibung</Label>
                    <Textarea
                      id="business_customer_description"
                      value={brandingSettings.business_customer_description || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, business_customer_description: e.target.value })}
                      placeholder="Business-Internet für Unternehmen"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Geschäftskunden-Auswahl (Seite)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_selection_title">Seitentitel</Label>
                    <Input
                      id="business_selection_title"
                      value={brandingSettings.business_selection_title || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, business_selection_title: e.target.value })}
                      placeholder="Geschäftskunden-Lösungen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business_selection_subtitle">Seitenuntertitel</Label>
                    <Input
                      id="business_selection_subtitle"
                      value={brandingSettings.business_selection_subtitle || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, business_selection_subtitle: e.target.value })}
                      placeholder="Wählen Sie die passende Lösung für Ihr Unternehmen"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">EasyBusiness Karte</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="easy_business_title">Titel</Label>
                    <Input
                      id="easy_business_title"
                      value={brandingSettings.easy_business_title || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, easy_business_title: e.target.value })}
                      placeholder="Business-Internet (EasyBusiness)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="easy_business_subtitle">Untertitel</Label>
                    <Input
                      id="easy_business_subtitle"
                      value={brandingSettings.easy_business_subtitle || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, easy_business_subtitle: e.target.value })}
                      placeholder="Klassischer Internetanschluss für Unternehmen"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="easy_business_feature_1">Feature 1</Label>
                    <Textarea
                      id="easy_business_feature_1"
                      value={brandingSettings.easy_business_feature_1 || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, easy_business_feature_1: e.target.value })}
                      placeholder="Asymmetrische Bandbreiten..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="easy_business_feature_2">Feature 2</Label>
                    <Input
                      id="easy_business_feature_2"
                      value={brandingSettings.easy_business_feature_2 || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, easy_business_feature_2: e.target.value })}
                      placeholder="Bessere Service-Level als bei Privatkunden"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="easy_business_feature_3">Feature 3</Label>
                    <Input
                      id="easy_business_feature_3"
                      value={brandingSettings.easy_business_feature_3 || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, easy_business_feature_3: e.target.value })}
                      placeholder="Erweiterte Telefonie-Optionen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="easy_business_feature_4">Feature 4</Label>
                    <Input
                      id="easy_business_feature_4"
                      value={brandingSettings.easy_business_feature_4 || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, easy_business_feature_4: e.target.value })}
                      placeholder="Direkt online bestellbar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="easy_business_ideal">Ideal für... (Fußzeile)</Label>
                    <Textarea
                      id="easy_business_ideal"
                      value={brandingSettings.easy_business_ideal || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, easy_business_ideal: e.target.value })}
                      placeholder="Ideal für Büros, Praxen, Handel..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="easy_business_button">Button Text</Label>
                    <Input
                      id="easy_business_button"
                      value={brandingSettings.easy_business_button || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, easy_business_button: e.target.value })}
                      placeholder="Jetzt online bestellen"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Individuelle Unternehmenslösungen Karte</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="individual_solutions_title">Titel</Label>
                    <Input
                      id="individual_solutions_title"
                      value={brandingSettings.individual_solutions_title || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, individual_solutions_title: e.target.value })}
                      placeholder="Individuelle Unternehmenslösungen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="individual_solutions_subtitle">Untertitel</Label>
                    <Input
                      id="individual_solutions_subtitle"
                      value={brandingSettings.individual_solutions_subtitle || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, individual_solutions_subtitle: e.target.value })}
                      placeholder="(D-Dienste & Dark Fiber)"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="individual_feature_1">Feature 1</Label>
                    <Input
                      id="individual_feature_1"
                      value={brandingSettings.individual_feature_1 || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, individual_feature_1: e.target.value })}
                      placeholder="Garantierte und symmetrische Bandbreiten"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="individual_feature_2">Feature 2</Label>
                    <Input
                      id="individual_feature_2"
                      value={brandingSettings.individual_feature_2 || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, individual_feature_2: e.target.value })}
                      placeholder="Feste Bandbreiten von 10 Mbit/s bis 100 Gbit/s"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="individual_feature_3">Feature 3</Label>
                    <Input
                      id="individual_feature_3"
                      value={brandingSettings.individual_feature_3 || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, individual_feature_3: e.target.value })}
                      placeholder="Standortvernetzung & Rechenzentrumsanbindung"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="individual_feature_4">Feature 4</Label>
                    <Input
                      id="individual_feature_4"
                      value={brandingSettings.individual_feature_4 || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, individual_feature_4: e.target.value })}
                      placeholder="Redundante Zuführung möglich"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="individual_feature_5">Feature 5</Label>
                    <Input
                      id="individual_feature_5"
                      value={brandingSettings.individual_feature_5 || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, individual_feature_5: e.target.value })}
                      placeholder="Professionelle Service-Level-Agreements"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="individual_feature_6">Feature 6</Label>
                    <Input
                      id="individual_feature_6"
                      value={brandingSettings.individual_feature_6 || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, individual_feature_6: e.target.value })}
                      placeholder='19" Router (z. B. Cisco, Juniper) inklusive'
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="individual_feature_7">Feature 7</Label>
                    <Input
                      id="individual_feature_7"
                      value={brandingSettings.individual_feature_7 || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, individual_feature_7: e.target.value })}
                      placeholder="Feste, öffentliche IP-Adressen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="individual_feature_8">Feature 8</Label>
                    <Input
                      id="individual_feature_8"
                      value={brandingSettings.individual_feature_8 || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, individual_feature_8: e.target.value })}
                      placeholder="Kurzfristig upgradebar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="individual_button">Button Text</Label>
                    <Input
                      id="individual_button"
                      value={brandingSettings.individual_button || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, individual_button: e.target.value })}
                      placeholder="Jetzt beraten lassen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="individual_footer">Fußzeile</Label>
                    <Input
                      id="individual_footer"
                      value={brandingSettings.individual_footer || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, individual_footer: e.target.value })}
                      placeholder="(keine Online-Bestellung, individuelle Planung)"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">KMU Preishinweis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kmu_netto_hint">NETTO-Hinweis im Warenkorb</Label>
                    <Input
                      id="kmu_netto_hint"
                      value={brandingSettings.kmu_netto_hint || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, kmu_netto_hint: e.target.value })}
                      placeholder="Alle Preise verstehen sich zzgl. MwSt."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kmu_cart_netto_label">Warenkorb Preislabel (KMU)</Label>
                    <Input
                      id="kmu_cart_netto_label"
                      value={brandingSettings.kmu_cart_netto_label || ''}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, kmu_cart_netto_label: e.target.value })}
                      placeholder="Alle Preise zzgl. MwSt."
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Standard-Installation Info (Bestellstrecke)</h4>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="installation_info_enabled" className="text-sm">Anzeigen</Label>
                    <Switch
                      id="installation_info_enabled"
                      checked={brandingSettings.installation_info_enabled ?? true}
                      onCheckedChange={(checked) => setBrandingSettings({ ...brandingSettings, installation_info_enabled: checked })}
                    />
                  </div>
                </div>
                
                {brandingSettings.installation_info_enabled !== false && (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="installation_info_title">Titel</Label>
                      <Input
                        id="installation_info_title"
                        value={brandingSettings.installation_info_title || ''}
                        onChange={(e) => setBrandingSettings({ ...brandingSettings, installation_info_title: e.target.value })}
                        placeholder="Bereitstellung inkl. Einrichtungspauschale"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="installation_info_intro">Einleitungstext</Label>
                      <Textarea
                        id="installation_info_intro"
                        value={brandingSettings.installation_info_intro || ''}
                        onChange={(e) => setBrandingSettings({ ...brandingSettings, installation_info_intro: e.target.value })}
                        placeholder="In der Bereitstellungspauschale ist die Standardinstallation durch unsere Glasfaserprofis enthalten:"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="installation_info_efh">Einfamilienhäuser (EFH)</Label>
                      <Textarea
                        id="installation_info_efh"
                        value={brandingSettings.installation_info_efh || ''}
                        onChange={(e) => setBrandingSettings({ ...brandingSettings, installation_info_efh: e.target.value })}
                        placeholder="Im 3m Radius um den APL wird der Medienkonverter (ONT...) montiert."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="installation_info_mfh">Mehrfamilienhäuser (MFH)</Label>
                      <Textarea
                        id="installation_info_mfh"
                        value={brandingSettings.installation_info_mfh || ''}
                        onChange={(e) => setBrandingSettings({ ...brandingSettings, installation_info_mfh: e.target.value })}
                        placeholder="Im 3m Radius um die Wohnungseinführung wird das ONT... montiert."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="installation_info_additional">Zusätzlich enthalten</Label>
                      <Textarea
                        id="installation_info_additional"
                        value={brandingSettings.installation_info_additional || ''}
                        onChange={(e) => setBrandingSettings({ ...brandingSettings, installation_info_additional: e.target.value })}
                        placeholder="Provisionierung, ACS-Router, Speedtest, TV-Sendersuchlauf..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="installation_info_services_title">Überschrift für weitere Services</Label>
                      <Input
                        id="installation_info_services_title"
                        value={brandingSettings.installation_info_services_title || ''}
                        onChange={(e) => setBrandingSettings({ ...brandingSettings, installation_info_services_title: e.target.value })}
                        placeholder="Darüber hinaus bieten wir folgende Services:"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={resetBranding}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Auf Standard zurücksetzen
                </Button>
                <Button onClick={saveBrandingSettings} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                E-Mail Server Konfiguration
              </CardTitle>
              <CardDescription>
                Konfigurieren Sie den SMTP-Server für den E-Mail-Versand (z.B. Bestellbestätigungen)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sender_name">Absender Name</Label>
                  <Input
                    id="sender_name"
                    value={emailSettings.sender_name}
                    onChange={(e) => setEmailSettings({ ...emailSettings, sender_name: e.target.value })}
                    placeholder="COM-IN Glasfaser"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sender_email">Absender E-Mail</Label>
                  <Input
                    id="sender_email"
                    type="email"
                    value={emailSettings.sender_email}
                    onChange={(e) => setEmailSettings({ ...emailSettings, sender_email: e.target.value })}
                    placeholder="info@example.de"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP Server</Label>
                  <Input
                    id="smtp_host"
                    value={emailSettings.smtp_host}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })}
                    placeholder="smtp.ionos.de"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">SMTP Port (SSL)</Label>
                  <Input
                    id="smtp_port"
                    value={emailSettings.smtp_port}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_port: e.target.value })}
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">Benutzername</Label>
                  <Input
                    id="smtp_user"
                    value={emailSettings.smtp_user}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_user: e.target.value })}
                    placeholder="info@example.de"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_password">Passwort</Label>
                  <div className="relative">
                    <Input
                      id="smtp_password"
                      type={showPassword ? 'text' : 'password'}
                      value={emailSettings.smtp_password}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtp_password: e.target.value })}
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Fallback bei fehlenden K7-Daten
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="fallback_order_email">Fallback E-Mail-Adresse</Label>
                  <Input
                    id="fallback_order_email"
                    type="email"
                    value={emailSettings.fallback_order_email}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fallback_order_email: e.target.value })}
                    placeholder="samuel.wunderle@comin-glasfaser.de"
                  />
                  <p className="text-xs text-muted-foreground">
                    An diese Adresse werden Bestellungen gesendet, wenn K7-IDs für die XML-Generierung fehlen.
                    Der Kunde erhält weiterhin seine normale Bestätigung.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={saveEmailSettings} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Design Einstellungen
              </CardTitle>
              <CardDescription>
                Passen Sie das Erscheinungsbild der Website an
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload Section */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Header Logo
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Laden Sie ein eigenes Logo hoch, das im Header der Bestellstrecke angezeigt wird.
                </p>
                <div className="max-w-md">
                  <ImageUpload
                    value={brandingSettings.logo_url}
                    onChange={(url) => setBrandingSettings({ ...brandingSettings, logo_url: url })}
                    bucket="admin-uploads"
                    folder="logos"
                  />
                </div>
                {brandingSettings.logo_url && (
                  <div className="mt-3 p-3 bg-primary rounded-lg flex items-center gap-4">
                    <span className="text-xs text-primary-foreground/70">Vorschau im Header:</span>
                    <img 
                      src={brandingSettings.logo_url} 
                      alt="Logo Vorschau" 
                      className="h-10 max-w-[200px] object-contain"
                    />
                  </div>
                )}
                {!brandingSettings.logo_url && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Ohne Logo wird der Firmenname "{brandingSettings.company_name}" als Text angezeigt.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Design-Vorlage</Label>
                <Select value={designSettings.preset} onValueChange={applyPreset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vorlage auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGN_PRESETS.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: `hsl(${preset.primary.h}, ${preset.primary.s}%, ${preset.primary.l}%)` }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: `hsl(${preset.accent.h}, ${preset.accent.s}%, ${preset.accent.l}%)` }}
                          />
                          {preset.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: `hsl(${designSettings.primary_hue}, ${designSettings.primary_saturation}%, ${designSettings.primary_lightness}%)` }}
                    />
                    Primärfarbe
                  </h4>
                  <div className="space-y-2">
                    <Label>Farbton (Hue): {designSettings.primary_hue}°</Label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={designSettings.primary_hue}
                      onChange={(e) => {
                        const newSettings = { ...designSettings, primary_hue: e.target.value, preset: 'custom' };
                        setDesignSettings(newSettings);
                        applyDesignSettings(newSettings);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sättigung: {designSettings.primary_saturation}%</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={designSettings.primary_saturation}
                      onChange={(e) => {
                        const newSettings = { ...designSettings, primary_saturation: e.target.value, preset: 'custom' };
                        setDesignSettings(newSettings);
                        applyDesignSettings(newSettings);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Helligkeit: {designSettings.primary_lightness}%</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={designSettings.primary_lightness}
                      onChange={(e) => {
                        const newSettings = { ...designSettings, primary_lightness: e.target.value, preset: 'custom' };
                        setDesignSettings(newSettings);
                        applyDesignSettings(newSettings);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: `hsl(${designSettings.accent_hue}, ${designSettings.accent_saturation}%, ${designSettings.accent_lightness}%)` }}
                    />
                    Akzentfarbe
                  </h4>
                  <div className="space-y-2">
                    <Label>Farbton (Hue): {designSettings.accent_hue}°</Label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={designSettings.accent_hue}
                      onChange={(e) => {
                        const newSettings = { ...designSettings, accent_hue: e.target.value, preset: 'custom' };
                        setDesignSettings(newSettings);
                        applyDesignSettings(newSettings);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sättigung: {designSettings.accent_saturation}%</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={designSettings.accent_saturation}
                      onChange={(e) => {
                        const newSettings = { ...designSettings, accent_saturation: e.target.value, preset: 'custom' };
                        setDesignSettings(newSettings);
                        applyDesignSettings(newSettings);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Helligkeit: {designSettings.accent_lightness}%</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={designSettings.accent_lightness}
                      onChange={(e) => {
                        const newSettings = { ...designSettings, accent_lightness: e.target.value, preset: 'custom' };
                        setDesignSettings(newSettings);
                        applyDesignSettings(newSettings);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Border Radius: {designSettings.border_radius}rem</Label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.25"
                  value={designSettings.border_radius}
                  onChange={(e) => {
                    const newSettings = { ...designSettings, border_radius: e.target.value, preset: 'custom' };
                    setDesignSettings(newSettings);
                    applyDesignSettings(newSettings);
                  }}
                  className="w-full"
                />
              </div>

              {/* Dark Mode Settings */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  🌙 Dark Mode Farben
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Diese Farben werden im dunklen Modus verwendet. User können zwischen Hell und Dunkel wechseln.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: `hsl(${designSettings.dark_primary_hue}, ${designSettings.dark_primary_saturation}%, ${designSettings.dark_primary_lightness}%)` }}
                      />
                      Dark Primärfarbe
                    </h4>
                    <div className="space-y-2">
                      <Label>Farbton (Hue): {designSettings.dark_primary_hue}°</Label>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={designSettings.dark_primary_hue}
                        onChange={(e) => {
                          const newSettings = { ...designSettings, dark_primary_hue: e.target.value, preset: 'custom' };
                          setDesignSettings(newSettings);
                        }}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sättigung: {designSettings.dark_primary_saturation}%</Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={designSettings.dark_primary_saturation}
                        onChange={(e) => {
                          const newSettings = { ...designSettings, dark_primary_saturation: e.target.value, preset: 'custom' };
                          setDesignSettings(newSettings);
                        }}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Helligkeit: {designSettings.dark_primary_lightness}%</Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={designSettings.dark_primary_lightness}
                        onChange={(e) => {
                          const newSettings = { ...designSettings, dark_primary_lightness: e.target.value, preset: 'custom' };
                          setDesignSettings(newSettings);
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: `hsl(${designSettings.dark_accent_hue}, ${designSettings.dark_accent_saturation}%, ${designSettings.dark_accent_lightness}%)` }}
                      />
                      Dark Akzentfarbe
                    </h4>
                    <div className="space-y-2">
                      <Label>Farbton (Hue): {designSettings.dark_accent_hue}°</Label>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={designSettings.dark_accent_hue}
                        onChange={(e) => {
                          const newSettings = { ...designSettings, dark_accent_hue: e.target.value, preset: 'custom' };
                          setDesignSettings(newSettings);
                        }}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sättigung: {designSettings.dark_accent_saturation}%</Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={designSettings.dark_accent_saturation}
                        onChange={(e) => {
                          const newSettings = { ...designSettings, dark_accent_saturation: e.target.value, preset: 'custom' };
                          setDesignSettings(newSettings);
                        }}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Helligkeit: {designSettings.dark_accent_lightness}%</Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={designSettings.dark_accent_lightness}
                        onChange={(e) => {
                          const newSettings = { ...designSettings, dark_accent_lightness: e.target.value, preset: 'custom' };
                          setDesignSettings(newSettings);
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={resetDesign}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Auf Standard zurücksetzen
                </Button>
                <Button onClick={saveDesignSettings} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Rate-Limit Einstellungen
                </CardTitle>
                <CardDescription>
                  Konfigurieren Sie wie oft IPs Aktionen ausführen dürfen bevor sie gesperrt werden
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Rate-Limiting aktiviert</Label>
                    <p className="text-sm text-muted-foreground">Schützt vor Spam und Brute-Force-Angriffen</p>
                  </div>
                  <Switch
                    checked={rateLimitSettings.enabled}
                    onCheckedChange={(checked) => setRateLimitSettings({ ...rateLimitSettings, enabled: checked })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Bestellungen */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Bestellungen</h4>
                    <div className="space-y-2">
                      <Label>Max. Versuche</Label>
                      <Input
                        type="number"
                        min="1"
                        value={rateLimitSettings.order_max_attempts}
                        onChange={(e) => setRateLimitSettings({ ...rateLimitSettings, order_max_attempts: parseInt(e.target.value) || 3 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Zeitfenster (Min.)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={rateLimitSettings.order_window_minutes}
                        onChange={(e) => setRateLimitSettings({ ...rateLimitSettings, order_window_minutes: parseInt(e.target.value) || 60 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sperrzeit (Min.)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={rateLimitSettings.order_block_minutes}
                        onChange={(e) => setRateLimitSettings({ ...rateLimitSettings, order_block_minutes: parseInt(e.target.value) || 60 })}
                      />
                    </div>
                  </div>

                  {/* Kontaktformular */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Kontaktformular</h4>
                    <div className="space-y-2">
                      <Label>Max. Versuche</Label>
                      <Input
                        type="number"
                        min="1"
                        value={rateLimitSettings.contact_max_attempts}
                        onChange={(e) => setRateLimitSettings({ ...rateLimitSettings, contact_max_attempts: parseInt(e.target.value) || 5 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Zeitfenster (Min.)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={rateLimitSettings.contact_window_minutes}
                        onChange={(e) => setRateLimitSettings({ ...rateLimitSettings, contact_window_minutes: parseInt(e.target.value) || 30 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sperrzeit (Min.)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={rateLimitSettings.contact_block_minutes}
                        onChange={(e) => setRateLimitSettings({ ...rateLimitSettings, contact_block_minutes: parseInt(e.target.value) || 30 })}
                      />
                    </div>
                  </div>

                  {/* Login */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Login-Versuche</h4>
                    <div className="space-y-2">
                      <Label>Max. Versuche</Label>
                      <Input
                        type="number"
                        min="1"
                        value={rateLimitSettings.login_max_attempts}
                        onChange={(e) => setRateLimitSettings({ ...rateLimitSettings, login_max_attempts: parseInt(e.target.value) || 5 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Zeitfenster (Min.)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={rateLimitSettings.login_window_minutes}
                        onChange={(e) => setRateLimitSettings({ ...rateLimitSettings, login_window_minutes: parseInt(e.target.value) || 15 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sperrzeit (Min.)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={rateLimitSettings.login_block_minutes}
                        onChange={(e) => setRateLimitSettings({ ...rateLimitSettings, login_block_minutes: parseInt(e.target.value) || 30 })}
                      />
                    </div>
                  </div>
                </div>

                {/* IP Whitelist */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      IP-Whitelist
                    </h4>
                    <p className="text-sm text-muted-foreground">IPs die Rate-Limits umgehen dürfen</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="z.B. 192.168.1.100"
                        id="new-whitelist-ip"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            const ip = input.value.trim();
                            if (ip && !rateLimitSettings.ip_whitelist.includes(ip)) {
                              setRateLimitSettings({
                                ...rateLimitSettings,
                                ip_whitelist: [...rateLimitSettings.ip_whitelist, ip]
                              });
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const input = document.getElementById('new-whitelist-ip') as HTMLInputElement;
                          const ip = input?.value.trim();
                          if (ip && !rateLimitSettings.ip_whitelist.includes(ip)) {
                            setRateLimitSettings({
                              ...rateLimitSettings,
                              ip_whitelist: [...rateLimitSettings.ip_whitelist, ip]
                            });
                            input.value = '';
                          }
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {rateLimitSettings.ip_whitelist.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rateLimitSettings.ip_whitelist.map((ip, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {ip}
                            <button
                              onClick={() => setRateLimitSettings({
                                ...rateLimitSettings,
                                ip_whitelist: rateLimitSettings.ip_whitelist.filter((_, i) => i !== index)
                              })}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Keine IPs auf der Whitelist</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button onClick={saveRateLimitSettings} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Speichern
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Aktive Rate-Limits / Gesperrte IPs
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchRateLimits}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Aktualisieren
                    </Button>
                    <Button variant="destructive" size="sm" onClick={clearAllRateLimits}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Alle löschen
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Übersicht aller IPs mit Rate-Limit-Einträgen
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRateLimits ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : rateLimitEntries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine Rate-Limit-Einträge vorhanden
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP-Adresse</TableHead>
                        <TableHead>Aktion</TableHead>
                        <TableHead>Versuche</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Letzter Versuch</TableHead>
                        <TableHead>Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rateLimitEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono">{entry.ip_address}</TableCell>
                          <TableCell>{getActionLabel(entry.action_type)}</TableCell>
                          <TableCell>{entry.attempts}</TableCell>
                          <TableCell>
                            {isBlocked(entry) ? (
                              <Badge variant="destructive">
                                Gesperrt bis {format(new Date(entry.blocked_until!), 'HH:mm', { locale: de })}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Aktiv</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(entry.last_attempt_at), 'dd.MM.yy HH:mm', { locale: de })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unblockIP(entry.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
