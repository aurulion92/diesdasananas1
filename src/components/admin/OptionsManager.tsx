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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Loader2,
  Settings,
  RefreshCw,
  Pencil,
  Link,
  AlertTriangle,
  Building2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OptionBuildingAssignment } from './OptionBuildingAssignment';

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
  parent_option_slug: string[] | null;
  auto_include_option_slug: string[] | null;
  exclusive_group: string | null;
  info_text: string | null;
  image_url: string | null;
  external_link_url: string | null;
  external_link_label: string | null;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface ProductMapping {
  product_id: string;
  option_id_k7: string;
  is_included: boolean;
  discount_amount: number;
}

const CATEGORIES = [
  { value: 'router', label: 'Router' },
  { value: 'phone', label: 'Telefon' },
  { value: 'tv_comin', label: 'COM-IN TV' },
  { value: 'tv_waipu', label: 'waipu.tv' },
  { value: 'tv_hardware', label: 'TV Hardware' },
  { value: 'service', label: 'Service-Leistungen' },
];

export const OptionsManager = () => {
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
  const [isBuildingDialogOpen, setIsBuildingDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ProductOption | null>(null);
  const [selectedOptionForMapping, setSelectedOptionForMapping] = useState<ProductOption | null>(null);
  const [selectedOptionForBuildings, setSelectedOptionForBuildings] = useState<ProductOption | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [productMappings, setProductMappings] = useState<Record<string, ProductMapping>>({});
  const [optionMappingsCount, setOptionMappingsCount] = useState<Record<string, number>>({});
  const [optionBuildingsCount, setOptionBuildingsCount] = useState<Record<string, number>>({});
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
    parent_option_slugs: [] as string[],
    auto_include_option_slugs: [] as string[],
    exclusive_group: '',
    info_text: '',
    image_url: '',
    external_link_url: '',
    external_link_label: '',
  });

  useEffect(() => {
    fetchOptions();
    fetchProducts();
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
      
      // Fetch mapping counts for each option
      const { data: mappings, error: mappingsError } = await supabase
        .from('product_option_mappings')
        .select('option_id');
      
      if (!mappingsError && mappings) {
        const counts: Record<string, number> = {};
        mappings.forEach((m: { option_id: string }) => {
          counts[m.option_id] = (counts[m.option_id] || 0) + 1;
        });
        setOptionMappingsCount(counts);
      }

      // Fetch building assignment counts for each option
      const { data: buildingAssignments, error: buildingsError } = await supabase
        .from('option_buildings')
        .select('option_id');
      
      if (!buildingsError && buildingAssignments) {
        const buildingCounts: Record<string, number> = {};
        buildingAssignments.forEach((b: { option_id: string }) => {
          buildingCounts[b.option_id] = (buildingCounts[b.option_id] || 0) + 1;
        });
        setOptionBuildingsCount(buildingCounts);
      }
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

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setProducts((data as Product[]) || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchOptionMappings = async (optionId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_option_mappings')
        .select('*')
        .eq('option_id', optionId);

      if (error) throw error;
      
      const mappingsMap: Record<string, ProductMapping> = {};
      (data || []).forEach((mapping: any) => {
        mappingsMap[mapping.product_id] = {
          product_id: mapping.product_id,
          option_id_k7: mapping.option_id_k7 || '',
          is_included: mapping.is_included || false,
          discount_amount: mapping.discount_amount || 0,
        };
      });
      setProductMappings(mappingsMap);
    } catch (error) {
      console.error('Error fetching mappings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const optionData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        category: formData.category,
        monthly_price: formData.monthly_price,
        one_time_price: formData.one_time_price,
        is_ftth: formData.is_ftth,
        is_fttb: formData.is_fttb,
        is_active: formData.is_active,
        display_order: formData.display_order,
        requires_kabel_tv: formData.requires_kabel_tv,
        parent_option_slug: formData.parent_option_slugs.length > 0 ? formData.parent_option_slugs : null,
        auto_include_option_slug: formData.auto_include_option_slugs.length > 0 ? formData.auto_include_option_slugs : null,
        exclusive_group: formData.exclusive_group || null,
        info_text: formData.info_text || null,
        image_url: formData.image_url || null,
        external_link_url: formData.external_link_url || null,
        external_link_label: formData.external_link_label || null,
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

  const handleSaveMappings = async () => {
    if (!selectedOptionForMapping) return;

    try {
      // Delete existing mappings for this option
      await supabase
        .from('product_option_mappings')
        .delete()
        .eq('option_id', selectedOptionForMapping.id);

      // Insert new mappings
      const mappingsToInsert = Object.entries(productMappings)
        .filter(([_, mapping]) => mapping.product_id)
        .map(([productId, mapping]) => ({
          product_id: productId,
          option_id: selectedOptionForMapping.id,
          option_id_k7: mapping.option_id_k7 || null,
          is_included: mapping.is_included,
          discount_amount: mapping.discount_amount,
        }));

      if (mappingsToInsert.length > 0) {
        const { error } = await supabase
          .from('product_option_mappings')
          .insert(mappingsToInsert);

        if (error) throw error;
      }

      toast({ title: 'Erfolg', description: 'Produkt-Zuordnungen wurden gespeichert.' });
      setIsMappingDialogOpen(false);
      setSelectedOptionForMapping(null);
      setProductMappings({});
      fetchOptions();
    } catch (error: any) {
      console.error('Error saving mappings:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Zuordnungen konnten nicht gespeichert werden.',
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
      parent_option_slugs: [],
      auto_include_option_slugs: [],
      exclusive_group: '',
      info_text: '',
      image_url: '',
      external_link_url: '',
      external_link_label: '',
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
      parent_option_slugs: option.parent_option_slug || [],
      auto_include_option_slugs: option.auto_include_option_slug || [],
      exclusive_group: option.exclusive_group || '',
      info_text: option.info_text || '',
      image_url: option.image_url || '',
      external_link_url: option.external_link_url || '',
      external_link_label: option.external_link_label || '',
    });
    setIsDialogOpen(true);
  };

  const openMappingDialog = async (option: ProductOption) => {
    setSelectedOptionForMapping(option);
    await fetchOptionMappings(option.id);
    setIsMappingDialogOpen(true);
  };

  const toggleProductMapping = (productId: string) => {
    setProductMappings(prev => {
      if (prev[productId]) {
        const newMappings = { ...prev };
        delete newMappings[productId];
        return newMappings;
      } else {
        return {
          ...prev,
          [productId]: {
            product_id: productId,
            option_id_k7: '',
            is_included: false,
            discount_amount: 0,
          }
        };
      }
    });
  };

  const updateMappingField = (productId: string, field: keyof ProductMapping, value: any) => {
    setProductMappings(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      }
    }));
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

  const hasMissingK7Ids = (optionId: string) => {
    // Check if option has mappings but any of them are missing K7 IDs
    return optionMappingsCount[optionId] === 0;
  };

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
              Verwalten Sie Hardware, TV und Telefon-Optionen und deren Produkt-Zuordnungen.
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

                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Abhängigkeiten & Verknüpfungen</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Benötigt Optionen (Parents) - Mindestens eine muss gewählt sein</Label>
                        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg min-h-[40px]">
                          {formData.parent_option_slugs.map(slug => {
                            const opt = options.find(o => o.slug === slug);
                            return (
                              <Badge key={slug} variant="secondary" className="flex items-center gap-1">
                                {opt?.name || slug}
                                <button
                                  type="button"
                                  className="ml-1 hover:text-destructive"
                                  onClick={() => setFormData({
                                    ...formData,
                                    parent_option_slugs: formData.parent_option_slugs.filter(s => s !== slug)
                                  })}
                                >
                                  ×
                                </button>
                              </Badge>
                            );
                          })}
                          {formData.parent_option_slugs.length === 0 && (
                            <span className="text-sm text-muted-foreground">Keine (unabhängig)</span>
                          )}
                        </div>
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value && !formData.parent_option_slugs.includes(value)) {
                              setFormData({
                                ...formData,
                                parent_option_slugs: [...formData.parent_option_slugs, value]
                              });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Parent hinzufügen..." />
                          </SelectTrigger>
                          <SelectContent>
                            {options
                              .filter(o => o.slug !== formData.slug && !formData.parent_option_slugs.includes(o.slug))
                              .map(o => (
                                <SelectItem key={o.slug} value={o.slug}>
                                  {o.name} ({o.slug})
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Diese Option kann nur gewählt werden, wenn MINDESTENS eine der Parent-Optionen gewählt ist.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Auto-Inkludiert Optionen</Label>
                        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg min-h-[40px]">
                          {formData.auto_include_option_slugs.map(slug => {
                            const opt = options.find(o => o.slug === slug);
                            return (
                              <Badge key={slug} variant="secondary" className="flex items-center gap-1 bg-green-500/10 text-green-700">
                                {opt?.name || slug}
                                <button
                                  type="button"
                                  className="ml-1 hover:text-destructive"
                                  onClick={() => setFormData({
                                    ...formData,
                                    auto_include_option_slugs: formData.auto_include_option_slugs.filter(s => s !== slug)
                                  })}
                                >
                                  ×
                                </button>
                              </Badge>
                            );
                          })}
                          {formData.auto_include_option_slugs.length === 0 && (
                            <span className="text-sm text-muted-foreground">Keine</span>
                          )}
                        </div>
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value && !formData.auto_include_option_slugs.includes(value)) {
                              setFormData({
                                ...formData,
                                auto_include_option_slugs: [...formData.auto_include_option_slugs, value]
                              });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Auto-Option hinzufügen..." />
                          </SelectTrigger>
                          <SelectContent>
                            {options
                              .filter(o => o.slug !== formData.slug && !formData.auto_include_option_slugs.includes(o.slug))
                              .map(o => (
                                <SelectItem key={o.slug} value={o.slug}>
                                  {o.name} ({o.slug})
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Diese Optionen werden automatisch hinzugefügt, wenn die aktuelle Option gewählt wird.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="exclusive_group">Exklusiv-Gruppe</Label>
                        <Input
                          id="exclusive_group"
                          value={formData.exclusive_group}
                          onChange={(e) => setFormData({...formData, exclusive_group: e.target.value})}
                          placeholder="z.B. tv-hardware"
                        />
                        <p className="text-xs text-muted-foreground">
                          Optionen mit der gleichen Gruppe sind gegenseitig ausschließend (entweder/oder).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Zusätzliche Informationen</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="info_text">Info-Text (Hover)</Label>
                        <Input
                          id="info_text"
                          value={formData.info_text}
                          onChange={(e) => setFormData({...formData, info_text: e.target.value})}
                          placeholder="Text der beim Hover über das Info-Icon erscheint"
                        />
                        <p className="text-xs text-muted-foreground">
                          Wenn ausgefüllt, erscheint ein "i"-Icon neben der Option.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="image_url">Bild-URL</Label>
                        <Input
                          id="image_url"
                          value={formData.image_url}
                          onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="external_link_url">Externer Link</Label>
                          <Input
                            id="external_link_url"
                            value={formData.external_link_url}
                            onChange={(e) => setFormData({...formData, external_link_url: e.target.value})}
                            placeholder="https://example.com/senderliste"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="external_link_label">Link-Beschriftung</Label>
                          <Input
                            id="external_link_label"
                            value={formData.external_link_label}
                            onChange={(e) => setFormData({...formData, external_link_label: e.target.value})}
                            placeholder="z.B. Senderliste anzeigen"
                          />
                        </div>
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
                  <TableHead>Abhängigkeiten</TableHead>
                  <TableHead>Preis</TableHead>
                  <TableHead>Produkte</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                        <div className="flex flex-col gap-1">
                          {option.parent_option_slug && option.parent_option_slug.length > 0 && (
                            <Badge variant="outline" className="text-xs w-fit">
                              ← {option.parent_option_slug.join(', ')}
                            </Badge>
                          )}
                          {option.auto_include_option_slug && option.auto_include_option_slug.length > 0 && (
                            <Badge variant="outline" className="text-xs w-fit bg-green-500/10 text-green-700 border-green-200">
                              + {option.auto_include_option_slug.join(', ')}
                            </Badge>
                          )}
                          {option.exclusive_group && (
                            <Badge variant="outline" className="text-xs w-fit bg-orange-500/10 text-orange-700 border-orange-200">
                              ⊕ {option.exclusive_group}
                            </Badge>
                          )}
                          {(!option.parent_option_slug || option.parent_option_slug.length === 0) && 
                           (!option.auto_include_option_slug || option.auto_include_option_slug.length === 0) && 
                           !option.exclusive_group && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
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
                        <div className="flex items-center gap-2">
                          {optionMappingsCount[option.id] ? (
                            <Badge variant="default">
                              {optionMappingsCount[option.id]} Produkt{optionMappingsCount[option.id] > 1 ? 'e' : ''}
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1 text-warning">
                              <AlertTriangle className="w-3 h-3" />
                              <span className="text-xs">Keine</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={option.is_active}
                          onCheckedChange={() => toggleActive(option)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOptionForBuildings(option);
                              setIsBuildingDialogOpen(true);
                            }}
                            title="Gebäude zuweisen"
                            className={optionBuildingsCount[option.id] ? 'border-primary' : ''}
                          >
                            <Building2 className="w-4 h-4" />
                            {optionBuildingsCount[option.id] && (
                              <span className="ml-1 text-xs">{optionBuildingsCount[option.id]}</span>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openMappingDialog(option)}
                            title="Produkt-Zuordnungen"
                          >
                            <Link className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(option)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Product Mapping Dialog */}
      <Dialog open={isMappingDialogOpen} onOpenChange={(open) => {
        setIsMappingDialogOpen(open);
        if (!open) {
          setSelectedOptionForMapping(null);
          setProductMappings({});
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Produkt-Zuordnungen: {selectedOptionForMapping?.name}
            </DialogTitle>
            <DialogDescription>
              Wählen Sie die Produkte aus, für die diese Option verfügbar sein soll, und geben Sie die jeweilige K7 ID ein.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {products.map(product => {
              const isSelected = !!productMappings[product.id];
              const mapping = productMappings[product.id];
              
              return (
                <div 
                  key={product.id} 
                  className={`border rounded-lg p-4 ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      id={`product-${product.id}`}
                      checked={isSelected}
                      onCheckedChange={() => toggleProductMapping(product.id)}
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={`product-${product.id}`}
                        className="font-medium cursor-pointer"
                      >
                        {product.name}
                      </Label>
                      
                      {isSelected && (
                        <div className="mt-3 grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`k7-${product.id}`} className="text-sm">
                              Options ID K7
                            </Label>
                            <Input
                              id={`k7-${product.id}`}
                              value={mapping?.option_id_k7 || ''}
                              onChange={(e) => updateMappingField(product.id, 'option_id_k7', e.target.value)}
                              placeholder="z.B. OPT-001"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`discount-${product.id}`} className="text-sm">
                              Rabatt (€)
                            </Label>
                            <Input
                              id={`discount-${product.id}`}
                              type="number"
                              step="0.01"
                              value={mapping?.discount_amount || 0}
                              onChange={(e) => updateMappingField(product.id, 'discount_amount', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="flex items-end pb-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`included-${product.id}`}
                                checked={mapping?.is_included || false}
                                onCheckedChange={(checked) => updateMappingField(product.id, 'is_included', checked)}
                              />
                              <Label htmlFor={`included-${product.id}`} className="text-sm">
                                Inkludiert
                              </Label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsMappingDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveMappings}>
              Zuordnungen speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Option Building Assignment Dialog */}
      {selectedOptionForBuildings && (
        <OptionBuildingAssignment
          optionId={selectedOptionForBuildings.id}
          optionName={selectedOptionForBuildings.name}
          open={isBuildingDialogOpen}
          onOpenChange={(open) => {
            setIsBuildingDialogOpen(open);
            if (!open) setSelectedOptionForBuildings(null);
          }}
          onUpdate={fetchOptions}
        />
      )}
    </Card>
  );
};
