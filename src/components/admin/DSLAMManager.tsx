import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Plus, Trash2, Server, Building2, Edit, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

interface DSLAM {
  id: string;
  name: string;
  location_description: string | null;
  total_ports: number;
  created_at: string;
  // Calculated fields
  buildings_count?: number;
  occupied_ports?: number;
  max_usable_ports?: number;
}

interface BuildingAssignment {
  id: string;
  street: string;
  house_number: string;
  residential_units: number | null;
  dslam_ports_occupied: number | null;
  ausbau_art: string | null;
}

export function DSLAMManager() {
  const [dslams, setDslams] = useState<DSLAM[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBuildingsDialog, setShowBuildingsDialog] = useState(false);
  const [selectedDSLAM, setSelectedDSLAM] = useState<DSLAM | null>(null);
  const [assignedBuildings, setAssignedBuildings] = useState<BuildingAssignment[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    location_description: '',
    total_ports: 8,
  });

  const fetchDSLAMs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dslams')
        .select('*')
        .order('name');

      if (error) throw error;

      // Get building counts and port usage for each DSLAM
      const dslamIds = (data || []).map(d => d.id);
      
      const { data: buildingStats } = await supabase
        .from('buildings')
        .select('dslam_id, residential_units, dslam_ports_occupied')
        .in('dslam_id', dslamIds.length > 0 ? dslamIds : ['none']);

      // Aggregate stats
      const statsMap: Record<string, { count: number; occupied: number; maxUsable: number }> = {};
      (buildingStats || []).forEach(b => {
        if (!b.dslam_id) return;
        if (!statsMap[b.dslam_id]) {
          statsMap[b.dslam_id] = { count: 0, occupied: 0, maxUsable: 0 };
        }
        statsMap[b.dslam_id].count++;
        statsMap[b.dslam_id].occupied += b.dslam_ports_occupied || 0;
        // Max usable per building is min(residential_units, 8)
        const dslam = data?.find(d => d.id === b.dslam_id);
        const maxPorts = dslam?.total_ports || 8;
        statsMap[b.dslam_id].maxUsable += Math.min(b.residential_units || maxPorts, maxPorts);
      });

      const enrichedDslams = (data || []).map(d => ({
        ...d,
        buildings_count: statsMap[d.id]?.count || 0,
        occupied_ports: statsMap[d.id]?.occupied || 0,
        max_usable_ports: statsMap[d.id]?.maxUsable || 0,
      }));

      setDslams(enrichedDslams);
    } catch (error) {
      console.error('Error fetching DSLAMs:', error);
      toast.error('Fehler beim Laden der DSLAMs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDSLAMs();
  }, []);

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Name ist erforderlich');
      return;
    }

    try {
      const { error } = await supabase
        .from('dslams')
        .insert({
          name: formData.name,
          location_description: formData.location_description || null,
          total_ports: formData.total_ports,
        });

      if (error) throw error;

      toast.success('DSLAM erstellt');
      setShowAddDialog(false);
      setFormData({ name: '', location_description: '', total_ports: 8 });
      await fetchDSLAMs();
    } catch (error) {
      console.error('Error creating DSLAM:', error);
      toast.error('Fehler beim Erstellen');
    }
  };

  const handleUpdate = async () => {
    if (!selectedDSLAM || !formData.name) return;

    try {
      const { error } = await supabase
        .from('dslams')
        .update({
          name: formData.name,
          location_description: formData.location_description || null,
          total_ports: formData.total_ports,
        })
        .eq('id', selectedDSLAM.id);

      if (error) throw error;

      toast.success('DSLAM aktualisiert');
      setShowEditDialog(false);
      await fetchDSLAMs();
    } catch (error) {
      console.error('Error updating DSLAM:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('DSLAM wirklich löschen? Gebäude-Zuordnungen werden entfernt.')) return;

    try {
      // First remove DSLAM reference from buildings
      await supabase
        .from('buildings')
        .update({ dslam_id: null, dslam_port_number: null })
        .eq('dslam_id', id);

      const { error } = await supabase
        .from('dslams')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('DSLAM gelöscht');
      await fetchDSLAMs();
    } catch (error) {
      console.error('Error deleting DSLAM:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const openEdit = (dslam: DSLAM) => {
    setSelectedDSLAM(dslam);
    setFormData({
      name: dslam.name,
      location_description: dslam.location_description || '',
      total_ports: dslam.total_ports,
    });
    setShowEditDialog(true);
  };

  const openBuildings = async (dslam: DSLAM) => {
    setSelectedDSLAM(dslam);
    
    const { data } = await supabase
      .from('buildings')
      .select('id, street, house_number, residential_units, dslam_ports_occupied, ausbau_art')
      .eq('dslam_id', dslam.id)
      .order('street')
      .order('house_number');

    setAssignedBuildings(data || []);
    setShowBuildingsDialog(true);
  };

  const updateBuildingPorts = async (buildingId: string, occupied: number) => {
    try {
      const { error } = await supabase
        .from('buildings')
        .update({ dslam_ports_occupied: occupied })
        .eq('id', buildingId);

      if (error) throw error;

      setAssignedBuildings(prev => prev.map(b => 
        b.id === buildingId ? { ...b, dslam_ports_occupied: occupied } : b
      ));
      toast.success('Ports aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const getUsagePercent = (dslam: DSLAM) => {
    if (!dslam.max_usable_ports || dslam.max_usable_ports === 0) return 0;
    return Math.round((dslam.occupied_ports || 0) / dslam.max_usable_ports * 100);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Lade DSLAMs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">DSLAM-Verwaltung</h2>
          <p className="text-muted-foreground">Verwalten Sie DSLAMs für FTTB-Gebäude (8 Ports Standard)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDSLAMs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
          <Button onClick={() => { setFormData({ name: '', location_description: '', total_ports: 8 }); setShowAddDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            DSLAM hinzufügen
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dslams.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Keine DSLAMs vorhanden</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ersten DSLAM erstellen
              </Button>
            </CardContent>
          </Card>
        ) : (
          dslams.map(dslam => {
            const usagePercent = getUsagePercent(dslam);
            const isNearFull = usagePercent >= 80;
            const isFull = usagePercent >= 100;

            return (
              <Card key={dslam.id} className={isFull ? 'border-destructive' : isNearFull ? 'border-yellow-500' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      {dslam.name}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(dslam)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(dslam.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {dslam.location_description && (
                    <p className="text-sm text-muted-foreground">{dslam.location_description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Port-Auslastung</span>
                    <span className={isFull ? 'text-destructive font-bold' : ''}>
                      {dslam.occupied_ports || 0} / {dslam.max_usable_ports || 0}
                    </span>
                  </div>
                  <Progress 
                    value={usagePercent} 
                    className={isFull ? '[&>div]:bg-destructive' : isNearFull ? '[&>div]:bg-yellow-500' : ''}
                  />
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {dslam.buildings_count || 0} Gebäude
                    </Badge>
                    <Badge variant={isFull ? 'destructive' : 'secondary'}>
                      {isFull ? 'Voll' : `${dslam.total_ports} Ports/DSLAM`}
                    </Badge>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => openBuildings(dslam)}
                  >
                    Gebäude verwalten
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen DSLAM erstellen</DialogTitle>
            <DialogDescription>
              Ein DSLAM hat standardmäßig 8 Ports für FTTB-Anschlüsse
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name / Kennung</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. DSLAM-001 oder Straßenname"
              />
            </div>
            <div className="space-y-2">
              <Label>Standortbeschreibung (optional)</Label>
              <Textarea
                value={formData.location_description}
                onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
                placeholder="z.B. Verteilerkasten Ecke Hauptstraße/Nebenstraße"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Anzahl Ports</Label>
              <Input
                type="number"
                min={1}
                max={48}
                value={formData.total_ports}
                onChange={(e) => setFormData({ ...formData, total_ports: parseInt(e.target.value) || 8 })}
              />
              <p className="text-xs text-muted-foreground">Standard: 8 Ports</p>
            </div>
            <Button onClick={handleCreate} className="w-full">
              DSLAM erstellen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>DSLAM bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name / Kennung</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Standortbeschreibung</Label>
              <Textarea
                value={formData.location_description}
                onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Anzahl Ports</Label>
              <Input
                type="number"
                min={1}
                max={48}
                value={formData.total_ports}
                onChange={(e) => setFormData({ ...formData, total_ports: parseInt(e.target.value) || 8 })}
              />
            </div>
            <Button onClick={handleUpdate} className="w-full">
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Buildings Dialog */}
      <Dialog open={showBuildingsDialog} onOpenChange={setShowBuildingsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Zugeordnete Gebäude - {selectedDSLAM?.name}</DialogTitle>
            <DialogDescription>
              Gebäude diesem DSLAM zuordnen und Portbelegung verwalten
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {assignedBuildings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Keine Gebäude zugeordnet. Ordnen Sie Gebäude im Gebäude-Manager zu.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Adresse</TableHead>
                    <TableHead>WE</TableHead>
                    <TableHead>Belegt</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedBuildings.map(building => {
                    const maxPorts = Math.min(building.residential_units || 8, selectedDSLAM?.total_ports || 8);
                    const occupied = building.dslam_ports_occupied || 0;
                    const isFull = occupied >= maxPorts;

                    return (
                      <TableRow key={building.id}>
                        <TableCell>
                          {building.street} {building.house_number}
                        </TableCell>
                        <TableCell>{building.residential_units || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={maxPorts}
                              value={occupied}
                              onChange={(e) => updateBuildingPorts(building.id, parseInt(e.target.value) || 0)}
                              className="w-16 h-8"
                            />
                            <span className="text-sm text-muted-foreground">/ {maxPorts}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isFull ? 'destructive' : 'secondary'}>
                            {isFull ? 'Voll' : `${maxPorts - occupied} frei`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}