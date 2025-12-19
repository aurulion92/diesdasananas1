import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, Home, ChevronDown, ChevronRight, Save } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

interface HomeId {
  id: string;
  building_id: string;
  home_id_type: string;
  home_id_value: string;
  unit_number: number;
  created_at: string;
  updated_at: string;
}

interface BuildingHomeIdsManagerProps {
  buildingId: string;
  buildingAddress: string;
  residentialUnits: number;
}

export const BuildingHomeIdsManager = ({ 
  buildingId, 
  buildingAddress,
  residentialUnits 
}: BuildingHomeIdsManagerProps) => {
  const [homeIds, setHomeIds] = useState<HomeId[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Local state for editing
  const [editedHomeIds, setEditedHomeIds] = useState<HomeId[]>([]);
  const [newHomeIds, setNewHomeIds] = useState<Omit<HomeId, 'id' | 'building_id' | 'created_at' | 'updated_at'>[]>([]);

  const fetchHomeIds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('building_home_ids')
        .select('*')
        .eq('building_id', buildingId)
        .order('unit_number', { ascending: true });

      if (error) throw error;
      setHomeIds(data || []);
      setEditedHomeIds(data || []);
    } catch (error) {
      console.error('Error fetching home IDs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHomeIds();
    }
  }, [isOpen, buildingId]);

  const handleAddNew = () => {
    const nextUnitNumber = Math.max(
      ...homeIds.map(h => h.unit_number),
      ...newHomeIds.map(h => h.unit_number),
      0
    ) + 1;

    setNewHomeIds([...newHomeIds, {
      home_id_type: '',
      home_id_value: '',
      unit_number: nextUnitNumber
    }]);
  };

  const handleUpdateExisting = (id: string, field: keyof HomeId, value: string | number) => {
    setEditedHomeIds(prev => prev.map(h => 
      h.id === id ? { ...h, [field]: value } : h
    ));
  };

  const handleUpdateNew = (index: number, field: string, value: string | number) => {
    setNewHomeIds(prev => prev.map((h, i) => 
      i === index ? { ...h, [field]: value } : h
    ));
  };

  const handleRemoveNew = (index: number) => {
    setNewHomeIds(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExisting = async (id: string) => {
    if (!confirm('Home ID wirklich löschen?')) return;
    
    try {
      const { error } = await supabase
        .from('building_home_ids')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setHomeIds(prev => prev.filter(h => h.id !== id));
      setEditedHomeIds(prev => prev.filter(h => h.id !== id));
      toast({ title: 'Erfolg', description: 'Home ID gelöscht.' });
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Update existing home IDs
      for (const homeId of editedHomeIds) {
        const original = homeIds.find(h => h.id === homeId.id);
        if (original && (
          original.home_id_type !== homeId.home_id_type ||
          original.home_id_value !== homeId.home_id_value ||
          original.unit_number !== homeId.unit_number
        )) {
          const { error } = await supabase
            .from('building_home_ids')
            .update({
              home_id_type: homeId.home_id_type,
              home_id_value: homeId.home_id_value,
              unit_number: homeId.unit_number
            })
            .eq('id', homeId.id);

          if (error) throw error;
        }
      }

      // Insert new home IDs
      if (newHomeIds.length > 0) {
        const { error } = await supabase
          .from('building_home_ids')
          .insert(newHomeIds.map(h => ({
            building_id: buildingId,
            home_id_type: h.home_id_type,
            home_id_value: h.home_id_value,
            unit_number: h.unit_number
          })));

        if (error) throw error;
      }

      setNewHomeIds([]);
      await fetchHomeIds();
      toast({ title: 'Erfolg', description: 'Home IDs gespeichert.' });
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (newHomeIds.length > 0) return true;
    return editedHomeIds.some(edited => {
      const original = homeIds.find(h => h.id === edited.id);
      return original && (
        original.home_id_type !== edited.home_id_type ||
        original.home_id_value !== edited.home_id_value ||
        original.unit_number !== edited.unit_number
      );
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Home className="w-4 h-4" />
          <span className="text-xs">Home IDs</span>
          {homeIds.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {homeIds.length}
            </Badge>
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              Home IDs für {buildingAddress}
              <span className="text-muted-foreground ml-2">({residentialUnits} WE)</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleAddNew}>
                <Plus className="w-4 h-4 mr-1" />
                Hinzufügen
              </Button>
              {hasChanges() && (
                <Button size="sm" onClick={handleSaveAll} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Speichern
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              {(editedHomeIds.length > 0 || newHomeIds.length > 0) && (
                <div className="grid grid-cols-[60px_1fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
                  <span>WE Nr.</span>
                  <span>Typ</span>
                  <span>ID</span>
                  <span></span>
                </div>
              )}

              {/* Existing Home IDs */}
              {editedHomeIds.map((homeId) => (
                <div key={homeId.id} className="grid grid-cols-[60px_1fr_1fr_40px] gap-2 items-center">
                  <Input
                    type="number"
                    min="1"
                    value={homeId.unit_number}
                    onChange={(e) => handleUpdateExisting(homeId.id, 'unit_number', parseInt(e.target.value) || 1)}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="Typ (z.B. FTTH)"
                    value={homeId.home_id_type}
                    onChange={(e) => handleUpdateExisting(homeId.id, 'home_id_type', e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="Home ID"
                    value={homeId.home_id_value}
                    onChange={(e) => handleUpdateExisting(homeId.id, 'home_id_value', e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteExisting(homeId.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {/* New Home IDs */}
              {newHomeIds.map((homeId, index) => (
                <div key={`new-${index}`} className="grid grid-cols-[60px_1fr_1fr_40px] gap-2 items-center">
                  <Input
                    type="number"
                    min="1"
                    value={homeId.unit_number}
                    onChange={(e) => handleUpdateNew(index, 'unit_number', parseInt(e.target.value) || 1)}
                    className="h-8 text-sm border-primary/50"
                  />
                  <Input
                    placeholder="Typ (z.B. FTTH)"
                    value={homeId.home_id_type}
                    onChange={(e) => handleUpdateNew(index, 'home_id_type', e.target.value)}
                    className="h-8 text-sm border-primary/50"
                  />
                  <Input
                    placeholder="Home ID"
                    value={homeId.home_id_value}
                    onChange={(e) => handleUpdateNew(index, 'home_id_value', e.target.value)}
                    className="h-8 text-sm border-primary/50"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveNew(index)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {editedHomeIds.length === 0 && newHomeIds.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keine Home IDs vorhanden. Klicken Sie auf "Hinzufügen" um Home IDs zu erfassen.
                </p>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
