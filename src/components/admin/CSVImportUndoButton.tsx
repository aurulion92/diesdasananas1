import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Undo2, Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CSVImportUndoButtonProps {
  onUndoComplete: () => void;
}

interface ImportLog {
  id: string;
  created_at: string;
  records_created: number | null;
  records_updated: number | null;
  affected_building_ids: string[] | null;
  previous_states: any[] | null;
  is_reverted: boolean;
}

export const CSVImportUndoButton = ({ onUndoComplete }: CSVImportUndoButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [lastImport, setLastImport] = useState<ImportLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const checkLastImport = async () => {
    const { data } = await supabase
      .from('csv_import_logs')
      .select('id, created_at, records_created, records_updated, affected_building_ids, previous_states, is_reverted')
      .eq('import_type', 'buildings')
      .eq('is_reverted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && (data.affected_building_ids?.length || 0) > 0) {
      setLastImport(data as ImportLog);
      setDialogOpen(true);
    } else {
      toast({
        title: 'Kein Import vorhanden',
        description: 'Es gibt keinen rückgängig zu machenden Import.',
        variant: 'destructive',
      });
    }
  };

  const handleUndo = async () => {
    if (!lastImport) return;
    
    setLoading(true);
    try {
      const previousStates = lastImport.previous_states || [];
      let deletedCount = 0;
      let restoredCount = 0;

      for (const state of previousStates) {
        if (state.type === 'create') {
          // Delete buildings that were created by this import
          const { error } = await supabase
            .from('buildings')
            .delete()
            .eq('id', state.id);
          
          if (!error) deletedCount++;
        } else if (state.type === 'update' && state.previous) {
          // Restore buildings to their previous state
          const { id, created_at, updated_at, ...restoreData } = state.previous;
          const { error } = await supabase
            .from('buildings')
            .update({
              ...restoreData,
              last_import_batch_id: null,
            })
            .eq('id', state.id);
          
          if (!error) restoredCount++;
        }
      }

      // Mark import as reverted
      await supabase
        .from('csv_import_logs')
        .update({
          is_reverted: true,
          reverted_at: new Date().toISOString(),
        })
        .eq('id', lastImport.id);

      toast({
        title: 'Import rückgängig gemacht',
        description: `${deletedCount} gelöscht, ${restoredCount} wiederhergestellt.`,
      });

      setDialogOpen(false);
      onUndoComplete();
    } catch (error: any) {
      console.error('Undo error:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Import konnte nicht rückgängig gemacht werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={checkLastImport}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Undo2 className="w-4 h-4 mr-2" />
        )}
        Letzten Import rückgängig
      </Button>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Import rückgängig machen?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Sie sind dabei, den letzten CSV-Import rückgängig zu machen:
                </p>
                {lastImport && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                    <div><strong>Datum:</strong> {formatDate(lastImport.created_at)}</div>
                    <div><strong>Erstellt:</strong> {lastImport.records_created || 0} Gebäude</div>
                    <div><strong>Aktualisiert:</strong> {lastImport.records_updated || 0} Gebäude</div>
                    <div><strong>Betroffene Einträge:</strong> {lastImport.affected_building_ids?.length || 0}</div>
                  </div>
                )}
                <p className="text-destructive font-medium">
                  Diese Aktion kann nicht rückgängig gemacht werden!
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleUndo();
              }}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird rückgängig gemacht...
                </>
              ) : (
                <>
                  <Undo2 className="w-4 h-4 mr-2" />
                  Rückgängig machen
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
