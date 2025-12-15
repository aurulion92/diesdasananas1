import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Undo2, Loader2, Trash2, AlertTriangle } from 'lucide-react';

interface K7ImportLog {
  id: string;
  file_name: string | null;
  records_created: number | null;
  created_at: string;
  previous_states: { inserted_k7_service_ids?: string[] } | null;
}

interface K7ImportUndoButtonProps {
  onUndoComplete?: () => void;
}

export function K7ImportUndoButton({ onUndoComplete }: K7ImportUndoButtonProps) {
  const [lastImport, setLastImport] = useState<K7ImportLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [totalK7Count, setTotalK7Count] = useState<number>(0);

  const fetchLastImport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('csv_import_logs')
        .select('id, file_name, records_created, created_at, previous_states')
        .eq('import_type', 'k7_services')
        .eq('is_reverted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setLastImport({
          ...data,
          previous_states: data.previous_states as K7ImportLog['previous_states']
        });
      } else {
        setLastImport(null);
      }

      // Also get total K7 count
      const { count } = await supabase
        .from('building_k7_services')
        .select('*', { count: 'exact', head: true });
      
      setTotalK7Count(count || 0);
    } catch (error) {
      console.error('Error fetching last K7 import:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLastImport();
  }, []);

  const handleUndo = async () => {
    if (!lastImport) return;
    
    const insertedIds = lastImport.previous_states?.inserted_k7_service_ids;
    if (!insertedIds || insertedIds.length === 0) {
      toast.error('Keine IDs zum Löschen gefunden');
      return;
    }

    setUndoing(true);
    try {
      const BATCH_SIZE = 500;
      let deletedCount = 0;
      
      for (let i = 0; i < insertedIds.length; i += BATCH_SIZE) {
        const batch = insertedIds.slice(i, i + BATCH_SIZE);
        
        const { error } = await supabase
          .from('building_k7_services')
          .delete()
          .in('id', batch);

        if (error) throw error;
        deletedCount += batch.length;
      }

      await supabase
        .from('csv_import_logs')
        .update({
          is_reverted: true,
          reverted_at: new Date().toISOString(),
        })
        .eq('id', lastImport.id);

      toast.success(`${deletedCount.toLocaleString()} K7-Einträge gelöscht`);
      setLastImport(null);
      fetchLastImport();
      onUndoComplete?.();
    } catch (error) {
      console.error('Error undoing K7 import:', error);
      toast.error('Fehler beim Rückgängig machen');
    } finally {
      setUndoing(false);
    }
  };

  const handleDeleteAll = async () => {
    setUndoing(true);
    try {
      // Delete all K7 services
      const { error } = await supabase
        .from('building_k7_services')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      // Mark all K7 imports as reverted
      await supabase
        .from('csv_import_logs')
        .update({
          is_reverted: true,
          reverted_at: new Date().toISOString(),
        })
        .eq('import_type', 'k7_services')
        .eq('is_reverted', false);

      toast.success(`Alle ${totalK7Count.toLocaleString()} K7-Einträge gelöscht`);
      setLastImport(null);
      setTotalK7Count(0);
      onUndoComplete?.();
    } catch (error) {
      console.error('Error deleting all K7 services:', error);
      toast.error('Fehler beim Löschen');
    } finally {
      setUndoing(false);
    }
  };

  if (loading) {
    return null;
  }

  // Check if we can undo the last import specifically
  const canUndoLastImport = lastImport?.previous_states?.inserted_k7_service_ids?.length;

  const importDate = lastImport ? new Date(lastImport.created_at).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  // Show delete all button if there are K7 entries but we can't undo specifically
  if (totalK7Count > 0 && !canUndoLastImport) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={undoing}>
            {undoing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Alle K7-Daten löschen ({totalK7Count.toLocaleString()})
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alle K7-Daten löschen?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Import kann nicht rückgängig gemacht werden</strong><br />
                  Der letzte Import wurde mit dem Schnell-Import ausgeführt. 
                  Für diese Importe werden aktuell keine Detaildaten für "Rückgängig" gespeichert.
                  Verwende ggf. "Alle löschen" und importiere erneut.
                </AlertDescription>
              </Alert>
              <p className="mt-4">
                Es werden <strong>{totalK7Count.toLocaleString()} K7-Einträge</strong> gelöscht.
              </p>
              <p className="font-medium text-destructive mt-4">
                Diese Aktion kann nicht rückgängig gemacht werden!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {undoing ? 'Lösche...' : 'Alle löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (!lastImport || !canUndoLastImport) {
    return null;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={undoing}>
          {undoing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Undo2 className="h-4 w-4 mr-2" />
          )}
          K7-Import rückgängig
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>K7-Import rückgängig machen?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Der letzte K7-Import wird vollständig rückgängig gemacht:</p>
            <ul className="list-disc list-inside text-sm">
              <li>Datei: {lastImport.file_name || 'Unbekannt'}</li>
              <li>Importiert am: {importDate}</li>
              <li>Einträge: {lastImport.records_created?.toLocaleString() || 0}</li>
            </ul>
            <p className="font-medium text-destructive mt-4">
              Diese Aktion kann nicht rückgängig gemacht werden!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={handleUndo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {undoing ? 'Lösche...' : 'Rückgängig machen'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
