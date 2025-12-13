import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Loader2, 
  Plus, 
  X,
  Building2,
  Package
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface ProductBuildingAssignmentProps {
  mode: 'product' | 'building';
  entityId: string;
  entityName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

interface AssignedItem {
  id: string;
  name: string;
}

interface SearchResult {
  id: string;
  name: string;
  isAssigned: boolean;
}

export function ProductBuildingAssignment({
  mode,
  entityId,
  entityName,
  open,
  onOpenChange,
  onUpdate
}: ProductBuildingAssignmentProps) {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [assignedItems, setAssignedItems] = useState<AssignedItem[]>([]);
  const [searching, setSearching] = useState(false);
  const { toast } = useToast();

  // Fetch currently assigned items
  useEffect(() => {
    if (open && entityId) {
      fetchAssignedItems();
    }
  }, [open, entityId]);

  // Search when search term changes
  useEffect(() => {
    if (searchTerm.length >= 3) {
      searchItems();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const fetchAssignedItems = async () => {
    setLoading(true);
    try {
      if (mode === 'product') {
        // Fetch buildings assigned to this product
        const { data, error } = await supabase
          .from('product_buildings')
          .select('building_id, buildings(id, street, house_number, city)')
          .eq('product_id', entityId);

        if (error) throw error;

        setAssignedItems((data || []).map(item => ({
          id: (item.buildings as any).id,
          name: `${(item.buildings as any).street} ${(item.buildings as any).house_number}, ${(item.buildings as any).city}`
        })));
      } else {
        // Fetch products assigned to this building
        const { data, error } = await supabase
          .from('product_buildings')
          .select('product_id, products(id, name)')
          .eq('building_id', entityId);

        if (error) throw error;

        setAssignedItems((data || []).map(item => ({
          id: (item.products as any).id,
          name: (item.products as any).name
        })));
      }
    } catch (error) {
      console.error('Error fetching assigned items:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchItems = async () => {
    if (searchTerm.length < 3) return;
    
    setSearching(true);
    try {
      if (mode === 'product') {
        // Search buildings
        const { data, error } = await supabase
          .from('buildings')
          .select('id, street, house_number, city')
          .or(`street.ilike.%${searchTerm}%,house_number.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
          .limit(20);

        if (error) throw error;

        setSearchResults((data || []).map(b => ({
          id: b.id,
          name: `${b.street} ${b.house_number}, ${b.city}`,
          isAssigned: assignedItems.some(a => a.id === b.id)
        })));
      } else {
        // Search products
        const { data, error } = await supabase
          .from('products')
          .select('id, name')
          .ilike('name', `%${searchTerm}%`)
          .eq('is_active', true)
          .limit(20);

        if (error) throw error;

        setSearchResults((data || []).map(p => ({
          id: p.id,
          name: p.name,
          isAssigned: assignedItems.some(a => a.id === p.id)
        })));
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setSearching(false);
    }
  };

  const toggleAssignment = async (itemId: string, itemName: string, isAssigned: boolean) => {
    try {
      if (isAssigned) {
        // Remove assignment
        const { error } = await supabase
          .from('product_buildings')
          .delete()
          .eq(mode === 'product' ? 'product_id' : 'building_id', entityId)
          .eq(mode === 'product' ? 'building_id' : 'product_id', itemId);

        if (error) throw error;

        setAssignedItems(prev => prev.filter(a => a.id !== itemId));
        setSearchResults(prev => prev.map(r => 
          r.id === itemId ? { ...r, isAssigned: false } : r
        ));

        toast({ title: 'Entfernt', description: `${itemName} wurde entfernt.` });
      } else {
        // Add assignment
        const { error } = await supabase
          .from('product_buildings')
          .insert({
            product_id: mode === 'product' ? entityId : itemId,
            building_id: mode === 'product' ? itemId : entityId,
          });

        if (error) throw error;

        setAssignedItems(prev => [...prev, { id: itemId, name: itemName }]);
        setSearchResults(prev => prev.map(r => 
          r.id === itemId ? { ...r, isAssigned: true } : r
        ));

        toast({ title: 'Hinzugefügt', description: `${itemName} wurde zugewiesen.` });
      }

      // Also update is_building_restricted flag on product if in product mode
      if (mode === 'product') {
        const newCount = isAssigned ? assignedItems.length - 1 : assignedItems.length + 1;
        await supabase
          .from('products')
          .update({ is_building_restricted: newCount > 0 })
          .eq('id', entityId);
      }

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

  const removeAssignment = async (itemId: string, itemName: string) => {
    await toggleAssignment(itemId, itemName, true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'product' ? <Building2 className="w-5 h-5" /> : <Package className="w-5 h-5" />}
            {mode === 'product' ? 'Gebäude zuweisen' : 'Produkte zuweisen'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'product' 
              ? `Wählen Sie Gebäude aus, an denen "${entityName}" exklusiv verfügbar sein soll.`
              : `Wählen Sie Produkte aus, die exklusiv an "${entityName}" verfügbar sein sollen.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Currently assigned */}
          <div>
            <h4 className="text-sm font-medium mb-2">
              Zugewiesen ({assignedItems.length})
            </h4>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : assignedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                {mode === 'product' 
                  ? 'Keine Gebäude zugewiesen - Produkt ist überall verfügbar.'
                  : 'Keine Produkte zugewiesen.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assignedItems.map(item => (
                  <Badge key={item.id} variant="secondary" className="gap-1">
                    {item.name}
                    <button
                      onClick={() => removeAssignment(item.id, item.name)}
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
                placeholder={mode === 'product' 
                  ? 'Gebäude suchen (mind. 3 Zeichen)...'
                  : 'Produkte suchen (mind. 3 Zeichen)...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Search results */}
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
