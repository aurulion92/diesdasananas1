import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Loader2,
  Settings,
  RefreshCw,
  Pencil
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProductOption {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  monthly_price: number;
  one_time_price: number;
  is_ftth: boolean;
  is_fttb: boolean;
  is_active: boolean;
  display_order: number;
  requires_kabel_tv: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'router', label: 'Router' },
  { value: 'phone', label: 'Telefon' },
  { value: 'tv_comin', label: 'COM-IN TV' },
  { value: 'tv_waipu', label: 'waipu.tv' },
  { value: 'tv_hardware', label: 'TV Hardware' },
];

export const OptionsManager = () => {
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ProductOption | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'router',
    monthly_price: 0,
    one_time_price: 0,
    is_ftth: true,
    is_fttb: true,
    is_active: true,
    display_order: 0,
    requires_kabel_tv: false,
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_options')
        .select('*')
        .order('category', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setOptions((data as ProductOption[]) || []);
    } catch (error) {
      console.error('Error fetching options:', error);
      toast({
        title: 'Fehler',
        description: 'Optionen konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const optionData = {
        ...formData,
        description: formData.description || null,
      };

      if (editingOption) {
        const { error } = await supabase
          .from('product_options')
          .update(optionData)
          .eq('id', editingOption.id);
        
        if (error) throw error;
        toast({ title: 'Erfolg', description: 'Option wurde aktualisiert.' });
      } else {
        const { error } = await supabase
          .from('product_options')
          .insert([optionData]);
        
        if (error) throw error;
        toast({ title: 'Erfolg', description: 'Option wurde erstellt.' });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchOptions();
    } catch (error: any) {
      console.error('Error saving option:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Option konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      category: 'router',
      monthly_price: 0,
      one_time_price: 0,
      is_ftth: true,
      is_fttb: true,
      is_active: true,
      display_order: 0,
      requires_kabel_tv: false,
    });
    setEditingOption(null);
  };

  const openEditDialog = (option: ProductOption) => {
    setEditingOption(option);
    setFormData({
      name: option.name,
      slug: option.slug,
      description: option.description || '',
      category: option.category,
      monthly_price: option.monthly_price,
      one_time_price: option.one_time_price,
      is_ftth: option.is_ftth,
      is_fttb: option.is_fttb,
      is_active: option.is_active,
      display_order: option.display_order,
      requires_kabel_tv: option.requires_kabel_tv,
    });
    setIsDialogOpen(true);
  };

  const toggleActive = async (option: ProductOption) => {
    try {
      const { error } = await supabase
        .from('product_options')
        .update({ is_active: !option.is_active })
        .eq('id', option.id);
      
      if (error) throw error;
      fetchOptions();
    } catch (error) {
      console.error('Error toggling option:', error);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const filteredOptions = filterCategory === 'all' 
    ? options 
    : options.filter(o => o.category === filterCategory);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Optionen
            </CardTitle>
            <CardDescription>
              Verwalten Sie Hardware, TV und Telefon-Optionen.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Alle Kategorien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchOptions}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Aktualisieren
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Neu
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingOption ? 'Option bearbeiten' : 'Neue Option'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingOption ? 'Bearbeiten Sie die Option.' : 'Fügen Sie eine neue Option hinzu.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setFormData({
                            ...formData, 
                            name,
                            slug: formData.slug || generateSlug(name)
                          });
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug *</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({...formData, slug: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Kategorie *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({...formData, category: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="display_order">Anzeigereihenfolge</Label>
                      <Input
                        id="display_order"
                        type="number"
                        value={formData.display_order}
                        onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Beschreibung</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthly_price">Monatspreis (€)</Label>
                      <Input
                        id="monthly_price"
                        type="number"
                        step="0.01"
                        value={formData.monthly_price}
                        onChange={(e) => setFormData({...formData, monthly_price: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="one_time_price">Einmalpreis (€)</Label>
                      <Input
                        id="one_time_price"
                        type="number"
                        step="0.01"
                        value={formData.one_time_price}
                        onChange={(e) => setFormData({...formData, one_time_price: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Verfügbarkeit & Optionen</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="is_ftth">FTTH verfügbar</Label>
                        <Switch
                          id="is_ftth"
                          checked={formData.is_ftth}
                          onCheckedChange={(checked) => setFormData({...formData, is_ftth: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="is_fttb">FTTB verfügbar</Label>
                        <Switch
                          id="is_fttb"
                          checked={formData.is_fttb}
                          onCheckedChange={(checked) => setFormData({...formData, is_fttb: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="requires_kabel_tv">Benötigt Kabel TV</Label>
                        <Switch
                          id="requires_kabel_tv"
                          checked={formData.requires_kabel_tv}
                          onCheckedChange={(checked) => setFormData({...formData, requires_kabel_tv: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="is_active">Aktiv</Label>
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button type="submit">
                      {editingOption ? 'Speichern' : 'Erstellen'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Option</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Preis</TableHead>
                  <TableHead>Verfügbarkeit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Keine Optionen gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOptions.map((option) => (
                    <TableRow key={option.id} className={!option.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{option.name}</span>
                          {option.requires_kabel_tv && (
                            <Badge variant="outline" className="ml-2 text-xs">Kabel TV</Badge>
                          )}
                          <br />
                          <span className="text-xs text-muted-foreground">{option.slug}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getCategoryLabel(option.category)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {option.monthly_price > 0 && (
                            <div>{option.monthly_price.toFixed(2)} €/Monat</div>
                          )}
                          {option.one_time_price > 0 && (
                            <div className="text-muted-foreground">{option.one_time_price.toFixed(2)} € einmalig</div>
                          )}
                          {option.monthly_price === 0 && option.one_time_price === 0 && '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {option.is_ftth && <Badge variant="default">FTTH</Badge>}
                          {option.is_fttb && <Badge variant="secondary">FTTB</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={option.is_active}
                          onCheckedChange={() => toggleActive(option)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(option)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
