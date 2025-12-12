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
  Search, 
  Upload, 
  Wrench, 
  Loader2,
  CircleDot,
  AlertTriangle,
  Building2,
  RefreshCw
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  ausbau_art: 'ftth' | 'fttb' | null;
  ausbau_status: 'abgeschlossen' | 'im_ausbau' | 'geplant';
  kabel_tv_available: boolean;
  gebaeude_id_v2: string | null;
  gebaeude_id_k7: string | null;
  is_manual_entry: boolean;
  has_manual_override: boolean;
  manual_override_active: boolean;
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
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
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
    ausbau_art: '' as 'ftth' | 'fttb' | '',
    ausbau_status: 'geplant' as 'abgeschlossen' | 'im_ausbau' | 'geplant',
    kabel_tv_available: false,
    gebaeude_id_v2: '',
    gebaeude_id_k7: '',
  });

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('street', { ascending: true });

      if (error) throw error;
      setBuildings((data as Building[]) || []);
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
      fetchBuildings();
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
      gebaeude_id_v2: '',
      gebaeude_id_k7: '',
    });
    setEditingBuilding(null);
  };

  const openEditDialog = (building: Building) => {
    setEditingBuilding(building);
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
      gebaeude_id_v2: building.gebaeude_id_v2 || '',
      gebaeude_id_k7: building.gebaeude_id_k7 || '',
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
      fetchBuildings();
      toast({
        title: 'Erfolg',
        description: `Manuelle Änderungen ${!building.manual_override_active ? 'aktiviert' : 'deaktiviert'}.`,
      });
    } catch (error) {
      console.error('Error toggling override:', error);
    }
  };

  const filteredBuildings = buildings.filter(b => 
    b.street.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.house_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchBuildings}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Aktualisieren
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              CSV Import
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
                        onValueChange={(value) => setFormData({...formData, ausbau_art: value as 'ftth' | 'fttb' | ''})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Auswählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ftth">FTTH</SelectItem>
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
              placeholder="Suchen nach Straße, Hausnummer, Stadt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
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
                      Keine Gebäude gefunden.
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
                            <Badge variant={building.ausbau_art === 'ftth' ? 'default' : 'secondary'}>
                              {building.ausbau_art.toUpperCase()}
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
    </Card>
  );
};
