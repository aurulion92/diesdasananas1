import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

export const PromotionsManager = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [buildingSearch, setBuildingSearch] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    is_global: false,
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

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, street, house_number, city')
        .order('street', { ascending: true });

      if (error) throw error;
      setBuildings((data as Building[]) || []);
    } catch (error) {
      console.error('Error fetching buildings:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const promotionData = {
        name: formData.name,
        code: formData.code || null,
        description: formData.description || null,
        is_global: formData.is_global,
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

      // Update building assignments if not global
      if (!formData.is_global) {
        // Delete existing
        await supabase
          .from('promotion_buildings')
          .delete()
          .eq('promotion_id', promotionId);

        // Insert new
        if (selectedBuildings.length > 0) {
          const buildingAssignments = selectedBuildings.map(buildingId => ({
            promotion_id: promotionId,
            building_id: buildingId,
          }));

          const { error: assignError } = await supabase
            .from('promotion_buildings')
            .insert(buildingAssignments);

          if (assignError) throw assignError;
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
      is_global: false,
      is_active: true,
      requires_customer_number: false,
      available_text: '',
      unavailable_text: '',
      start_date: '',
      end_date: '',
    });
    setEditingPromotion(null);
    setSelectedBuildings([]);
  };

  const openEditDialog = async (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      code: promotion.code || '',
      description: promotion.description || '',
      is_global: promotion.is_global,
      is_active: promotion.is_active,
      requires_customer_number: promotion.requires_customer_number,
      available_text: promotion.available_text || '',
      unavailable_text: promotion.unavailable_text || '',
      start_date: promotion.start_date || '',
      end_date: promotion.end_date || '',
    });
    
    if (!promotion.is_global) {
      await fetchPromotionBuildings(promotion.id);
    }
    
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

  const filteredBuildings = buildings.filter(b =>
    `${b.street} ${b.house_number} ${b.city}`.toLowerCase().includes(buildingSearch.toLowerCase())
  );

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
              Verwalten Sie Aktionscodes und Promotions.
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
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPromotion ? 'Aktion bearbeiten' : 'Neue Aktion'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingPromotion ? 'Bearbeiten Sie die Aktion.' : 'Erstellen Sie eine neue Aktion.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
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

                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Optionen</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="is_global">Global (alle Adressen)</Label>
                        <Switch
                          id="is_global"
                          checked={formData.is_global}
                          onCheckedChange={(checked) => setFormData({...formData, is_global: checked})}
                        />
                      </div>
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

                  {!formData.is_global && (
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-medium">Gültige Objekte ({selectedBuildings.length} ausgewählt)</h4>
                      <Input
                        placeholder="Objekte suchen..."
                        value={buildingSearch}
                        onChange={(e) => setBuildingSearch(e.target.value)}
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
                  <TableHead>Typ</TableHead>
                  <TableHead>Zeitraum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                        <div className="flex items-center gap-1">
                          {promotion.is_global ? (
                            <>
                              <Globe className="w-4 h-4 text-success" />
                              <span className="text-sm">Global</span>
                            </>
                          ) : (
                            <>
                              <Building2 className="w-4 h-4 text-primary" />
                              <span className="text-sm">Objektbezogen</span>
                            </>
                          )}
                        </div>
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
