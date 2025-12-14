import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Loader2, 
  X,
  Building2,
  Settings
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface OptionBuildingAssignmentProps {
  optionId: string;
  optionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

interface AssignedBuilding {
  id: string;
  name: string;
}

interface SearchResult {
  id: string;
  name: string;
  isAssigned: boolean;
}

export function OptionBuildingAssignment({
  optionId,
  optionName,
  open,
  onOpenChange,
  onUpdate
}: OptionBuildingAssignmentProps) {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [assignedBuildings, setAssignedBuildings] = useState<AssignedBuilding[]>([]);
  const [searching, setSearching] = useState(false);
  const { toast } = useToast();

  // Fetch currently assigned buildings
  useEffect(() => {
    if (open && optionId) {
      fetchAssignedBuildings();
    } else if (!open) {
      setAssignedBuildings([]);
      setSearchResults([]);
      setSearchTerm('');
    }
  }, [open, optionId]);

  // Search when search term changes
  useEffect(() => {
    if (searchTerm.length >= 3) {
      searchBuildings();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, assignedBuildings]);

  const fetchAssignedBuildings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('option_buildings')
        .select('building_id, buildings(id, street, house_number, city)')
        .eq('option_id', optionId);

      if (error) throw error;

      setAssignedBuildings((data || []).map(item => ({
        id: (item.buildings as any).id,
        name: `${(item.buildings as any).street} ${(item.buildings as any).house_number}, ${(item.buildings as any).city}`
      })));
    } catch (error) {
      console.error('Error fetching assigned buildings:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchBuildings = async () => {
    if (searchTerm.length < 3) return;
    
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, street, house_number, city')
        .or(`street.ilike.%${searchTerm}%,house_number.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
        .limit(20);

      if (error) throw error;

      setSearchResults((data || []).map(b => ({
        id: b.id,
        name: `${b.street} ${b.house_number}, ${b.city}`,
        isAssigned: assignedBuildings.some(a => a.id === b.id)
      })));
    } catch (error) {
      console.error('Error searching buildings:', error);
    } finally {
      setSearching(false);
    }
  };

  const toggleAssignment = async (buildingId: string, buildingName: string, isAssigned: boolean) => {
    try {
      if (isAssigned) {
        // Remove assignment
        const { error } = await supabase
          .from('option_buildings')
          .delete()
          .eq('option_id', optionId)
          .eq('building_id', buildingId);

        if (error) throw error;

        setAssignedBuildings(prev => prev.filter(a => a.id !== buildingId));
        setSearchResults(prev => prev.map(r => 
          r.id === buildingId ? { ...r, isAssigned: false } : r
        ));

        toast({ title: 'Entfernt', description: `${buildingName} wurde entfernt.` });
      } else {
        // Add assignment
        const { error } = await supabase
          .from('option_buildings')
          .insert({
            option_id: optionId,
            building_id: buildingId,
          });

        if (error) throw error;

        setAssignedBuildings(prev => [...prev, { id: buildingId, name: buildingName }]);
        setSearchResults(prev => prev.map(r => 
          r.id === buildingId ? { ...r, isAssigned: true } : r
        ));

        toast({ title: 'Hinzugefügt', description: `${buildingName} wurde zugewiesen.` });
      }

      // Update is_building_restricted flag on option
      const newCount = isAssigned ? assignedBuildings.length - 1 : assignedBuildings.length + 1;
      await supabase
        .from('product_options')
        .update({ is_building_restricted: newCount > 0 })
        .eq('id', optionId);

      onUpdate?.();
    } catch (error: any) {
      console.error('Error toggling assignment:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Speichern.',
        variant: 'destructive',
      });
    }
  };

  const removeAssignment = async (buildingId: string, buildingName: string) => {
    await toggleAssignment(buildingId, buildingName, true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Gebäude zuweisen
          </DialogTitle>
          <DialogDescription>
            Wählen Sie Gebäude aus, an denen die Option "{optionName}" exklusiv verfügbar sein soll.
            Ohne Zuweisung ist die Option überall verfügbar (sofern dem Produkt zugewiesen).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Currently assigned */}
          <div>
            <h4 className="text-sm font-medium mb-2">
              Zugewiesen ({assignedBuildings.length})
            </h4>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : assignedBuildings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Keine Gebäude zugewiesen - Option ist überall verfügbar.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assignedBuildings.map(building => (
                  <Badge key={building.id} variant="secondary" className="gap-1">
                    {building.name}
                    <button
                      onClick={() => removeAssignment(building.id, building.name)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Gebäude suchen (mind. 3 Zeichen)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Results list */}
          {searchTerm.length >= 3 && (
            <ScrollArea className="h-[200px] border rounded-md">
              {searching ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Keine Ergebnisse gefunden.
                </p>
              ) : (
                <div className="p-2 space-y-1">
                  {searchResults.map(result => (
                    <div
                      key={result.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                      onClick={() => toggleAssignment(result.id, result.name, result.isAssigned)}
                    >
                      <Checkbox checked={result.isAssigned} />
                      <span className="text-sm">{result.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}