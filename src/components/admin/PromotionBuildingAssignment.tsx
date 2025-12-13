import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tag, Loader2, Check } from 'lucide-react';

interface Promotion {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
}

interface PromotionBuildingAssignmentProps {
  buildingId: string;
  buildingName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PromotionBuildingAssignment = ({
  buildingId,
  buildingName,
  open,
  onOpenChange,
}: PromotionBuildingAssignmentProps) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [assignedPromotions, setAssignedPromotions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, buildingId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all promotions (only non-global ones make sense for building assignment)
      const { data: promoData, error: promoError } = await supabase
        .from('promotions')
        .select('id, name, code, is_active')
        .eq('is_global', false)
        .order('name', { ascending: true });

      if (promoError) throw promoError;
      setPromotions(promoData || []);

      // Fetch current assignments for this building
      const { data: assignData, error: assignError } = await supabase
        .from('promotion_buildings')
        .select('promotion_id')
        .eq('building_id', buildingId);

      if (assignError) throw assignError;
      setAssignedPromotions(assignData?.map(a => a.promotion_id) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Fehler',
        description: 'Daten konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePromotion = (promotionId: string) => {
    setAssignedPromotions(prev =>
      prev.includes(promotionId)
        ? prev.filter(id => id !== promotionId)
        : [...prev, promotionId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing assignments for this building
      const { error: deleteError } = await supabase
        .from('promotion_buildings')
        .delete()
        .eq('building_id', buildingId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (assignedPromotions.length > 0) {
        const assignments = assignedPromotions.map(promotionId => ({
          building_id: buildingId,
          promotion_id: promotionId,
        }));

        const { error: insertError } = await supabase
          .from('promotion_buildings')
          .insert(assignments);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Erfolg',
        description: `Aktionen für ${buildingName} wurden aktualisiert.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast({
        title: 'Fehler',
        description: 'Zuweisungen konnten nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Aktionen zuweisen
          </DialogTitle>
          <DialogDescription>
            Wählen Sie Aktionen für <strong>{buildingName}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Keine objektbezogenen Aktionen vorhanden.</p>
            <p className="text-sm mt-2">Erstellen Sie zuerst eine Aktion mit Geltungsbereich "Objektbezogen".</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="max-h-80 overflow-y-auto space-y-2">
              {promotions.map(promo => (
                <div
                  key={promo.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    assignedPromotions.includes(promo.id)
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => togglePromotion(promo.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                      assignedPromotions.includes(promo.id)
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground'
                    }`}>
                      {assignedPromotions.includes(promo.id) && <Check className="w-3 h-3" />}
                    </div>
                    <div>
                      <span className="font-medium">{promo.name}</span>
                      {promo.code && (
                        <span className="text-sm text-muted-foreground ml-2">({promo.code})</span>
                      )}
                    </div>
                  </div>
                  <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                    {promo.is_active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Speichern
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
