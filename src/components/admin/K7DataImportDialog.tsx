import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface K7DataImportDialogProps {
  onImportComplete?: () => void;
}

interface ImportStats {
  totalRows: number;
  matchedBuildings: number;
  newEntries: number;
  skippedRows: number;
  errors: string[];
}

export function K7DataImportDialog({ onImportComplete }: K7DataImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split('\n');
    if (lines.length < 2) return [];
    
    // Parse header - handle different separators
    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
    
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(separator).map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }
    
    return rows;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast.error('Bitte eine CSV oder Excel-Datei auswählen');
      return;
    }

    setImporting(true);
    setProgress(0);
    setStats(null);
    setStatusMessage('Datei wird gelesen...');

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        throw new Error('Keine Daten in der Datei gefunden');
      }

      setStatusMessage(`${rows.length.toLocaleString()} Zeilen gefunden. Verarbeite...`);
      
      // Group rows by GEBAEUDE_N (building identifier)
      const groupedByBuilding = new Map<string, typeof rows>();
      
      for (const row of rows) {
        const gebaudeN = row['GEBAEUDE_N'] || row['gebaeude_n'];
        if (!gebaudeN) continue;
        
        if (!groupedByBuilding.has(gebaudeN)) {
          groupedByBuilding.set(gebaudeN, []);
        }
        groupedByBuilding.get(gebaudeN)!.push(row);
      }

      setStatusMessage(`${groupedByBuilding.size.toLocaleString()} Gebäude identifiziert. Suche Matches...`);

      // Fetch all buildings with gebaeude_id_v2
      const { data: buildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, gebaeude_id_v2, gebaeude_id_k7')
        .not('gebaeude_id_v2', 'is', null);

      if (buildingsError) throw buildingsError;

      // Create lookup map
      const buildingLookup = new Map<string, { id: string; gebaeude_id_k7: string | null }>();
      for (const building of buildings || []) {
        if (building.gebaeude_id_v2) {
          buildingLookup.set(building.gebaeude_id_v2, {
            id: building.id,
            gebaeude_id_k7: building.gebaeude_id_k7
          });
        }
      }

      const importStats: ImportStats = {
        totalRows: rows.length,
        matchedBuildings: 0,
        newEntries: 0,
        skippedRows: 0,
        errors: []
      };

      // Process in batches
      const BATCH_SIZE = 500;
      const entriesToInsert: Array<{
        building_id: string;
        std_kabel_gebaeude_id: string | null;
        leistungsprodukt_id: string | null;
        leistungsprodukt: string | null;
        nt_dsl_bandbreite_id: string | null;
        bandbreite: string | null;
      }> = [];

      let processedBuildings = 0;
      const totalBuildings = groupedByBuilding.size;

      for (const [gebaudeN, buildingRows] of groupedByBuilding) {
        const building = buildingLookup.get(gebaudeN);
        
        if (building) {
          importStats.matchedBuildings++;
          
          for (const row of buildingRows) {
            const stdKabelGebaudeId = row['STD_KABEL_GEBAEUDE_ID'] || row['std_kabel_gebaeude_id'] || '';
            const leistungsproduktId = row['LEISTUNGSPRODUKT_ID'] || row['leistungsprodukt_id'] || '';
            const leistungsprodukt = row['LEISTUNGSPRODUKT'] || row['leistungsprodukt'] || '';
            const ntDslBandbreiteId = row['NT_DSL_BANDBREITE_ID'] || row['nt_dsl_bandbreite_id'] || '';
            const bandbreite = row['BANDBREITE'] || row['bandbreite'] || '';

            // Skip if no meaningful data
            if (!leistungsproduktId && !ntDslBandbreiteId) {
              importStats.skippedRows++;
              continue;
            }

            entriesToInsert.push({
              building_id: building.id,
              std_kabel_gebaeude_id: stdKabelGebaudeId || null,
              leistungsprodukt_id: leistungsproduktId || null,
              leistungsprodukt: leistungsprodukt || null,
              nt_dsl_bandbreite_id: ntDslBandbreiteId || null,
              bandbreite: bandbreite || null
            });
          }
        } else {
          importStats.skippedRows += buildingRows.length;
        }

        processedBuildings++;
        setProgress(Math.round((processedBuildings / totalBuildings) * 50));
      }

      setStatusMessage(`${entriesToInsert.length.toLocaleString()} Einträge werden gespeichert...`);

      // Insert in batches
      let insertedCount = 0;
      for (let i = 0; i < entriesToInsert.length; i += BATCH_SIZE) {
        const batch = entriesToInsert.slice(i, i + BATCH_SIZE);
        
        const { error: insertError } = await supabase
          .from('building_k7_services')
          .upsert(batch, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });

        if (insertError) {
          importStats.errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${insertError.message}`);
        } else {
          insertedCount += batch.length;
        }

        setProgress(50 + Math.round(((i + batch.length) / entriesToInsert.length) * 50));
        setStatusMessage(`${insertedCount.toLocaleString()} / ${entriesToInsert.length.toLocaleString()} Einträge gespeichert...`);
      }

      importStats.newEntries = insertedCount;
      setStats(importStats);
      setStatusMessage('Import abgeschlossen');
      
      if (importStats.errors.length === 0) {
        toast.success(`${insertedCount.toLocaleString()} K7-Einträge importiert`);
      } else {
        toast.warning(`Import mit ${importStats.errors.length} Fehlern abgeschlossen`);
      }

      onImportComplete?.();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Import fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (importing) {
      if (!confirm('Import läuft noch. Wirklich abbrechen?')) {
        return;
      }
    }
    setOpen(newOpen);
    if (!newOpen) {
      setStats(null);
      setProgress(0);
      setStatusMessage('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          K7-Daten importieren
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>K7-Daten Import</DialogTitle>
          <DialogDescription>
            Excel/CSV mit Leistungsprodukten und Bandbreiten importieren. 
            Die Daten werden anhand der GEBAEUDE_N Spalte den Gebäuden zugeordnet.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Erforderliche Spalten:</strong>
            <ul className="list-disc list-inside mt-2 text-sm">
              <li>GEBAEUDE_N (Gebäude ID V2 - für Zuordnung)</li>
              <li>STD_KABEL_GEBAEUDE_ID (K7 Gebäude ID)</li>
              <li>LEISTUNGSPRODUKT_ID</li>
              <li>LEISTUNGSPRODUKT</li>
              <li>NT_DSL_BANDBREITE_ID</li>
              <li>BANDBREITE</li>
            </ul>
          </AlertDescription>
        </Alert>

        {importing ? (
          <div className="space-y-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">{statusMessage}</p>
          </div>
        ) : stats ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Import abgeschlossen</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Gesamte Zeilen:</span>
                <span className="ml-2 font-medium">{stats.totalRows.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Gebäude gefunden:</span>
                <span className="ml-2 font-medium">{stats.matchedBuildings.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Neue Einträge:</span>
                <span className="ml-2 font-medium text-green-600">{stats.newEntries.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Übersprungen:</span>
                <span className="ml-2 font-medium text-muted-foreground">{stats.skippedRows.toLocaleString()}</span>
              </div>
            </div>
            {stats.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {stats.errors.slice(0, 3).map((err, i) => (
                    <p key={i} className="text-xs">{err}</p>
                  ))}
                  {stats.errors.length > 3 && (
                    <p className="text-xs">...und {stats.errors.length - 3} weitere Fehler</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <Button onClick={() => setStats(null)} className="w-full">
              Weiteren Import starten
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
              size="lg"
            >
              <Upload className="h-4 w-4 mr-2" />
              CSV/Excel-Datei auswählen
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Unterstützt große Dateien (200.000+ Zeilen)
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
