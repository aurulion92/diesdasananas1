import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2, RefreshCw, Database } from 'lucide-react';

interface K7Service {
  id: string;
  building_id: string;
  std_kabel_gebaeude_id: string | null;
  leistungsprodukt_id: string | null;
  leistungsprodukt: string | null;
  nt_dsl_bandbreite_id: string | null;
  bandbreite: string | null;
  created_at: string;
}

interface BuildingK7ServicesManagerProps {
  buildingId: string;
  buildingAddress: string;
  gebaudeIdK7?: string | null;
}

export function BuildingK7ServicesManager({ 
  buildingId, 
  buildingAddress,
  gebaudeIdK7 
}: BuildingK7ServicesManagerProps) {
  const [services, setServices] = useState<K7Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    std_kabel_gebaeude_id: gebaudeIdK7 || '',
    leistungsprodukt_id: '',
    leistungsprodukt: '',
    nt_dsl_bandbreite_id: '',
    bandbreite: ''
  });

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('building_k7_services')
        .select('*')
        .eq('building_id', buildingId)
        .order('leistungsprodukt_id', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching K7 services:', error);
      toast.error('Fehler beim Laden der K7-Daten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dialogOpen) {
      fetchServices();
    }
  }, [dialogOpen, buildingId]);

  const handleAddService = async () => {
    try {
      const { error } = await supabase
        .from('building_k7_services')
        .insert({
          building_id: buildingId,
          std_kabel_gebaeude_id: formData.std_kabel_gebaeude_id || null,
          leistungsprodukt_id: formData.leistungsprodukt_id || null,
          leistungsprodukt: formData.leistungsprodukt || null,
          nt_dsl_bandbreite_id: formData.nt_dsl_bandbreite_id || null,
          bandbreite: formData.bandbreite || null
        });

      if (error) throw error;
      
      toast.success('K7-Eintrag hinzugefügt');
      setAddDialogOpen(false);
      setFormData({
        std_kabel_gebaeude_id: gebaudeIdK7 || '',
        leistungsprodukt_id: '',
        leistungsprodukt: '',
        nt_dsl_bandbreite_id: '',
        bandbreite: ''
      });
      fetchServices();
    } catch (error) {
      console.error('Error adding K7 service:', error);
      toast.error('Fehler beim Hinzufügen');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Diesen K7-Eintrag wirklich löschen?')) return;
    
    try {
      const { error } = await supabase
        .from('building_k7_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;
      
      toast.success('K7-Eintrag gelöscht');
      fetchServices();
    } catch (error) {
      console.error('Error deleting K7 service:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="K7 Daten">
          <Database className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>K7 Daten - {buildingAddress}</DialogTitle>
          <DialogDescription>
            Leistungsprodukte und Bandbreiten für dieses Gebäude
            {gebaudeIdK7 && <span className="ml-2 text-primary">(K7 ID: {gebaudeIdK7})</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button onClick={fetchServices} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Eintrag hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuer K7-Eintrag</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>STD_KABEL_GEBAEUDE_ID (K7 Gebäude ID)</Label>
                  <Input
                    value={formData.std_kabel_gebaeude_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, std_kabel_gebaeude_id: e.target.value }))}
                    placeholder="z.B. 25523,00"
                  />
                </div>
                <div>
                  <Label>LEISTUNGSPRODUKT_ID</Label>
                  <Input
                    value={formData.leistungsprodukt_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, leistungsprodukt_id: e.target.value }))}
                    placeholder="z.B. 4,00"
                  />
                </div>
                <div>
                  <Label>LEISTUNGSPRODUKT (Beschreibung)</Label>
                  <Input
                    value={formData.leistungsprodukt}
                    onChange={(e) => setFormData(prev => ({ ...prev, leistungsprodukt: e.target.value }))}
                    placeholder="z.B. FTTH L2 ETH 500 100"
                  />
                </div>
                <div>
                  <Label>NT_DSL_BANDBREITE_ID</Label>
                  <Input
                    value={formData.nt_dsl_bandbreite_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, nt_dsl_bandbreite_id: e.target.value }))}
                    placeholder="z.B. 520,00"
                  />
                </div>
                <div>
                  <Label>BANDBREITE (Beschreibung)</Label>
                  <Input
                    value={formData.bandbreite}
                    onChange={(e) => setFormData(prev => ({ ...prev, bandbreite: e.target.value }))}
                    placeholder="z.B. 500/100"
                  />
                </div>
                <Button onClick={handleAddService} className="w-full">
                  Hinzufügen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Lädt...</div>
        ) : services.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Keine K7-Daten vorhanden
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>K7 Gebäude ID</TableHead>
                <TableHead>Leistungsprodukt ID</TableHead>
                <TableHead>Leistungsprodukt</TableHead>
                <TableHead>Bandbreite ID</TableHead>
                <TableHead>Bandbreite</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-mono text-xs">
                    {service.std_kabel_gebaeude_id || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {service.leistungsprodukt_id || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {service.leistungsprodukt || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {service.nt_dsl_bandbreite_id || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {service.bandbreite || '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteService(service.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        <div className="text-sm text-muted-foreground mt-4">
          {services.length} Einträge
        </div>
      </DialogContent>
    </Dialog>
  );
}
