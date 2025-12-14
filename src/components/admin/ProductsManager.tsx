import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Loader2,
  Package,
  AlertTriangle,
  RefreshCw,
  Pencil,
  Building2,
  Link,
  Copy,
  Trash2,
  Archive,
  ArchiveRestore,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProductBuildingAssignment } from './ProductBuildingAssignment';
import { ProductOptionAssignment } from './ProductOptionAssignment';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from '@/components/ui/checkbox';

interface Product {
  id: string;
  name: string;
  slug: string;
  display_name: string | null;
  description: string | null;
  info_text: string | null;
  phone_terms_text: string | null;
  external_link_url: string | null;
  external_link_label: string | null;
  monthly_price: number;
  setup_fee: number;
  download_speed: number | null;
  upload_speed: number | null;
  download_speed_normal: number | null;
  download_speed_min: number | null;
  upload_speed_normal: number | null;
  upload_speed_min: number | null;
  is_ftth: boolean;
  is_fttb: boolean;
  is_ftth_limited: boolean;
  is_active: boolean;
  display_order: number;
  product_id_k7: string | null;
  contract_months: number;
  includes_phone: boolean;
  includes_fiber_tv: boolean;
  hide_for_ftth: boolean;
  is_building_restricted: boolean;
  is_archived: boolean;
  archived_at: string | null;
  customer_type: string;
  created_at: string;
  updated_at: string;
}

export const ProductsManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [assignmentProduct, setAssignmentProduct] = useState<{ id: string; name: string } | null>(null);
  const [optionAssignmentProduct, setOptionAssignmentProduct] = useState<{ id: string; name: string } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | 'pk' | 'kmu'>('all');
  
  // Copy dialog state
  const [copyProduct, setCopyProduct] = useState<Product | null>(null);
  const [copyOptions, setCopyOptions] = useState({
    copyAvailability: true,
    copyProductOptions: true,
    copyBuildingAssignments: true
  });
  const [copying, setCopying] = useState(false);
  
  // Delete dialog state
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    display_name: '',
    description: '',
    info_text: '',
    phone_terms_text: '',
    external_link_url: '',
    external_link_label: '',
    monthly_price: 0,
    setup_fee: 99,
    download_speed: 0,
    upload_speed: 0,
    download_speed_normal: 0,
    download_speed_min: 0,
    upload_speed_normal: 0,
    upload_speed_min: 0,
    is_ftth: true,
    is_fttb: true,
    is_ftth_limited: true,
    is_active: true,
    display_order: 0,
    product_id_k7: '',
    contract_months: 24,
    includes_phone: false,
    includes_fiber_tv: false,
    hide_for_ftth: false,
    customer_type: 'pk',
  });

  useEffect(() => {
    fetchProducts();
  }, [showArchived]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      
      if (!showArchived) {
        query = query.or('is_archived.is.null,is_archived.eq.false');
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts((data as Product[]) || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Fehler',
        description: 'Produkte konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        ...formData,
        product_id_k7: formData.product_id_k7 || null,
        display_name: formData.display_name || null,
        description: formData.description || null,
        info_text: formData.info_text || null,
        phone_terms_text: formData.phone_terms_text || null,
        external_link_url: formData.external_link_url || null,
        external_link_label: formData.external_link_label || null,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        
        if (error) throw error;
        toast({ title: 'Erfolg', description: 'Produkt wurde aktualisiert.' });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
        
        if (error) throw error;
        toast({ title: 'Erfolg', description: 'Produkt wurde erstellt.' });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Produkt konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      display_name: '',
      description: '',
      info_text: '',
      phone_terms_text: '',
      external_link_url: '',
      external_link_label: '',
      monthly_price: 0,
      setup_fee: 99,
      download_speed: 0,
      upload_speed: 0,
      download_speed_normal: 0,
      download_speed_min: 0,
      upload_speed_normal: 0,
      upload_speed_min: 0,
      is_ftth: true,
      is_fttb: true,
      is_ftth_limited: true,
      is_active: true,
      display_order: 0,
      product_id_k7: '',
      contract_months: 24,
      includes_phone: false,
      includes_fiber_tv: false,
      hide_for_ftth: false,
      customer_type: 'pk',
    });
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      display_name: product.display_name || '',
      description: product.description || '',
      info_text: product.info_text || '',
      phone_terms_text: product.phone_terms_text || '',
      external_link_url: product.external_link_url || '',
      external_link_label: product.external_link_label || '',
      monthly_price: product.monthly_price,
      setup_fee: product.setup_fee,
      download_speed: product.download_speed || 0,
      upload_speed: product.upload_speed || 0,
      download_speed_normal: product.download_speed_normal || 0,
      download_speed_min: product.download_speed_min || 0,
      upload_speed_normal: product.upload_speed_normal || 0,
      upload_speed_min: product.upload_speed_min || 0,
      is_ftth: product.is_ftth,
      is_fttb: product.is_fttb,
      is_ftth_limited: product.is_ftth_limited,
      is_active: product.is_active,
      display_order: product.display_order,
      product_id_k7: product.product_id_k7 || '',
      contract_months: product.contract_months,
      includes_phone: product.includes_phone,
      includes_fiber_tv: product.includes_fiber_tv ?? false,
      hide_for_ftth: product.hide_for_ftth || false,
      customer_type: product.customer_type || 'pk',
    });
    setIsDialogOpen(true);
  };

  const toggleActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);
      
      if (error) throw error;
      fetchProducts();
    } catch (error) {
      console.error('Error toggling product:', error);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Copy product functionality
  const handleCopyProduct = async () => {
    if (!copyProduct) return;
    setCopying(true);
    
    try {
      // Create new product
      const newProductData = {
        name: `Kopie von ${copyProduct.name}`,
        slug: `${copyProduct.slug}-copy-${Date.now()}`,
        description: copyProduct.description,
        monthly_price: copyProduct.monthly_price,
        setup_fee: copyProduct.setup_fee,
        download_speed: copyProduct.download_speed,
        upload_speed: copyProduct.upload_speed,
        is_ftth: copyOptions.copyAvailability ? copyProduct.is_ftth : true,
        is_fttb: copyOptions.copyAvailability ? copyProduct.is_fttb : true,
        is_ftth_limited: copyOptions.copyAvailability ? copyProduct.is_ftth_limited : true,
        is_active: false, // New copies start inactive
        display_order: copyProduct.display_order + 1,
        product_id_k7: null, // K7 ID should be unique, so don't copy
        contract_months: copyProduct.contract_months,
        includes_phone: copyProduct.includes_phone,
        includes_fiber_tv: copyProduct.includes_fiber_tv,
        hide_for_ftth: copyProduct.hide_for_ftth,
        is_building_restricted: copyOptions.copyBuildingAssignments ? copyProduct.is_building_restricted : false,
      };

      const { data: newProduct, error: insertError } = await supabase
        .from('products')
        .insert([newProductData])
        .select()
        .single();

      if (insertError) throw insertError;

      // Copy product options if requested
      if (copyOptions.copyProductOptions && newProduct) {
        const { data: existingMappings } = await supabase
          .from('product_option_mappings')
          .select('*')
          .eq('product_id', copyProduct.id);

        if (existingMappings && existingMappings.length > 0) {
          const newMappings = existingMappings.map(mapping => ({
            product_id: newProduct.id,
            option_id: mapping.option_id,
            discount_amount: mapping.discount_amount,
            is_included: mapping.is_included,
            option_id_k7: null, // Don't copy K7 ID
          }));

          await supabase.from('product_option_mappings').insert(newMappings);
        }
      }

      // Copy building assignments if requested
      if (copyOptions.copyBuildingAssignments && newProduct) {
        const { data: existingAssignments } = await supabase
          .from('product_buildings')
          .select('*')
          .eq('product_id', copyProduct.id);

        if (existingAssignments && existingAssignments.length > 0) {
          const newAssignments = existingAssignments.map(assignment => ({
            product_id: newProduct.id,
            building_id: assignment.building_id,
          }));

          await supabase.from('product_buildings').insert(newAssignments);
        }
      }

      toast({ title: 'Erfolg', description: 'Produkt wurde kopiert.' });
      setCopyProduct(null);
      setCopyOptions({ copyAvailability: true, copyProductOptions: true, copyBuildingAssignments: true });
      fetchProducts();
    } catch (error: any) {
      console.error('Error copying product:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Produkt konnte nicht kopiert werden.',
        variant: 'destructive',
      });
    } finally {
      setCopying(false);
    }
  };

  // Delete product functionality
  const handleDeleteProduct = async () => {
    if (!deleteProduct || deleteConfirmText !== 'LÖSCHEN') return;
    setDeleting(true);
    
    try {
      // Delete related mappings first
      await supabase.from('product_option_mappings').delete().eq('product_id', deleteProduct.id);
      await supabase.from('product_buildings').delete().eq('product_id', deleteProduct.id);
      
      // Delete the product
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteProduct.id);

      if (error) throw error;

      toast({ title: 'Erfolg', description: 'Produkt wurde gelöscht.' });
      setDeleteProduct(null);
      setDeleteConfirmText('');
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Produkt konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Archive/Unarchive product functionality
  const handleArchiveProduct = async (product: Product) => {
    try {
      const isArchiving = !product.is_archived;
      const { error } = await supabase
        .from('products')
        .update({ 
          is_archived: isArchiving,
          archived_at: isArchiving ? new Date().toISOString() : null,
          is_active: isArchiving ? false : product.is_active // Deactivate when archiving
        })
        .eq('id', product.id);

      if (error) throw error;

      toast({ 
        title: 'Erfolg', 
        description: isArchiving ? 'Produkt wurde archiviert.' : 'Produkt wurde wiederhergestellt.' 
      });
      fetchProducts();
    } catch (error: any) {
      console.error('Error archiving product:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Aktion konnte nicht durchgeführt werden.',
        variant: 'destructive',
      });
    }
  };

  // Check if product has options or building assignments
  const [productExtras, setProductExtras] = useState<Record<string, { hasOptions: boolean; hasBuildings: boolean }>>({});

  useEffect(() => {
    const fetchExtras = async () => {
      if (products.length === 0) return;
      
      const productIds = products.map(p => p.id);
      
      const [optionsResult, buildingsResult] = await Promise.all([
        supabase.from('product_option_mappings').select('product_id').in('product_id', productIds),
        supabase.from('product_buildings').select('product_id').in('product_id', productIds)
      ]);

      const extras: Record<string, { hasOptions: boolean; hasBuildings: boolean }> = {};
      productIds.forEach(id => {
        extras[id] = {
          hasOptions: optionsResult.data?.some(m => m.product_id === id) || false,
          hasBuildings: buildingsResult.data?.some(b => b.product_id === id) || false
        };
      });
      setProductExtras(extras);
    };

    fetchExtras();
  }, [products]);

  // Filter by customer type
  const filteredProducts = customerTypeFilter === 'all' 
    ? products 
    : products.filter(p => p.customer_type === customerTypeFilter);
  
  const activeProducts = filteredProducts.filter(p => !p.is_archived);
  const archivedProducts = filteredProducts.filter(p => p.is_archived);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Produkte
            </CardTitle>
            <CardDescription>
              Verwalten Sie alle Internet-Tarife.
            </CardDescription>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Select value={customerTypeFilter} onValueChange={(v) => setCustomerTypeFilter(v as 'all' | 'pk' | 'kmu')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Alle Typen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="pk">PK (Privat)</SelectItem>
                <SelectItem value="kmu">KMU (Business)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showArchived ? 'Archiv ausblenden' : 'Archiv anzeigen'}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchProducts}>
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
                    {editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingProduct ? 'Bearbeiten Sie das Produkt.' : 'Fügen Sie ein neues Produkt hinzu.'}
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
                    <div className="space-y-2">
                      <Label htmlFor="customer_type">Kundentyp *</Label>
                      <Select value={formData.customer_type} onValueChange={(v) => setFormData({...formData, customer_type: v})}>
                        <SelectTrigger id="customer_type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pk">PK (Privatkunde)</SelectItem>
                          <SelectItem value="kmu">KMU (Geschäftskunde)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Anzeigename (Karte)</Label>
                      <Input
                        id="display_name"
                        value={formData.display_name}
                        onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                        placeholder="z.B. 150 oder FiberBasic 100"
                      />
                      <p className="text-xs text-muted-foreground">
                        Text der groß auf der Tarif-Karte angezeigt wird. Leer = automatisch aus Geschwindigkeit.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Beschreibung</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="z.B. Internet-Flatrate"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="info_text">Info-Text (Hover)</Label>
                    <Input
                      id="info_text"
                      value={formData.info_text}
                      onChange={(e) => setFormData({...formData, info_text: e.target.value})}
                      placeholder="Text der beim Hover über das Info-Icon erscheint"
                    />
                    <p className="text-xs text-muted-foreground">
                      Wenn ausgefüllt, erscheint ein "i"-Icon neben dem Produkt.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="external_link_url">Externer Link (URL)</Label>
                      <Input
                        id="external_link_url"
                        value={formData.external_link_url}
                        onChange={(e) => setFormData({...formData, external_link_url: e.target.value})}
                        placeholder="https://comin-glasfaser.de/privatkunden/#produkthinweise"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="external_link_label">Link-Beschriftung</Label>
                      <Input
                        id="external_link_label"
                        value={formData.external_link_label}
                        onChange={(e) => setFormData({...formData, external_link_label: e.target.value})}
                        placeholder="Produkthinweise"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthly_price">Monatspreis (€) *</Label>
                      <Input
                        id="monthly_price"
                        type="number"
                        step="0.01"
                        value={formData.monthly_price}
                        onChange={(e) => setFormData({...formData, monthly_price: parseFloat(e.target.value) || 0})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setup_fee">Bereitstellung (€)</Label>
                      <Input
                        id="setup_fee"
                        type="number"
                        step="0.01"
                        value={formData.setup_fee}
                        onChange={(e) => setFormData({...formData, setup_fee: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contract_months">Laufzeit (Monate)</Label>
                      <Input
                        id="contract_months"
                        type="number"
                        value={formData.contract_months}
                        onChange={(e) => setFormData({...formData, contract_months: parseInt(e.target.value) || 24})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Geschwindigkeiten (Transparenzverordnung)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="download_speed">Download Max (Mbit/s)</Label>
                        <Input
                          id="download_speed"
                          type="number"
                          value={formData.download_speed}
                          onChange={(e) => setFormData({...formData, download_speed: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="upload_speed">Upload Max (Mbit/s)</Label>
                        <Input
                          id="upload_speed"
                          type="number"
                          value={formData.upload_speed}
                          onChange={(e) => setFormData({...formData, upload_speed: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="download_speed_normal">Download Normal (Mbit/s)</Label>
                        <Input
                          id="download_speed_normal"
                          type="number"
                          value={formData.download_speed_normal}
                          onChange={(e) => setFormData({...formData, download_speed_normal: parseInt(e.target.value) || 0})}
                          placeholder="Normalerweise zur Verfügung stehend"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="upload_speed_normal">Upload Normal (Mbit/s)</Label>
                        <Input
                          id="upload_speed_normal"
                          type="number"
                          value={formData.upload_speed_normal}
                          onChange={(e) => setFormData({...formData, upload_speed_normal: parseInt(e.target.value) || 0})}
                          placeholder="Normalerweise zur Verfügung stehend"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="download_speed_min">Download Min (Mbit/s)</Label>
                        <Input
                          id="download_speed_min"
                          type="number"
                          value={formData.download_speed_min}
                          onChange={(e) => setFormData({...formData, download_speed_min: parseInt(e.target.value) || 0})}
                          placeholder="Mindestgeschwindigkeit"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="upload_speed_min">Upload Min (Mbit/s)</Label>
                        <Input
                          id="upload_speed_min"
                          type="number"
                          value={formData.upload_speed_min}
                          onChange={(e) => setFormData({...formData, upload_speed_min: parseInt(e.target.value) || 0})}
                          placeholder="Mindestgeschwindigkeit"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Diese Werte werden in der Vertragszusammenfassung (VZF) gemäß EU-Transparenzverordnung angezeigt.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product_id_k7">Produkt ID K7</Label>
                      <Input
                        id="product_id_k7"
                        value={formData.product_id_k7}
                        onChange={(e) => setFormData({...formData, product_id_k7: e.target.value})}
                      />
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
                        <Label htmlFor="is_ftth_limited">FTTH Limited verfügbar</Label>
                        <Switch
                          id="is_ftth_limited"
                          checked={formData.is_ftth_limited}
                          onCheckedChange={(checked) => setFormData({...formData, is_ftth_limited: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="includes_phone">Telefon inkludiert</Label>
                        <Switch
                          id="includes_phone"
                          checked={formData.includes_phone}
                          onCheckedChange={(checked) => setFormData({...formData, includes_phone: checked})}
                        />
                      </div>
                      {formData.includes_phone && (
                        <div className="col-span-2 space-y-2 bg-muted/50 p-3 rounded-lg">
                          <Label htmlFor="phone_terms_text">Telefon-Konditionen (für VZF)</Label>
                          <textarea
                            id="phone_terms_text"
                            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                            value={formData.phone_terms_text}
                            onChange={(e) => setFormData({...formData, phone_terms_text: e.target.value})}
                            placeholder="z.B. Festnetz-Flatrate ins deutsche Festnetz. Mobilfunk Anrufe 17,9 ct/Min."
                          />
                          <p className="text-xs text-muted-foreground">
                            Dieser Text erscheint in der VZF unter den Telefon-Konditionen.
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="includes_fiber_tv">FiberTV inkludiert</Label>
                        <Switch
                          id="includes_fiber_tv"
                          checked={formData.includes_fiber_tv}
                          onCheckedChange={(checked) => setFormData({...formData, includes_fiber_tv: checked})}
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
                      <div className="flex items-center justify-between col-span-2 bg-muted/50 p-3 rounded-lg">
                        <div>
                          <Label htmlFor="hide_for_ftth">Bei FTTH verstecken</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Zeigt dieses Produkt bei FTTH nur unter "Weitere Optionen"
                          </p>
                        </div>
                        <Switch
                          id="hide_for_ftth"
                          checked={formData.hide_for_ftth}
                          onCheckedChange={(checked) => setFormData({...formData, hide_for_ftth: checked})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button type="submit">
                      {editingProduct ? 'Speichern' : 'Erstellen'}
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
          <div className="space-y-6">
            {/* Active Products */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produkt</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Geschwindigkeit</TableHead>
                    <TableHead>Preis</TableHead>
                    <TableHead>Verfügbarkeit</TableHead>
                    <TableHead>K7 ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Keine aktiven Produkte gefunden.
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeProducts.map((product) => (
                      <TableRow key={product.id} className={!product.is_active ? 'opacity-50' : ''}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{product.name}</span>
                            <br />
                            <span className="text-xs text-muted-foreground">{product.slug}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.customer_type === 'kmu' ? 'secondary' : 'outline'}>
                            {product.customer_type === 'kmu' ? 'KMU' : 'PK'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {product.download_speed && product.upload_speed ? (
                            <span>{product.download_speed}/{product.upload_speed} Mbit/s</span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{product.monthly_price.toFixed(2)} €/Monat</span>
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {product.setup_fee > 0 ? `+ ${product.setup_fee.toFixed(2)} € einmalig` : 'Keine Einrichtung'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {product.is_ftth && <Badge variant="default">FTTH</Badge>}
                            {product.is_ftth_limited && <Badge variant="outline" className="border-accent text-accent">Limited</Badge>}
                            {product.is_fttb && <Badge variant="secondary">FTTB</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.product_id_k7 ? (
                            <span className="text-sm">{product.product_id_k7}</span>
                          ) : (
                            <div className="flex items-center gap-1 text-warning">
                              <AlertTriangle className="w-3 h-3" />
                              <span className="text-xs">Fehlt</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={product.is_active}
                            onCheckedChange={() => toggleActive(product)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCopyProduct(product)}
                              title="Kopieren"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOptionAssignmentProduct({ id: product.id, name: product.name })}
                              title="Optionen zuweisen"
                            >
                              <Link className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAssignmentProduct({ id: product.id, name: product.name })}
                              title="Gebäude zuweisen"
                            >
                              <Building2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(product)}
                              title="Bearbeiten"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchiveProduct(product)}
                              title="Archivieren"
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteProduct(product)}
                              title="Löschen"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Archived Products */}
            {showArchived && archivedProducts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Archive className="w-4 h-4" />
                  Archivierte Produkte ({archivedProducts.length})
                </h3>
                <div className="border rounded-lg overflow-hidden bg-muted/30">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produkt</TableHead>
                        <TableHead>Preis</TableHead>
                        <TableHead>Archiviert am</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archivedProducts.map((product) => (
                        <TableRow key={product.id} className="opacity-60">
                          <TableCell>
                            <div>
                              <span className="font-medium">{product.name}</span>
                              <br />
                              <span className="text-xs text-muted-foreground">{product.slug}</span>
                            </div>
                          </TableCell>
                          <TableCell>{product.monthly_price.toFixed(2)} €/Monat</TableCell>
                          <TableCell>
                            {product.archived_at ? new Date(product.archived_at).toLocaleDateString('de-DE') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchiveProduct(product)}
                                title="Wiederherstellen"
                              >
                                <ArchiveRestore className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteProduct(product)}
                                title="Endgültig löschen"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Product-Building Assignment Dialog */}
        {assignmentProduct && (
          <ProductBuildingAssignment
            mode="product"
            entityId={assignmentProduct.id}
            entityName={assignmentProduct.name}
            open={!!assignmentProduct}
            onOpenChange={(open) => !open && setAssignmentProduct(null)}
            onUpdate={fetchProducts}
          />
        )}

        {/* Product-Option Assignment Dialog */}
        {optionAssignmentProduct && (
          <ProductOptionAssignment
            productId={optionAssignmentProduct.id}
            productName={optionAssignmentProduct.name}
            open={!!optionAssignmentProduct}
            onOpenChange={(open) => !open && setOptionAssignmentProduct(null)}
            onUpdate={fetchProducts}
          />
        )}

        {/* Copy Product Dialog */}
        <Dialog open={!!copyProduct} onOpenChange={(open) => !open && setCopyProduct(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Produkt kopieren</DialogTitle>
              <DialogDescription>
                Erstelle eine Kopie von "{copyProduct?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copyAvailability"
                  checked={copyOptions.copyAvailability}
                  onCheckedChange={(checked) => 
                    setCopyOptions({ ...copyOptions, copyAvailability: checked === true })
                  }
                />
                <Label htmlFor="copyAvailability">Verfügbarkeit kopieren (FTTH/FTTB/Limited)</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copyProductOptions"
                  checked={copyOptions.copyProductOptions}
                  disabled={!productExtras[copyProduct?.id || '']?.hasOptions}
                  onCheckedChange={(checked) => 
                    setCopyOptions({ ...copyOptions, copyProductOptions: checked === true })
                  }
                />
                <Label 
                  htmlFor="copyProductOptions"
                  className={!productExtras[copyProduct?.id || '']?.hasOptions ? 'text-muted-foreground' : ''}
                >
                  Optionen kopieren 
                  {!productExtras[copyProduct?.id || '']?.hasOptions && ' (keine vorhanden)'}
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copyBuildingAssignments"
                  checked={copyOptions.copyBuildingAssignments}
                  disabled={!productExtras[copyProduct?.id || '']?.hasBuildings}
                  onCheckedChange={(checked) => 
                    setCopyOptions({ ...copyOptions, copyBuildingAssignments: checked === true })
                  }
                />
                <Label 
                  htmlFor="copyBuildingAssignments"
                  className={!productExtras[copyProduct?.id || '']?.hasBuildings ? 'text-muted-foreground' : ''}
                >
                  Gebäudezuweisungen kopieren
                  {!productExtras[copyProduct?.id || '']?.hasBuildings && ' (keine vorhanden)'}
                </Label>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Die K7-IDs werden nicht kopiert und müssen manuell vergeben werden.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCopyProduct(null)}>
                Abbrechen
              </Button>
              <Button onClick={handleCopyProduct} disabled={copying}>
                {copying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Kopieren
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Product Dialog */}
        <AlertDialog open={!!deleteProduct} onOpenChange={(open) => {
          if (!open) {
            setDeleteProduct(null);
            setDeleteConfirmText('');
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Produkt endgültig löschen?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  Möchtest du das Produkt <strong>"{deleteProduct?.name}"</strong> wirklich endgültig löschen?
                </p>
                <p className="text-destructive font-medium">
                  Diese Aktion kann nicht rückgängig gemacht werden! Alle zugehörigen Optionen und Gebäudezuweisungen werden ebenfalls gelöscht.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="deleteConfirm">
                    Gib <span className="font-mono font-bold">LÖSCHEN</span> ein, um zu bestätigen:
                  </Label>
                  <Input
                    id="deleteConfirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="LÖSCHEN"
                    className="font-mono"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteProduct(null);
                setDeleteConfirmText('');
              }}>
                Abbrechen
              </AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleDeleteProduct}
                disabled={deleteConfirmText !== 'LÖSCHEN' || deleting}
              >
                {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Endgültig löschen
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
