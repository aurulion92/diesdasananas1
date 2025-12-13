import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Link
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

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  setup_fee: number;
  download_speed: number | null;
  upload_speed: number | null;
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
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    monthly_price: 0,
    setup_fee: 99,
    download_speed: 0,
    upload_speed: 0,
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
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('display_order', { ascending: true });

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
        description: formData.description || null,
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
      description: '',
      monthly_price: 0,
      setup_fee: 99,
      download_speed: 0,
      upload_speed: 0,
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
    });
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      monthly_price: product.monthly_price,
      setup_fee: product.setup_fee,
      download_speed: product.download_speed || 0,
      upload_speed: product.upload_speed || 0,
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
          <div className="flex gap-2">
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Beschreibung</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="download_speed">Download (Mbit/s)</Label>
                      <Input
                        id="download_speed"
                        type="number"
                        value={formData.download_speed}
                        onChange={(e) => setFormData({...formData, download_speed: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="upload_speed">Upload (Mbit/s)</Label>
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
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produkt</TableHead>
                  <TableHead>Geschwindigkeit</TableHead>
                  <TableHead>Preis</TableHead>
                  <TableHead>Verfügbarkeit</TableHead>
                  <TableHead>K7 ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Keine Produkte gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id} className={!product.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{product.name}</span>
                          <br />
                          <span className="text-xs text-muted-foreground">{product.slug}</span>
                        </div>
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
                        <div className="flex justify-end gap-2">
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
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(product)}
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
      </CardContent>
    </Card>
  );
};
