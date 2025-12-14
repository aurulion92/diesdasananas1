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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Loader2,
  Tag,
  RefreshCw,
  Pencil,
  Globe,
  Building2,
  Package,
  Trash2,
  Combine
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Promotion {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_global: boolean;
  is_active: boolean;
  requires_customer_number: boolean;
  available_text: string | null;
  unavailable_text: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

interface Building {
  id: string;
  street: string;
  house_number: string;
  city: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface ProductOption {
  id: string;
  name: string;
  slug: string;
  category: string;
}

interface DiscountEntry {
  id?: string;
  applies_to: 'product' | 'option' | 'setup_fee';
  target_product_id: string | null;
  target_option_id: string | null;
  discount_type: 'fixed' | 'percentage' | 'waive';
  discount_amount: number | null;
  price_type: 'monthly' | 'one_time';
  k7_product_id: string;
  k7_template_id: string;
  k7_template_type: string;
}

type PromotionScope = 'global' | 'building' | 'product' | 'building_and_product';

export const PromotionsManager = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [buildingSearch, setBuildingSearch] = useState('');
  const [discountEntries, setDiscountEntries] = useState<DiscountEntry[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    scope: 'global' as PromotionScope,
    is_active: true,
    requires_customer_number: false,
    available_text: '',
    unavailable_text: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchPromotions();
    fetchBuildings();
    fetchProducts();
    fetchProductOptions();
  }, []);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromotions((data as Promotion[]) || []);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      toast({
        title: 'Fehler',
        description: 'Aktionen konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildings = async (search?: string) => {
    try {
      let query = supabase
        .from('buildings')
        .select('id, street, house_number, city')
        .order('street', { ascending: true });
      
      // If search is provided, filter server-side
      if (search && search.length >= 2) {
        query = query.or(`street.ilike.%${search}%,house_number.ilike.%${search}%,city.ilike.%${search}%`);
      }
      
      // Limit to 200 results for performance
      query = query.limit(200);

      const { data, error } = await query;
      if (error) throw error;
      setBuildings((data as Building[]) || []);
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setProducts((data as Product[]) || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchProductOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('product_options')
        .select('id, name, slug, category')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setProductOptions((data as ProductOption[]) || []);
    } catch (error) {
      console.error('Error fetching product options:', error);
    }
  };

  const fetchPromotionBuildings = async (promotionId: string) => {
    try {
      const { data, error } = await supabase
        .from('promotion_buildings')
        .select('building_id')
        .eq('promotion_id', promotionId);

      if (error) throw error;
      setSelectedBuildings(data?.map(pb => pb.building_id) || []);
    } catch (error) {
      console.error('Error fetching promotion buildings:', error);
    }
  };

  const fetchPromotionDiscounts = async (promotionId: string) => {
    try {
      const { data, error } = await supabase
        .from('promotion_discounts')
        .select('*')
        .eq('promotion_id', promotionId);

      if (error) throw error;
      
      const entries: DiscountEntry[] = (data || []).map(d => ({
        id: d.id,
        applies_to: d.applies_to as 'product' | 'option' | 'setup_fee',
        target_product_id: d.target_product_id,
        target_option_id: d.target_option_id,
        discount_type: d.discount_type as 'fixed' | 'percentage' | 'waive',
        discount_amount: d.discount_amount,
        price_type: (d.price_type as 'monthly' | 'one_time') || 'monthly',
        k7_product_id: d.k7_product_id || '',
        k7_template_id: d.k7_template_id || '',
        k7_template_type: d.k7_template_type || '',
      }));
      
      setDiscountEntries(entries);
      
      // Extract product IDs for product-scoped promotions
      const productIds = entries
        .filter(e => e.target_product_id)
        .map(e => e.target_product_id as string);
      setSelectedProducts([...new Set(productIds)]);
    } catch (error) {
      console.error('Error fetching promotion discounts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Saving promotion with:', {
      scope: formData.scope,
      selectedProducts,
      discountEntries,
    });
    
    try {
      const promotionData = {
        name: formData.name,
        code: formData.code || null,
        description: formData.description || null,
        is_global: formData.scope === 'global',
        is_active: formData.is_active,
        requires_customer_number: formData.requires_customer_number,
        available_text: formData.available_text || null,
        unavailable_text: formData.unavailable_text || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      };

      let promotionId: string;

      if (editingPromotion) {
        const { error } = await supabase
          .from('promotions')
          .update(promotionData)
          .eq('id', editingPromotion.id);
        
        if (error) throw error;
        promotionId = editingPromotion.id;
        toast({ title: 'Erfolg', description: 'Aktion wurde aktualisiert.' });
      } else {
        const { data, error } = await supabase
          .from('promotions')
          .insert([promotionData])
          .select('id')
          .single();
        
        if (error) throw error;
        promotionId = data.id;
        toast({ title: 'Erfolg', description: 'Aktion wurde erstellt.' });
      }

      // Update building assignments if building-scoped
      await supabase
        .from('promotion_buildings')
        .delete()
        .eq('promotion_id', promotionId);

      if ((formData.scope === 'building' || formData.scope === 'building_and_product') && selectedBuildings.length > 0) {
        const buildingAssignments = selectedBuildings.map(buildingId => ({
          promotion_id: promotionId,
          building_id: buildingId,
        }));

        const { error: assignError } = await supabase
          .from('promotion_buildings')
          .insert(buildingAssignments);

        if (assignError) throw assignError;
      }

      // Update discount entries
      await supabase
        .from('promotion_discounts')
        .delete()
        .eq('promotion_id', promotionId);

      if (discountEntries.length > 0) {
        // For product-scoped promotions, we need to create entries that link
        // the discount to the selected products/tariffs
        const discountData: any[] = [];
        
        if ((formData.scope === 'product' || formData.scope === 'building_and_product') && selectedProducts.length > 0) {
          // Create discount entries linked to each selected product
          for (const productId of selectedProducts) {
            for (const entry of discountEntries) {
              discountData.push({
                promotion_id: promotionId,
                applies_to: entry.applies_to,
                target_product_id: productId, // Link discount to this tariff
                target_option_id: entry.target_option_id || null,
                discount_type: entry.discount_type,
                discount_amount: entry.discount_amount,
                price_type: entry.price_type,
                k7_product_id: entry.k7_product_id || null,
                k7_template_id: entry.k7_template_id || null,
                k7_template_type: entry.k7_template_type || null,
              });
            }
          }
        } else {
          // Global or building-only: discounts apply universally
          for (const entry of discountEntries) {
            discountData.push({
              promotion_id: promotionId,
              applies_to: entry.applies_to,
              target_product_id: entry.target_product_id || null,
              target_option_id: entry.target_option_id || null,
              discount_type: entry.discount_type,
              discount_amount: entry.discount_amount,
              price_type: entry.price_type,
              k7_product_id: entry.k7_product_id || null,
              k7_template_id: entry.k7_template_id || null,
              k7_template_type: entry.k7_template_type || null,
            });
          }
        }

        if (discountData.length > 0) {
          const { error: discountError } = await supabase
            .from('promotion_discounts')
            .insert(discountData);

          if (discountError) throw discountError;
        }
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPromotions();
    } catch (error: any) {
      console.error('Error saving promotion:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Aktion konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      scope: 'global',
      is_active: true,
      requires_customer_number: false,
      available_text: '',
      unavailable_text: '',
      start_date: '',
      end_date: '',
    });
    setEditingPromotion(null);
    setSelectedBuildings([]);
    setSelectedProducts([]);
    setDiscountEntries([]);
  };

  const openEditDialog = async (promotion: Promotion) => {
    setEditingPromotion(promotion);
    
    // Determine scope by checking building and product assignments
    let scope: PromotionScope = 'global';
    
    if (!promotion.is_global) {
      const { data: buildingData } = await supabase
        .from('promotion_buildings')
        .select('building_id')
        .eq('promotion_id', promotion.id)
        .limit(1);
      
      const { data: discountData } = await supabase
        .from('promotion_discounts')
        .select('target_product_id')
        .eq('promotion_id', promotion.id)
        .not('target_product_id', 'is', null)
        .limit(1);
      
      const hasBuildings = buildingData && buildingData.length > 0;
      const hasProducts = discountData && discountData.length > 0;
      
      if (hasBuildings && hasProducts) {
        scope = 'building_and_product';
      } else if (hasBuildings) {
        scope = 'building';
      } else {
        scope = 'product';
      }
    }
    
    setFormData({
      name: promotion.name,
      code: promotion.code || '',
      description: promotion.description || '',
      scope,
      is_active: promotion.is_active,
      requires_customer_number: promotion.requires_customer_number,
      available_text: promotion.available_text || '',
      unavailable_text: promotion.unavailable_text || '',
      start_date: promotion.start_date || '',
      end_date: promotion.end_date || '',
    });
    
    if (scope === 'building' || scope === 'building_and_product') {
      await fetchPromotionBuildings(promotion.id);
    }
    
    await fetchPromotionDiscounts(promotion.id);
    
    setIsDialogOpen(true);
  };

  const toggleActive = async (promotion: Promotion) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: !promotion.is_active })
        .eq('id', promotion.id);
      
      if (error) throw error;
      fetchPromotions();
    } catch (error) {
      console.error('Error toggling promotion:', error);
    }
  };

  const toggleBuilding = (buildingId: string) => {
    setSelectedBuildings(prev => 
      prev.includes(buildingId)
        ? prev.filter(id => id !== buildingId)
        : [...prev, buildingId]
    );
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const addDiscountEntry = () => {
    setDiscountEntries(prev => [...prev, {
      applies_to: 'option',
      target_product_id: null,
      target_option_id: null,
      discount_type: 'fixed',
      discount_amount: 0,
      price_type: 'monthly',
      k7_product_id: '',
      k7_template_id: '',
      k7_template_type: '',
    }]);
  };

  const updateDiscountEntry = (index: number, field: keyof DiscountEntry, value: any) => {
    setDiscountEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    ));
  };

  const removeDiscountEntry = (index: number) => {
    setDiscountEntries(prev => prev.filter((_, i) => i !== index));
  };

  // Buildings are now filtered server-side, just use the fetched list
  const filteredBuildings = buildings;

  const getScopeInfo = (scope: PromotionScope) => {
    switch (scope) {
      case 'global':
        return { icon: Globe, label: 'Global', color: 'text-success' };
      case 'building':
        return { icon: Building2, label: 'Objektbezogen', color: 'text-primary' };
      case 'product':
        return { icon: Package, label: 'Produktbezogen', color: 'text-accent' };
      case 'building_and_product':
        return { icon: Combine, label: 'Objekt & Produkt', color: 'text-warning' };
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Aktionen / Promotions
            </CardTitle>
            <CardDescription>
              Verwalten Sie Aktionscodes, Rabatte und Promotions.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchPromotions}>
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
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPromotion ? 'Aktion bearbeiten' : 'Neue Aktion'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingPromotion ? 'Bearbeiten Sie die Aktion.' : 'Erstellen Sie eine neue Aktion.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">Aktionscode</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                        placeholder="z.B. GWG-TEST"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Beschreibung</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={2}
                    />
                  </div>

                  {/* Scope Selection */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Geltungsbereich</h4>
                    <div className="space-y-2">
                      <Label>Wann gilt diese Aktion?</Label>
                      <Select
                        value={formData.scope}
                        onValueChange={(value: PromotionScope) => setFormData({...formData, scope: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-success" />
                              Global (alle Adressen & Produkte)
                            </div>
                          </SelectItem>
                          <SelectItem value="building">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-primary" />
                              Objektbezogen (bestimmte Adressen)
                            </div>
                          </SelectItem>
                          <SelectItem value="product">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-accent" />
                              Produktbezogen (bestimmte Tarife)
                            </div>
                          </SelectItem>
                          <SelectItem value="building_and_product">
                            <div className="flex items-center gap-2">
                              <Combine className="w-4 h-4 text-warning" />
                              Objekt- & Produktbezogen
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Building Selection */}
                  {(formData.scope === 'building' || formData.scope === 'building_and_product') && (
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Gültige Objekte ({selectedBuildings.length} ausgewählt)
                      </h4>
                      <Input
                        placeholder="Objekte suchen (mind. 2 Zeichen)..."
                        value={buildingSearch}
                        onChange={(e) => {
                          setBuildingSearch(e.target.value);
                          // Fetch buildings with search term
                          fetchBuildings(e.target.value);
                        }}
                      />
                      <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                        {filteredBuildings.map(building => (
                          <div
                            key={building.id}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted ${
                              selectedBuildings.includes(building.id) ? 'bg-primary/10' : ''
                            }`}
                            onClick={() => toggleBuilding(building.id)}
                          >
                            <span className="text-sm">
                              {building.street} {building.house_number}, {building.city}
                            </span>
                            {selectedBuildings.includes(building.id) && (
                              <Badge variant="default">Ausgewählt</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product Selection */}
                  {(formData.scope === 'product' || formData.scope === 'building_and_product') && (
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Gültige Produkte ({selectedProducts.length} ausgewählt)
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {products.map(product => (
                          <div
                            key={product.id}
                            className={`flex items-center justify-between p-3 rounded border cursor-pointer hover:bg-muted ${
                              selectedProducts.includes(product.id) ? 'bg-primary/10 border-primary' : ''
                            }`}
                            onClick={() => toggleProduct(product.id)}
                          >
                            <span className="text-sm font-medium">{product.name}</span>
                            {selectedProducts.includes(product.id) && (
                              <Badge variant="default" className="text-xs">✓</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Discount Entries */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Subventionen / Rabatte</h4>
                      <Button type="button" variant="outline" size="sm" onClick={addDiscountEntry}>
                        <Plus className="w-4 h-4 mr-2" />
                        Rabatt hinzufügen
                      </Button>
                    </div>
                    
                    {discountEntries.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                        Keine Rabatte konfiguriert. Klicken Sie auf "Rabatt hinzufügen".
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {discountEntries.map((entry, index) => (
                          <div key={index} className="border rounded-lg p-4 space-y-4 relative">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 text-destructive"
                              onClick={() => removeDiscountEntry(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Rabatt auf</Label>
                                <Select
                                  value={entry.applies_to}
                                  onValueChange={(value) => updateDiscountEntry(index, 'applies_to', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="product">Produkt (Tarif)</SelectItem>
                                    <SelectItem value="option">Option (Addon)</SelectItem>
                                    <SelectItem value="setup_fee">Bereitstellungspreis</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {entry.applies_to === 'product' && (
                                <div className="space-y-2">
                                  <Label>Produkt</Label>
                                  <Select
                                    value={entry.target_product_id || ''}
                                    onValueChange={(value) => updateDiscountEntry(index, 'target_product_id', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Auswählen..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {entry.applies_to === 'option' && (
                                <div className="space-y-2">
                                  <Label>Option</Label>
                                  <Select
                                    value={entry.target_option_id || ''}
                                    onValueChange={(value) => updateDiscountEntry(index, 'target_option_id', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Auswählen..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {productOptions.map(o => (
                                        <SelectItem key={o.id} value={o.id}>
                                          {o.name} ({o.category})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              <div className="space-y-2">
                                <Label>Preistyp</Label>
                                <Select
                                  value={entry.price_type}
                                  onValueChange={(value) => updateDiscountEntry(index, 'price_type', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="monthly">Monatlich</SelectItem>
                                    <SelectItem value="one_time">Einmalig</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Rabattart</Label>
                                <Select
                                  value={entry.discount_type}
                                  onValueChange={(value) => updateDiscountEntry(index, 'discount_type', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fixed">Fester Betrag (€)</SelectItem>
                                    <SelectItem value="percentage">Prozentual (%)</SelectItem>
                                    <SelectItem value="waive">Komplett erlassen</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {entry.discount_type !== 'waive' && (
                              <div className="grid grid-cols-4 gap-4">
                                <div className="space-y-2">
                                  <Label>Rabatt {entry.discount_type === 'fixed' ? '(€)' : '(%)'}</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={entry.discount_amount || ''}
                                    onChange={(e) => updateDiscountEntry(index, 'discount_amount', parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>K7 Produkt ID</Label>
                                  <Input
                                    value={entry.k7_product_id}
                                    onChange={(e) => updateDiscountEntry(index, 'k7_product_id', e.target.value)}
                                    placeholder="optional"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>K7 Template ID</Label>
                                  <Input
                                    value={entry.k7_template_id}
                                    onChange={(e) => updateDiscountEntry(index, 'k7_template_id', e.target.value)}
                                    placeholder="optional"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>K7 Template Typ</Label>
                                  <Input
                                    value={entry.k7_template_type}
                                    onChange={(e) => updateDiscountEntry(index, 'k7_template_type', e.target.value)}
                                    placeholder="z.B. Kosten, Erlös"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Display Texts */}
                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="available_text">Text wenn verfügbar</Label>
                      <Textarea
                        id="available_text"
                        value={formData.available_text}
                        onChange={(e) => setFormData({...formData, available_text: e.target.value})}
                        rows={2}
                        placeholder="Text der angezeigt wird, wenn die Aktion gilt"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unavailable_text">Text wenn nicht verfügbar</Label>
                      <Textarea
                        id="unavailable_text"
                        value={formData.unavailable_text}
                        onChange={(e) => setFormData({...formData, unavailable_text: e.target.value})}
                        rows={2}
                        placeholder="Text der angezeigt wird, wenn die Aktion nicht gilt"
                      />
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Startdatum</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">Enddatum</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Weitere Optionen</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="requires_customer_number">Kundennummer erforderlich</Label>
                        <Switch
                          id="requires_customer_number"
                          checked={formData.requires_customer_number}
                          onCheckedChange={(checked) => setFormData({...formData, requires_customer_number: checked})}
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
                      {editingPromotion ? 'Speichern' : 'Erstellen'}
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
                  <TableHead>Aktion</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Geltungsbereich</TableHead>
                  <TableHead>Rabatte</TableHead>
                  <TableHead>Zeitraum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Keine Aktionen gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  promotions.map((promotion) => (
                    <TableRow key={promotion.id} className={!promotion.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{promotion.name}</span>
                          {promotion.requires_customer_number && (
                            <Badge variant="outline" className="ml-2 text-xs">KD-Nr.</Badge>
                          )}
                          {promotion.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {promotion.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {promotion.code ? (
                          <Badge variant="secondary">{promotion.code}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <PromotionScopeDisplay promotionId={promotion.id} isGlobal={promotion.is_global} />
                      </TableCell>
                      <TableCell>
                        <DiscountPreview promotionId={promotion.id} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {promotion.start_date || promotion.end_date ? (
                            <>
                              {promotion.start_date || '-'} bis {promotion.end_date || '-'}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Unbegrenzt</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={promotion.is_active}
                          onCheckedChange={() => toggleActive(promotion)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(promotion)}
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

// Helper component to show discount preview in table
const DiscountPreview = ({ promotionId }: { promotionId: string }) => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      const { count, error } = await supabase
        .from('promotion_discounts')
        .select('*', { count: 'exact', head: true })
        .eq('promotion_id', promotionId);
      
      if (!error) {
        setCount(count || 0);
      }
    };
    fetchCount();
  }, [promotionId]);

  if (count === null) return <span className="text-muted-foreground">...</span>;
  if (count === 0) return <span className="text-muted-foreground">-</span>;
  
  return (
    <Badge variant="outline">
      {count} Rabatt{count !== 1 ? 'e' : ''}
    </Badge>
  );
};

// Helper component to display promotion scope with icon
const PromotionScopeDisplay = ({ promotionId, isGlobal }: { promotionId: string; isGlobal: boolean }) => {
  const [scope, setScope] = useState<'global' | 'building' | 'product' | 'building_and_product'>('global');

  useEffect(() => {
    if (isGlobal) {
      setScope('global');
      return;
    }

    const determineScope = async () => {
      const [buildingsRes, discountsRes] = await Promise.all([
        supabase.from('promotion_buildings').select('building_id').eq('promotion_id', promotionId).limit(1),
        supabase.from('promotion_discounts').select('target_product_id').eq('promotion_id', promotionId).not('target_product_id', 'is', null).limit(1)
      ]);
      
      const hasBuildings = buildingsRes.data && buildingsRes.data.length > 0;
      const hasProducts = discountsRes.data && discountsRes.data.length > 0;
      
      if (hasBuildings && hasProducts) {
        setScope('building_and_product');
      } else if (hasBuildings) {
        setScope('building');
      } else {
        setScope('product');
      }
    };
    
    determineScope();
  }, [promotionId, isGlobal]);

  const scopeConfig = {
    global: { icon: Globe, label: 'Global', color: 'text-success' },
    building: { icon: Building2, label: 'Objektbezogen', color: 'text-primary' },
    product: { icon: Package, label: 'Produktbezogen', color: 'text-accent' },
    building_and_product: { icon: Combine, label: 'Objekt & Produkt', color: 'text-warning' },
  };

  const config = scopeConfig[scope];
  const IconComponent = config.icon;

  return (
    <div className="flex items-center gap-1">
      <IconComponent className={`w-4 h-4 ${config.color}`} />
      <span className="text-sm">{config.label}</span>
    </div>
  );
};
