import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Phone, GripVertical, AlertCircle } from 'lucide-react';

interface PortingProvider {
  id: string;
  name: string;
  display_name: string;
  provider_code: string | null;
  is_other: boolean;
  is_active: boolean;
  display_order: number;
}

export const PortingProvidersManager = () => {
  const [providers, setProviders] = useState<PortingProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<PortingProvider | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    provider_code: '',
    is_other: false,
    is_active: true,
    display_order: 0,
  });

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('phone_porting_providers')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setProviders(data || []);
    } catch (err) {
      console.error('Error fetching providers:', err);
      toast.error('Fehler beim Laden der Anbieter');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleOpenDialog = (provider?: PortingProvider) => {
    if (provider) {
      setEditingProvider(provider);
      setFormData({
        name: provider.name,
        display_name: provider.display_name,
        provider_code: provider.provider_code || '',
        is_other: provider.is_other,
        is_active: provider.is_active,
        display_order: provider.display_order,
      });
    } else {
      setEditingProvider(null);
      setFormData({
        name: '',
        display_name: '',
        provider_code: '',
        is_other: false,
        is_active: true,
        display_order: providers.length + 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.display_name) {
      toast.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    try {
      if (editingProvider) {
        const { error } = await supabase
          .from('phone_porting_providers')
          .update({
            name: formData.name,
            display_name: formData.display_name,
            provider_code: formData.provider_code || null,
            is_other: formData.is_other,
            is_active: formData.is_active,
            display_order: formData.display_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingProvider.id);

        if (error) throw error;
        toast.success('Anbieter aktualisiert');
      } else {
        const { error } = await supabase
          .from('phone_porting_providers')
          .insert({
            name: formData.name,
            display_name: formData.display_name,
            provider_code: formData.provider_code || null,
            is_other: formData.is_other,
            is_active: formData.is_active,
            display_order: formData.display_order,
          });

        if (error) throw error;
        toast.success('Anbieter erstellt');
      }

      setIsDialogOpen(false);
      fetchProviders();
    } catch (err) {
      console.error('Error saving provider:', err);
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Anbieter wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('phone_porting_providers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Anbieter gelöscht');
      fetchProviders();
    } catch (err) {
      console.error('Error deleting provider:', err);
      toast.error('Fehler beim Löschen');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('phone_porting_providers')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success(isActive ? 'Anbieter aktiviert' : 'Anbieter deaktiviert');
      fetchProviders();
    } catch (err) {
      console.error('Error toggling provider:', err);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Laden...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Portierungs-Anbieter
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Neuer Anbieter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? 'Anbieter bearbeiten' : 'Neuer Anbieter'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Vollständiger Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Telekom Deutschland GmbH"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Interner Name für die Verwaltung
                </p>
              </div>

              <div>
                <Label>Anzeigename *</Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="z.B. Telekom"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Wird dem Kunden im Dropdown angezeigt
                </p>
              </div>

              <div>
                <Label>Anbieter-Code</Label>
                <Input
                  value={formData.provider_code}
                  onChange={(e) => setFormData({ ...formData, provider_code: e.target.value })}
                  placeholder="z.B. 2 D001"
                  className="mt-1.5 font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Interner Code für die Portierung (wird dem Kunden nicht angezeigt)
                </p>
              </div>

              <div>
                <Label>Anzeigereihenfolge</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="mt-1.5"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is-other">"Sonstige" (Freitext-Eingabe)</Label>
                <Switch
                  id="is-other"
                  checked={formData.is_other}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_other: checked })}
                />
              </div>
              {formData.is_other && (
                <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Bei Auswahl dieses Anbieters wird ein Freitext-Feld für manuelle Eingabe angezeigt.
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="is-active">Aktiv</Label>
                <Switch
                  id="is-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleSave}>
                  Speichern
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Anzeigename</TableHead>
              <TableHead>Vollständiger Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="w-24">Aktiv</TableHead>
              <TableHead className="w-24">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider, index) => (
              <TableRow key={provider.id} className={!provider.is_active ? 'opacity-50' : ''}>
                <TableCell className="font-mono text-muted-foreground">
                  {provider.display_order}
                </TableCell>
                <TableCell className="font-medium">
                  {provider.display_name}
                  {provider.is_other && (
                    <span className="ml-2 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                      Freitext
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {provider.name}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {provider.provider_code || '-'}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={provider.is_active}
                    onCheckedChange={(checked) => handleToggleActive(provider.id, checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(provider)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(provider.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {providers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Keine Anbieter vorhanden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
