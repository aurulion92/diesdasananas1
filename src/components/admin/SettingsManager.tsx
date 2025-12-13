import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Palette, Mail, RotateCcw, Save, Eye, EyeOff, Shield, Trash2, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface EmailSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  sender_email: string;
  sender_name: string;
  use_ssl: boolean;
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
};

export const SettingsManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(DEFAULT_EMAIL);
  const [designSettings, setDesignSettings] = useState<DesignSettings>(DEFAULT_DESIGN);
  const [rateLimitSettings, setRateLimitSettings] = useState<RateLimitSettings>(DEFAULT_RATE_LIMIT);
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
    
    const { error } = await supabase
      .from('app_settings')
      .upsert([{
        key: 'design_settings',
        value: designSettings as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString()
      }] as any, { onConflict: 'key' });

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      applyDesignSettings(designSettings);
      toast({ title: 'Gespeichert', description: 'Design-Einstellungen wurden gespeichert.' });
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
    
    const { error } = await supabase
      .from('app_settings')
      .upsert([{
        key: 'design_settings',
        value: DEFAULT_DESIGN as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString()
      }] as any, { onConflict: 'key' });

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Zurückgesetzt', description: 'Design wurde auf Standardwerte zurückgesetzt.' });
    }
  };

  const applyPreset = (presetId: string) => {
    const preset = DESIGN_PRESETS.find(p => p.id === presetId);
    if (preset) {
      const newSettings: DesignSettings = {
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

      <Tabs defaultValue="email" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            E-Mail Server
          </TabsTrigger>
          <TabsTrigger value="design" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Design
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Rate-Limit / Sicherheit
          </TabsTrigger>
        </TabsList>

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
