import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
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
  Search, 
  Upload, 
  Wrench, 
  Loader2,
  CircleDot,
  AlertTriangle,
  Building2,
  Undo2,
  RefreshCw,
  Package,
  Trash2,
  Tag,
  Database
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CSVImportDialog } from './CSVImportDialog';
import { CSVImportUndoButton } from './CSVImportUndoButton';
import { ProductBuildingAssignment } from './ProductBuildingAssignment';
import { PromotionBuildingAssignment } from './PromotionBuildingAssignment';
import { BuildingK7ServicesManager } from './BuildingK7ServicesManager';
import { K7DataImportDialog } from './K7DataImportDialog';
import { K7ImportUndoButton } from './K7ImportUndoButton';

interface Building {
  id: string;
  street: string;
  house_number: string;
  postal_code: string | null;
  city: string;
  residential_units: number;
  building_type: 'efh' | 'mfh' | 'wowi' | null;
  building_type_manual: 'efh' | 'mfh' | 'wowi' | null;
  tiefbau_done: boolean;
  apl_set: boolean;
  ausbau_art: 'ftth' | 'fttb' | 'ftth_limited' | null;
  ausbau_status: 'abgeschlossen' | 'im_ausbau' | 'geplant';
  kabel_tv_available: boolean;
  gnv_vorhanden: boolean;
  gebaeude_id_v2: string | null;
  gebaeude_id_k7: string | null;
  is_manual_entry: boolean;
  has_manual_override: boolean;
  manual_override_active: boolean;
  pk_tariffs_available: boolean;
  kmu_tariffs_available: boolean;
  created_at: string;
  updated_at: string;
}

const getBuildingTypeLabel = (type: 'efh' | 'mfh' | 'wowi' | null) => {
  switch (type) {
    case 'efh': return 'EFH';
    case 'mfh': return 'MFH';
    case 'wowi': return 'WoWi';
    default: return '-';
  }
};

export const BuildingsManager = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [assignmentBuilding, setAssignmentBuilding] = useState<{ id: string; name: string } | null>(null);
  const [promotionBuilding, setPromotionBuilding] = useState<{ id: string; name: string } | null>(null);
  const [buildingsWithProducts, setBuildingsWithProducts] = useState<Set<string>>(new Set());
  const [buildingsWithPromotions, setBuildingsWithPromotions] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    street: '',
    house_number: '',
    postal_code: '',
    city: 'Falkensee',
    residential_units: 1,
    tiefbau_done: false,
    apl_set: false,
    ausbau_art: '' as 'ftth' | 'fttb' | 'ftth_limited' | '',
    ausbau_status: 'geplant' as 'abgeschlossen' | 'im_ausbau' | 'geplant',
    kabel_tv_available: false,
    gnv_vorhanden: false,
    gebaeude_id_v2: '',
    gebaeude_id_k7: '',
    pk_tariffs_available: true,
    kmu_tariffs_available: true,
  });

  // Only fetch when search term has 3+ characters
  useEffect(() => {
    if (searchTerm.length >= 3) {
      fetchBuildings(searchTerm);
    } else {
      setBuildings([]);
      setBuildingsWithProducts(new Set());
      setLoading(false);
    }
  }, [searchTerm]);

  const fetchBuildings = async (search?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('buildings')
        .select('*')
        .order('street', { ascending: true })
        .limit(100); // Limit results for performance

      if (search && search.length >= 3) {
        // Search by street, house_number or city
        query = query.or(`street.ilike.%${search}%,house_number.ilike.%${search}%,city.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      const buildingsList = (data as Building[]) || [];
      setBuildings(buildingsList);

      // Fetch which buildings have manual product and promotion assignments
      if (buildingsList.length > 0) {
        const buildingIds = buildingsList.map(b => b.id);
        
        // Fetch product assignments
        const { data: productBuildings, error: pbError } = await supabase
          .from('product_buildings')
          .select('building_id')
          .in('building_id', buildingIds);

        if (!pbError && productBuildings) {
          const uniqueBuildingIds = new Set(productBuildings.map((pb: any) => pb.building_id));
          setBuildingsWithProducts(uniqueBuildingIds);
        }

        // Fetch promotion assignments
        const { data: promotionBuildings, error: promError } = await supabase
          .from('promotion_buildings')
          .select('building_id')
          .in('building_id', buildingIds);

        if (!promError && promotionBuildings) {
          const uniquePromotionIds = new Set(promotionBuildings.map((pb: any) => pb.building_id));
          setBuildingsWithPromotions(uniquePromotionIds);
        }
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
      toast({
        title: 'Fehler',
        description: 'Gebäude konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const buildingData = {
        ...formData,
        ausbau_art: formData.ausbau_art || null,
        postal_code: formData.postal_code || null,
        gebaeude_id_v2: formData.gebaeude_id_v2 || null,
        gebaeude_id_k7: formData.gebaeude_id_k7 || null,
        is_manual_entry: true,
        has_manual_override: !!editingBuilding,
        manual_override_active: true,
      };

      if (editingBuilding) {
        const { error } = await supabase
          .from('buildings')
          .update(buildingData)
          .eq('id', editingBuilding.id);
        
        if (error) throw error;
        toast({ title: 'Erfolg', description: 'Gebäude wurde aktualisiert.' });
      } else {
        const { error } = await supabase
          .from('buildings')
          .insert([buildingData]);
        
        if (error) throw error;
        toast({ title: 'Erfolg', description: 'Gebäude wurde erstellt.' });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchBuildings(searchTerm);
    } catch (error: any) {
      console.error('Error saving building:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Gebäude konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      street: '',
      house_number: '',
      postal_code: '',
      city: 'Falkensee',
      residential_units: 1,
      tiefbau_done: false,
      apl_set: false,
      ausbau_art: '',
      ausbau_status: 'geplant',
      kabel_tv_available: false,
      gnv_vorhanden: false,
      gebaeude_id_v2: '',
      gebaeude_id_k7: '',
      pk_tariffs_available: true,
      kmu_tariffs_available: true,
    });
    setEditingBuilding(null);
  };

  const openEditDialog = async (building: Building) => {
    setEditingBuilding(building);
    
    // Fetch K7 service ID if not already set on building
    let k7Id = building.gebaeude_id_k7 || '';
    if (!k7Id) {
      try {
        const { data: k7Services } = await supabase
          .from('building_k7_services')
          .select('std_kabel_gebaeude_id')
          .eq('building_id', building.id)
          .not('std_kabel_gebaeude_id', 'is', null)
          .limit(1);
        
        if (k7Services && k7Services.length > 0 && k7Services[0].std_kabel_gebaeude_id) {
          k7Id = k7Services[0].std_kabel_gebaeude_id;
        }
      } catch (error) {
        console.error('Error fetching K7 ID:', error);
      }
    }
    
    setFormData({
      street: building.street,
      house_number: building.house_number,
      postal_code: building.postal_code || '',
      city: building.city,
      residential_units: building.residential_units,
      tiefbau_done: building.tiefbau_done,
      apl_set: building.apl_set,
      ausbau_art: building.ausbau_art || '',
      ausbau_status: building.ausbau_status,
      kabel_tv_available: building.kabel_tv_available,
      gnv_vorhanden: building.gnv_vorhanden,
      gebaeude_id_v2: building.gebaeude_id_v2 || '',
      gebaeude_id_k7: k7Id,
      pk_tariffs_available: building.pk_tariffs_available ?? true,
      kmu_tariffs_available: building.kmu_tariffs_available ?? true,
    });
    setIsDialogOpen(true);
  };

  const toggleManualOverride = async (building: Building) => {
    try {
      const { error } = await supabase
        .from('buildings')
        .update({ manual_override_active: !building.manual_override_active })
        .eq('id', building.id);
      
      if (error) throw error;
      fetchBuildings(searchTerm);
      toast({
        title: 'Erfolg',
        description: `Manuelle Änderungen ${!building.manual_override_active ? 'aktiviert' : 'deaktiviert'}.`,
      });
    } catch (error) {
      console.error('Error toggling override:', error);
    }
  };

  const deleteBuilding = async (building: Building) => {
    if (!confirm(`Möchten Sie das Gebäude "${building.street} ${building.house_number}, ${building.city}" wirklich löschen?`)) {
      return;
    }
    
    try {
      // First delete any product_buildings associations
      await supabase
        .from('product_buildings')
        .delete()
        .eq('building_id', building.id);

      // Then delete the building
      const { error } = await supabase
        .from('buildings')
        .delete()
        .eq('id', building.id);
      
      if (error) throw error;
      
      toast({ title: 'Erfolg', description: 'Gebäude wurde gelöscht.' });
      fetchBuildings(searchTerm);
    } catch (error: any) {
      console.error('Error deleting building:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Gebäude konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
    }
  };

  const deleteAllBuildings = async () => {
    if (!confirm('ACHTUNG: Möchten Sie wirklich ALLE Gebäude löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) {
      return;
    }
    if (!confirm('Sind Sie ABSOLUT sicher? Alle Gebäudedaten werden unwiderruflich gelöscht!')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // First delete all product_buildings associations
      const { error: pbError } = await supabase
        .from('product_buildings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (pbError) throw pbError;

      // Then delete all buildings
      const { error } = await supabase
        .from('buildings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (error) throw error;
      
      toast({ title: 'Erfolg', description: 'Alle Gebäude wurden gelöscht.' });
      setBuildings([]);
    } catch (error: any) {
      console.error('Error deleting all buildings:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Gebäude konnten nicht gelöscht werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Natural sorting helper for house numbers (1, 2, 3, 4a, 4b, 10, 10a, etc.)
  const naturalSort = (a: string, b: string): number => {
    const regex = /(\d+)|(\D+)/g;
    const aParts = a.match(regex) || [];
    const bParts = b.match(regex) || [];
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || '';
      const bPart = bParts[i] || '';
      
      const aNum = parseInt(aPart, 10);
      const bNum = parseInt(bPart, 10);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        if (aNum !== bNum) return aNum - bNum;
      } else {
        const cmp = aPart.localeCompare(bPart);
        if (cmp !== 0) return cmp;
      }
    }
    return 0;
  };

  // Sort buildings alphabetically by street, then naturally by house number
  const filteredBuildings = [...buildings].sort((a, b) => {
    const streetCompare = a.street.localeCompare(b.street, 'de');
    if (streetCompare !== 0) return streetCompare;
    return naturalSort(a.house_number, b.house_number);
  });

  const StatusIndicator = ({ active, label }: { active: boolean; label: string }) => (
    <div className="flex items-center gap-1">
      <CircleDot className={`w-3 h-3 ${active ? 'text-success' : 'text-destructive'}`} />
      <span className="text-xs">{label}</span>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Gebäude / Objekte
            </CardTitle>
            <CardDescription>
              Verwalten Sie alle Gebäude und deren Anschlussstatus.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchBuildings(searchTerm)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Aktualisieren
            </Button>
            <CSVImportUndoButton onUndoComplete={() => fetchBuildings(searchTerm)} />
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              CSV Import
            </Button>
            <K7DataImportDialog onImportComplete={() => fetchBuildings(searchTerm)} />
            <K7ImportUndoButton onUndoComplete={() => fetchBuildings(searchTerm)} />
            <Button variant="destructive" size="sm" onClick={deleteAllBuildings}>
              <Trash2 className="w-4 h-4 mr-2" />
              Alle löschen
            </Button>
            <CSVImportDialog 
              open={isImportOpen} 
              onOpenChange={setIsImportOpen} 
              onImportComplete={() => fetchBuildings(searchTerm)}
            />
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
                    {editingBuilding ? 'Gebäude bearbeiten' : 'Neues Gebäude'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingBuilding ? 'Änderungen werden als manuelle Überschreibung markiert.' : 'Fügen Sie ein neues Gebäude hinzu.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="street">Straße *</Label>
                      <Input
                        id="street"
                        value={formData.street}
                        onChange={(e) => setFormData({...formData, street: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="house_number">Hausnummer *</Label>
                      <Input
                        id="house_number"
                        value={formData.house_number}
                        onChange={(e) => setFormData({...formData, house_number: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">PLZ</Label>
                      <Input
                        id="postal_code"
                        value={formData.postal_code}
                        onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Stadt *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="residential_units">Wohneinheiten (WE)</Label>
                      <Input
                        id="residential_units"
                        type="number"
                        min="1"
                        value={formData.residential_units}
                        onChange={(e) => setFormData({...formData, residential_units: parseInt(e.target.value) || 1})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ausbau_art">Ausbauart</Label>
                      <Select
                        value={formData.ausbau_art}
                        onValueChange={(value) => setFormData({...formData, ausbau_art: value as 'ftth' | 'fttb' | 'ftth_limited' | ''})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Auswählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ftth">FTTH</SelectItem>
                          <SelectItem value="ftth_limited">FTTH Limited (bis 500 Mbit/s)</SelectItem>
                          <SelectItem value="fttb">FTTB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ausbau_status">Ausbaustatus</Label>
                      <Select
                        value={formData.ausbau_status}
                        onValueChange={(value) => setFormData({...formData, ausbau_status: value as 'abgeschlossen' | 'im_ausbau' | 'geplant'})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                          <SelectItem value="im_ausbau">Im Ausbau</SelectItem>
                          <SelectItem value="geplant">Geplant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gebaeude_id_v2">Gebäude ID V2</Label>
                      <Input
                        id="gebaeude_id_v2"
                        value={formData.gebaeude_id_v2}
                        onChange={(e) => setFormData({...formData, gebaeude_id_v2: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gebaeude_id_k7">Gebäude ID K7</Label>
                      <Input
                        id="gebaeude_id_k7"
                        value={formData.gebaeude_id_k7}
                        onChange={(e) => setFormData({...formData, gebaeude_id_k7: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Status</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="tiefbau_done">Tiefbau erledigt</Label>
                        <Switch
                          id="tiefbau_done"
                          checked={formData.tiefbau_done}
                          onCheckedChange={(checked) => setFormData({...formData, tiefbau_done: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="apl_set">APL gesetzt</Label>
                        <Switch
                          id="apl_set"
                          checked={formData.apl_set}
                          onCheckedChange={(checked) => setFormData({...formData, apl_set: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="kabel_tv_available">Kabel TV verfügbar</Label>
                        <Switch
                          id="kabel_tv_available"
                          checked={formData.kabel_tv_available}
                          onCheckedChange={(checked) => setFormData({...formData, kabel_tv_available: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="gnv_vorhanden">GNV vorhanden</Label>
                        <Switch
                          id="gnv_vorhanden"
                          checked={formData.gnv_vorhanden}
                          onCheckedChange={(checked) => setFormData({...formData, gnv_vorhanden: checked})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Tarif-Verfügbarkeit</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="pk_tariffs_available">PK-Tarife verfügbar</Label>
                        <Switch
                          id="pk_tariffs_available"
                          checked={formData.pk_tariffs_available}
                          onCheckedChange={(checked) => setFormData({...formData, pk_tariffs_available: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="kmu_tariffs_available">KMU-Tarife verfügbar</Label>
                        <Switch
                          id="kmu_tariffs_available"
                          checked={formData.kmu_tariffs_available}
                          onCheckedChange={(checked) => setFormData({...formData, kmu_tariffs_available: checked})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button type="submit">
                      {editingBuilding ? 'Speichern' : 'Erstellen'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Mindestens 3 Buchstaben eingeben um zu suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchTerm.length > 0 && searchTerm.length < 3 && (
            <p className="text-sm text-muted-foreground mt-2">
              Bitte geben Sie mindestens 3 Zeichen ein, um die Suche zu starten.
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>WE</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Ausbau</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IDs</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBuildings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchTerm.length < 3 
                        ? 'Geben Sie mindestens 3 Zeichen ein, um Gebäude zu suchen.'
                        : 'Keine Gebäude gefunden.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBuildings.map((building) => (
                    <TableRow key={building.id}>
                      <TableCell>
                        {(building.is_manual_entry || building.has_manual_override) && (
                          <span title="Manuell bearbeitet">
                            <Wrench className="w-4 h-4 text-accent" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{building.street} {building.house_number}</span>
                          <br />
                          <span className="text-sm text-muted-foreground">
                            {building.postal_code && `${building.postal_code} `}{building.city}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{building.residential_units}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {getBuildingTypeLabel(building.building_type_manual || building.building_type)}
                          {building.building_type_manual && (
                            <Wrench className="w-3 h-3 ml-1 inline" />
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {building.ausbau_art && (
                            <Badge variant={building.ausbau_art === 'ftth' ? 'default' : building.ausbau_art === 'ftth_limited' ? 'outline' : 'secondary'}>
                              {building.ausbau_art === 'ftth_limited' ? 'FTTH ≤500' : building.ausbau_art.toUpperCase()}
                            </Badge>
                          )}
                          <div className="text-xs text-muted-foreground capitalize">
                            {building.ausbau_status.replace('_', ' ')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <StatusIndicator active={building.tiefbau_done} label="Tiefbau" />
                          <StatusIndicator active={building.apl_set} label="APL" />
                          <StatusIndicator active={building.kabel_tv_available} label="Kabel TV" />
                          <StatusIndicator active={building.gnv_vorhanden} label="GNV" />
                          <StatusIndicator active={building.pk_tariffs_available} label="PK" />
                          <StatusIndicator active={building.kmu_tariffs_available} label="KMU" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          {building.gebaeude_id_v2 ? (
                            <div>V2: {building.gebaeude_id_v2}</div>
                          ) : (
                            <div className="flex items-center gap-1 text-warning">
                              <AlertTriangle className="w-3 h-3" />
                              V2 fehlt
                            </div>
                          )}
                          {building.gebaeude_id_k7 ? (
                            <div>K7: {building.gebaeude_id_k7}</div>
                          ) : (
                            <div className="flex items-center gap-1 text-warning">
                              <AlertTriangle className="w-3 h-3" />
                              K7 fehlt
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <BuildingK7ServicesManager
                            buildingId={building.id}
                            buildingAddress={`${building.street} ${building.house_number}, ${building.city}`}
                            gebaudeIdK7={building.gebaeude_id_k7}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAssignmentBuilding({ 
                              id: building.id, 
                              name: `${building.street} ${building.house_number}, ${building.city}` 
                            })}
                            title={buildingsWithProducts.has(building.id) 
                              ? "Produkte zugewiesen - Klicken zum Bearbeiten" 
                              : "Produkte zuweisen"}
                            className={buildingsWithProducts.has(building.id) 
                              ? "text-accent" 
                              : ""}
                          >
                            <Package className={cn(
                              "w-4 h-4",
                              buildingsWithProducts.has(building.id) && "text-accent animate-pulse"
                            )} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPromotionBuilding({ 
                              id: building.id, 
                              name: `${building.street} ${building.house_number}, ${building.city}` 
                            })}
                            title={buildingsWithPromotions.has(building.id) 
                              ? "Aktionen zugewiesen - Klicken zum Bearbeiten" 
                              : "Aktionen zuweisen"}
                            className={buildingsWithPromotions.has(building.id) 
                              ? "text-primary" 
                              : ""}
                          >
                            <Tag className={cn(
                              "w-4 h-4",
                              buildingsWithPromotions.has(building.id) && "text-primary animate-pulse"
                            )} />
                          </Button>
                          {building.has_manual_override && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleManualOverride(building)}
                              aria-label={building.manual_override_active ? 'Manuelle Änderungen deaktivieren' : 'Manuelle Änderungen aktivieren'}
                            >
                              <Wrench className={`w-4 h-4 ${building.manual_override_active ? 'text-accent' : 'text-muted-foreground'}`} />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(building)}
                          >
                            Bearbeiten
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBuilding(building)}
                            className="text-destructive hover:text-destructive"
                            title="Löschen"
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
        )}

        {/* Building-Product Assignment Dialog */}
        {assignmentBuilding && (
          <ProductBuildingAssignment
            mode="building"
            entityId={assignmentBuilding.id}
            entityName={assignmentBuilding.name}
            open={!!assignmentBuilding}
            onOpenChange={(open) => !open && setAssignmentBuilding(null)}
            onUpdate={() => fetchBuildings(searchTerm)}
          />
        )}

        {/* Building-Promotion Assignment Dialog */}
        {promotionBuilding && (
          <PromotionBuildingAssignment
            buildingId={promotionBuilding.id}
            buildingName={promotionBuilding.name}
            open={!!promotionBuilding}
            onOpenChange={(open) => !open && setPromotionBuilding(null)}
          />
        )}
      </CardContent>
    </Card>
  );
};
