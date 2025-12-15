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
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface K7DataImportDialogProps {
  onImportComplete?: () => void;
}

interface ImportStats {
  totalRows: number;
  matchedBuildings: number;
  newEntries: number;
  skippedRows: number;
  unmatchedRows: Array<Record<string, string>>; // Full row data for export
  errors: string[];
  debugInfo: {
    separator: string;
    headers: string[];
    sampleRow: Record<string, string> | null;
    encoding: string;
  };
}

export function K7DataImportDialog({ onImportComplete }: K7DataImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fix common encoding issues (UTF-8 read as Latin-1 or vice versa)
  const fixEncodingIssues = (text: string): string => {
    // Common UTF-8 interpreted as Windows-1252/Latin-1 corruptions
    return text
      // ß corruption patterns
      .replace(/ÃŸ/g, 'ß')
      .replace(/Ã\u009F/g, 'ß')
      .replace(/ï¿½/g, 'ß') // replacement character often means ß in German context
      // ä corruption patterns
      .replace(/Ã¤/g, 'ä')
      .replace(/Ã\u0084/g, 'Ä')
      // ö corruption patterns
      .replace(/Ã¶/g, 'ö')
      .replace(/Ã\u0096/g, 'Ö')
      // ü corruption patterns
      .replace(/Ã¼/g, 'ü')
      .replace(/Ã\u009C/g, 'Ü')
      // Uppercase umlauts
      .replace(/Ã„/g, 'Ä')
      .replace(/Ã–/g, 'Ö')
      .replace(/Ãœ/g, 'Ü');
  };

  // Normalize string for tolerant matching (umlauts, ß, encoding artifacts)
  const normalizeForMatching = (input: string): string => {
    if (!input) return '';

    // keep original as much as possible, then normalize
    let s = input.toLowerCase().trim();
    s = s.replace(/\s+/g, ' ');

    // Fix obvious mojibake patterns (Ã¼ → ü, etc.)
    s = fixEncodingIssues(s);

    // If the source already contains '?' as replacement (e.g. "stra?e"), treat it as ß→ss (common in these exports)
    s = s.replace(/([a-z])\?([a-z])/g, '$1ss$2');
    // Also handle replacement char between letters
    s = s.replace(/([a-z])�([a-z])/g, '$1ss$2');

    // Normalize Straße variants before ß mapping
    s = s
      .replace(/\bstraße\b/g, 'strasse')
      .replace(/\bstrasse\b/g, 'strasse')
      .replace(/\bstr\.\b/g, 'strasse')
      .replace(/\bstr\b/g, 'strasse');

    // Transliterate German characters
    s = s
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss');

    // Remove punctuation (keep letters, numbers, spaces)
    s = s.replace(/[^a-z0-9 ]/g, '');
    s = s.replace(/\s+/g, ' ').trim();

    return s;
  };

  // Key token for address matching (ignore hyphen vs space, etc.)
  const toKeyToken = (input: string): string => normalizeForMatching(input).replace(/\s+/g, '');

  const parseCSV = (
    text: string,
    encodingHint: string
  ): { rows: Record<string, string>[]; separator: string; headers: string[]; encoding: string } => {
    const lines = text.split('\n');
    if (lines.length < 2) return { rows: [], separator: ',', headers: [], encoding: encodingHint };

    // Parse header - handle different separators (tab, semicolon, comma)
    let separator = ',';
    if (lines[0].includes('\t')) {
      separator = '\t';
    } else if (lines[0].includes(';')) {
      separator = ';';
    }

    console.log('CSV Separator detected:', separator === '\t' ? 'TAB' : separator);

    const headers = lines[0].split(separator).map((h) => h.trim().replace(/"/g, ''));
    console.log('CSV Headers:', headers);

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(separator).map((v) => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      rows.push(row);
    }

    return { rows, separator, headers, encoding: encodingHint };
  };

  const readFileTextSmart = async (file: File): Promise<{ text: string; encoding: string }> => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const safeDecode = (label: string): string => {
      // Some browsers might not support windows-1252 label; fallback handled outside.
      return new TextDecoder(label as any, { fatal: false }).decode(bytes);
    };

    const utf8 = safeDecode('utf-8');

    let legacy = '';
    let legacyLabel = 'Windows-1252';
    try {
      legacy = safeDecode('windows-1252');
    } catch {
      legacyLabel = 'ISO-8859-1';
      legacy = safeDecode('iso-8859-1');
    }

    const score = (t: string) => {
      const count = (re: RegExp) => t.match(re)?.length ?? 0;
      // Prefer fewer replacement chars and fewer mojibake markers
      return count(/�/g) * 50 + count(/Ã/g) * 5 + count(/ï¿½/g) * 50;
    };

    let chosen = utf8;
    let encoding = 'UTF-8';

    if (score(legacy) < score(utf8)) {
      chosen = legacy;
      encoding = legacyLabel;
    }

    // If it still looks like mojibake, fix common patterns
    const fixed = chosen.includes('Ã') ? fixEncodingIssues(chosen) : chosen;
    if (fixed !== chosen) {
      encoding = `${encoding} → UTF-8 korrigiert`;
    }

    return { text: fixed, encoding };
  };

  const downloadUnmatchedRows = () => {
    if (!stats?.unmatchedRows.length || !stats.debugInfo.headers.length) return;
    
    const headers = stats.debugInfo.headers;
    
    // Build CSV with all original columns
    const csvLines = [
      headers.join(';'),
      ...stats.unmatchedRows.map(row => 
        headers.map(h => {
          const val = row[h] || '';
          // Escape semicolons and quotes
          if (val.includes(';') || val.includes('"')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(';')
      )
    ];
    
    // Add BOM for Excel UTF-8 compatibility
    const csvContent = '\uFEFF' + csvLines.join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nicht_gematchte_zeilen.csv';
    link.click();
    URL.revokeObjectURL(url);
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
      const { text, encoding } = await readFileTextSmart(file);
      const { rows, separator, headers } = parseCSV(text, encoding);
      
      if (rows.length === 0) {
        throw new Error('Keine Daten in der Datei gefunden');
      }

      // Log first row for debugging
      console.log('First CSV row:', rows[0]);

      setStatusMessage(`${rows.length.toLocaleString()} Zeilen gefunden. Lade Gebäude...`);

      const PAGE_SIZE = 1000;
      const allBuildings: Array<{
        id: string;
        street: string;
        house_number: string;
        postal_code: string | null;
        city: string;
        gebaeude_id_k7: string | null;
      }> = [];

      for (let from = 0; ; from += PAGE_SIZE) {
        const to = from + PAGE_SIZE - 1;
        const { data: page, error: pageError } = await supabase
          .from('buildings')
          .select('id, street, house_number, postal_code, city, gebaeude_id_k7')
          .range(from, to);

        if (pageError) throw pageError;
        allBuildings.push(...(page || []));

        // PostgREST liefert standardmäßig max. 1000 Zeilen pro Request → daher paginiert laden
        setStatusMessage(`Lade Gebäude... ${allBuildings.length.toLocaleString()} geladen`);
        if (!page || page.length < PAGE_SIZE) break;
      }

      console.log(`Loaded ${allBuildings.length} buildings from database`);

      // Create lookup map by TOLERANT normalized address (street + house_number + postal_code/city)
      // Using normalizeForMatching which handles umlauts and encoding issues
      const buildingLookup = new Map<string, { id: string; gebaeude_id_k7: string | null }>();
      
      for (const building of allBuildings) {
        const street = normalizeForMatching(building.street);
        const houseNum = (building.house_number ?? '').toLowerCase().replace(/\s+/g, '');
        const plz = building.postal_code?.trim() || '';
        const city = normalizeForMatching(building.city);
        
        // Key with PLZ
        if (plz) {
          const keyWithPlz = `${street}|${houseNum}|${plz}`;
          buildingLookup.set(keyWithPlz, { id: building.id, gebaeude_id_k7: building.gebaeude_id_k7 });
        }
        // Key with city
        const keyWithCity = `${street}|${houseNum}|${city}`;
        buildingLookup.set(keyWithCity, { id: building.id, gebaeude_id_k7: building.gebaeude_id_k7 });
      }

      setStatusMessage(`${buildingLookup.size} Gebäude-Keys geladen. Verarbeite Daten...`);

      const importStats: ImportStats = {
        totalRows: rows.length,
        matchedBuildings: 0,
        newEntries: 0,
        skippedRows: 0,
        unmatchedRows: [],
        errors: [],
        debugInfo: {
          separator: separator === '\t' ? 'TAB' : separator,
          headers,
          sampleRow: rows[0] || null,
          encoding
        }
      };

      // Process rows and match to buildings
      const BATCH_SIZE = 500;
      const entriesToInsert: Array<{
        building_id: string;
        std_kabel_gebaeude_id: string | null;
        leistungsprodukt_id: string | null;
        leistungsprodukt: string | null;
        nt_dsl_bandbreite_id: string | null;
        bandbreite: string | null;
      }> = [];

      const matchedBuildingIds = new Set<string>();
      const seenUnmatchedKeys = new Set<string>();
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Get address fields from CSV (handle different column name cases including German umlauts)
        const streetRaw = row['STRASSE'] || row['Strasse'] || row['strasse'] || row['Straße'] || row['STRASSE '] || row['Strasse '] || row['Straße '] || '';
        const houseNumRaw = row['HAUSNUMMER'] || row['Hausnummer'] || row['hausnummer'] || row['HAUSNUMME'] || row['Hausnr'] || row['HAUSNR'] || row['Hausnummer '] || '';
        const plzRaw = row['PLZ'] || row['Plz'] || row['plz'] || row['PLZ '] || '';
        const cityRaw = row['ORT'] || row['Ort'] || row['ort'] || row['TEILORT_NAME'] || row['Stadt'] || row['STADT'] || row['City'] || row['Ort '] || '';

        // Use TOLERANT matching normalization
        const street = normalizeForMatching(streetRaw);
        const houseNum = houseNumRaw.toLowerCase().replace(/\s+/g, '');
        const plz = plzRaw.trim();
        const city = normalizeForMatching(cityRaw);

        if (!street || !houseNum) {
          importStats.skippedRows++;
          continue;
        }

        // Try to find building - first by PLZ, then by city
        let building = null;
        const keyWithPlz = `${street}|${houseNum}|${plz}`;
        const keyWithCity = `${street}|${houseNum}|${city}`;
        
        if (plz) {
          building = buildingLookup.get(keyWithPlz);
        }
        if (!building && city) {
          building = buildingLookup.get(keyWithCity);
        }

        if (building) {
          matchedBuildingIds.add(building.id);
          
          const stdKabelGebaudeId = row['STD_KABEL_GEBAEUDE_ID'] || row['std_kabel_gebaeude_id'] || '';
          const leistungsproduktId = row['LEISTUNGSPRODUKT_ID'] || row['leistungsprodukt_id'] || '';
          const leistungsprodukt = row['LEISTUNGSPRODUKT'] || row['leistungsprodukt'] || '';
          const ntDslBandbreiteId = row['NT_DSL_BANDBREITE_ID'] || row['nt_dsl_bandbreite_id'] || '';
          const bandbreite = row['BANDBREITE'] || row['bandbreite'] || '';

          // Skip if no meaningful K7 data
          if (!leistungsproduktId && !ntDslBandbreiteId && !stdKabelGebaudeId) {
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
        } else {
          importStats.skippedRows++;
          
          // Track unmatched rows with FULL row data (limit to first 5000 for memory)
          const addrKey = `${street}|${houseNum}|${plz}|${city}`;
          if (!seenUnmatchedKeys.has(addrKey) && importStats.unmatchedRows.length < 5000) {
            seenUnmatchedKeys.add(addrKey);
            importStats.unmatchedRows.push(row); // Store full row for export
          }
        }

        // Update progress every 10000 rows
        if (i % 10000 === 0) {
          setProgress(Math.round((i / rows.length) * 50));
          setStatusMessage(`${i.toLocaleString()} / ${rows.length.toLocaleString()} Zeilen verarbeitet...`);
        }
      }

      importStats.matchedBuildings = matchedBuildingIds.size;

      console.log(`Matched ${matchedBuildingIds.size} buildings, ${entriesToInsert.length} entries to insert`);
      console.log('Sample unmatched rows:', importStats.unmatchedRows.slice(0, 3));

      setStatusMessage(`Prüfe auf bereits vorhandene Einträge...`);

      // Fetch existing K7 services to avoid duplicates (ebenfalls paginiert, sonst fehlen Daten >1000)
      const allExistingServices: Array<{
        building_id: string;
        leistungsprodukt_id: string | null;
        nt_dsl_bandbreite_id: string | null;
      }> = [];

      for (let from = 0; ; from += PAGE_SIZE) {
        const to = from + PAGE_SIZE - 1;
        const { data: page, error: pageError } = await supabase
          .from('building_k7_services')
          .select('building_id, leistungsprodukt_id, nt_dsl_bandbreite_id')
          .range(from, to);

        if (pageError) throw pageError;
        allExistingServices.push(...(page || []));

        if (!page || page.length < PAGE_SIZE) break;
        // Status nicht bei jeder Seite spammen
        if (from === 0 || from % (PAGE_SIZE * 10) === 0) {
          setStatusMessage(`Prüfe Duplikate... ${allExistingServices.length.toLocaleString()} vorhandene Einträge geladen`);
        }
      }

      // Create a set of existing combinations for fast lookup
      const existingKeys = new Set<string>();
      for (const service of allExistingServices) {
        const key = `${service.building_id}|${service.leistungsprodukt_id || ''}|${service.nt_dsl_bandbreite_id || ''}`;
        existingKeys.add(key);
      }

      // Filter out entries that already exist
      const newEntries = entriesToInsert.filter(entry => {
        const key = `${entry.building_id}|${entry.leistungsprodukt_id || ''}|${entry.nt_dsl_bandbreite_id || ''}`;
        return !existingKeys.has(key);
      });

      const duplicatesSkipped = entriesToInsert.length - newEntries.length;
      if (duplicatesSkipped > 0) {
        setStatusMessage(`${duplicatesSkipped.toLocaleString()} bereits vorhandene Einträge übersprungen. Speichere ${newEntries.length.toLocaleString()} neue Einträge...`);
      } else {
        setStatusMessage(`${newEntries.length.toLocaleString()} Einträge werden gespeichert...`);
      }

      // Create import log entry first
      const { data: importLog, error: logError } = await supabase
        .from('csv_import_logs')
        .insert({
          import_type: 'k7_services',
          file_name: file.name,
          records_processed: rows.length,
          records_created: 0,
          records_skipped: importStats.skippedRows,
          affected_building_ids: [],
        })
        .select()
        .single();

      if (logError) {
        console.error('Error creating import log:', logError);
      }

      // Insert only new entries in batches and collect inserted IDs
      let insertedCount = 0;
      const insertedIds: string[] = [];
      
      for (let i = 0; i < newEntries.length; i += BATCH_SIZE) {
        const batch = newEntries.slice(i, i + BATCH_SIZE);
        
        const { data: insertedData, error: insertError } = await supabase
          .from('building_k7_services')
          .insert(batch)
          .select('id');

        if (insertError) {
          importStats.errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${insertError.message}`);
        } else {
          insertedCount += (insertedData?.length || 0);
          insertedIds.push(...(insertedData?.map(d => d.id) || []));
        }

        setProgress(50 + Math.round(((i + batch.length) / newEntries.length) * 50));
        setStatusMessage(`${insertedCount.toLocaleString()} / ${newEntries.length.toLocaleString()} Einträge gespeichert...`);
      }

      // Update import log with results
      if (importLog) {
        await supabase
          .from('csv_import_logs')
          .update({
            records_created: insertedCount,
            records_skipped: importStats.skippedRows + duplicatesSkipped,
            // Store K7 service IDs in previous_states as JSON (affected_building_ids is for building UUIDs)
            previous_states: { inserted_k7_service_ids: insertedIds },
            errors: importStats.errors.length > 0 ? importStats.errors : null,
          })
          .eq('id', importLog.id);
      }

      importStats.newEntries = insertedCount;
      importStats.skippedRows += duplicatesSkipped;
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
            CSV mit K7-Daten (Leistungsprodukte und Bandbreiten) importieren. 
            Die Zuordnung erfolgt über PLZ, Straße und Hausnummer.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Abgleich über:</strong> PLZ + Straße + Hausnummer
            <br /><br />
            <strong>Erforderliche Spalten:</strong>
            <ul className="list-disc list-inside mt-2 text-sm">
              <li>STRASSE, HAUSNUMMER, PLZ oder ORT (für Abgleich)</li>
              <li>STD_KABEL_GEBAEUDE_ID (K7 Gebäude ID)</li>
              <li>LEISTUNGSPRODUKT_ID + LEISTUNGSPRODUKT</li>
              <li>NT_DSL_BANDBREITE_ID + BANDBREITE</li>
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
            
            {/* Debug Info */}
            <div className="text-xs bg-muted p-2 rounded space-y-1">
              <p><strong>Separator:</strong> {stats.debugInfo.separator}</p>
              <p><strong>Encoding:</strong> {stats.debugInfo.encoding}</p>
              <p><strong>Spalten:</strong> {stats.debugInfo.headers.slice(0, 8).join(', ')}{stats.debugInfo.headers.length > 8 ? ` (+${stats.debugInfo.headers.length - 8} weitere)` : ''}</p>
              {stats.debugInfo.sampleRow && (
                <p><strong>Erste Zeile STRASSE:</strong> "{stats.debugInfo.sampleRow['STRASSE'] || stats.debugInfo.sampleRow['Strasse'] || 'nicht gefunden'}"</p>
              )}
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
            
            {/* Unmatched rows preview */}
            {stats.unmatchedRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-600">
                  {stats.unmatchedRows.length >= 5000 ? '5000+' : stats.unmatchedRows.length} nicht-gematchte Zeilen (Beispiele):
                </p>
                <div className="text-xs bg-orange-50 dark:bg-orange-950/20 p-2 rounded max-h-32 overflow-y-auto">
                  {stats.unmatchedRows.slice(0, 10).map((row, i) => {
                    const street = row['STRASSE'] || row['Strasse'] || '';
                    const houseNum = row['HAUSNUMMER'] || row['Hausnummer'] || '';
                    const plz = row['PLZ'] || row['Plz'] || '';
                    const city = row['ORT'] || row['Ort'] || '';
                    return (
                      <p key={i} className="text-orange-700 dark:text-orange-300">
                        {street} {houseNum}, {plz} {city}
                      </p>
                    );
                  })}
                  {stats.unmatchedRows.length > 10 && (
                    <p className="text-orange-500">...und weitere</p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadUnmatchedRows}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Nicht-gematchte Zeilen exportieren (alle Spalten)
                </Button>
              </div>
            )}
            
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
