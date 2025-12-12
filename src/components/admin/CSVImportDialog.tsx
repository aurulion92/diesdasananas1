import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Loader2,
  FileSpreadsheet,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

// Known field mappings based on typical CSV structures
const KNOWN_MAPPINGS: Record<string, string> = {
  'strasse': 'street',
  'straße': 'street',
  'street': 'street',
  'hausnummer': 'house_number',
  'hnr': 'house_number',
  'house_number': 'house_number',
  'stadt': 'city',
  'ort': 'city',
  'city': 'city',
  'plz': 'postal_code',
  'postleitzahl': 'postal_code',
  'postal_code': 'postal_code',
  'wohneinheiten': 'residential_units',
  'we': 'residential_units',
  'residential_units': 'residential_units',
  'ausbauart': 'ausbau_art',
  'ausbau_art': 'ausbau_art',
  'ausbaustatus': 'ausbau_status',
  'ausbau_status': 'ausbau_status',
  'tiefbau': 'tiefbau_done',
  'tiefbau_done': 'tiefbau_done',
  'apl': 'apl_set',
  'apl_set': 'apl_set',
  'kabel_tv': 'kabel_tv_available',
  'kabel_tv_available': 'kabel_tv_available',
  'kabeltv': 'kabel_tv_available',
  'gebaeude_id_v2': 'gebaeude_id_v2',
  'gebäude_id_v2': 'gebaeude_id_v2',
  'id_v2': 'gebaeude_id_v2',
  'gebaeude_id_k7': 'gebaeude_id_k7',
  'gebäude_id_k7': 'gebaeude_id_k7',
  'id_k7': 'gebaeude_id_k7',
};

const DB_FIELDS = [
  { key: 'street', label: 'Straße', required: true },
  { key: 'house_number', label: 'Hausnummer', required: true },
  { key: 'city', label: 'Stadt', required: false },
  { key: 'postal_code', label: 'PLZ', required: false },
  { key: 'residential_units', label: 'Wohneinheiten', required: false },
  { key: 'ausbau_art', label: 'Ausbauart', required: false },
  { key: 'ausbau_status', label: 'Ausbaustatus', required: false },
  { key: 'tiefbau_done', label: 'Tiefbau erledigt', required: false },
  { key: 'apl_set', label: 'APL gesetzt', required: false },
  { key: 'kabel_tv_available', label: 'Kabel TV verfügbar', required: false },
  { key: 'gebaeude_id_v2', label: 'Gebäude ID V2', required: false },
  { key: 'gebaeude_id_k7', label: 'Gebäude ID K7', required: false },
];

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

export const CSVImportDialog = ({ open, onOpenChange, onImportComplete }: CSVImportDialogProps) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setStep('upload');
    setCsvData([]);
    setHeaders([]);
    setMappings({});
    setImportResult(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: 'Fehler',
          description: 'CSV muss mindestens eine Kopfzeile und eine Datenzeile enthalten.',
          variant: 'destructive',
        });
        return;
      }

      // Parse CSV (handle quoted values and semicolons)
      const parseCSVLine = (line: string): string[] => {
        const separator = line.includes(';') ? ';' : ',';
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === separator && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const parsedHeaders = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').toLowerCase().trim());
      const parsedData = lines.slice(1).map(line => parseCSVLine(line));

      setHeaders(parsedHeaders);
      setCsvData(parsedData);

      // Auto-map columns using known mappings
      const autoMappings: Record<string, string> = {};
      parsedHeaders.forEach(header => {
        const normalized = header.toLowerCase().replace(/[^a-z0-9_äöü]/g, '');
        if (KNOWN_MAPPINGS[normalized]) {
          autoMappings[header] = KNOWN_MAPPINGS[normalized];
        }
      });
      setMappings(autoMappings);

      setStep('mapping');
      
      toast({
        title: 'CSV geladen',
        description: `${parsedData.length} Zeilen erkannt. Spalten wurden automatisch zugeordnet.`,
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        title: 'Fehler',
        description: 'CSV konnte nicht gelesen werden.',
        variant: 'destructive',
      });
    }
  };

  const updateMapping = (csvColumn: string, dbField: string) => {
    setMappings(prev => {
      const newMappings = { ...prev };
      // Remove any existing mapping to this DB field
      Object.keys(newMappings).forEach(key => {
        if (newMappings[key] === dbField) {
          delete newMappings[key];
        }
      });
      if (dbField) {
        newMappings[csvColumn] = dbField;
      } else {
        delete newMappings[csvColumn];
      }
      return newMappings;
    });
  };

  const canProceedToPreview = () => {
    const mappedFields = Object.values(mappings);
    return mappedFields.includes('street') && mappedFields.includes('house_number');
  };

  const transformRow = (row: string[]): Record<string, any> | null => {
    const result: Record<string, any> = {
      city: 'Falkensee', // Default
      residential_units: 1,
      is_manual_entry: false,
    };

    headers.forEach((header, index) => {
      const dbField = mappings[header];
      if (!dbField || !row[index]) return;

      const value = row[index].replace(/"/g, '').trim();
      if (!value) return;

      switch (dbField) {
        case 'street':
        case 'house_number':
        case 'city':
        case 'postal_code':
        case 'gebaeude_id_v2':
        case 'gebaeude_id_k7':
          result[dbField] = value;
          break;
        case 'residential_units':
          result[dbField] = parseInt(value) || 1;
          break;
        case 'ausbau_art':
          const art = value.toLowerCase();
          if (art.includes('ftth')) result[dbField] = 'ftth';
          else if (art.includes('fttb')) result[dbField] = 'fttb';
          break;
        case 'ausbau_status':
          const status = value.toLowerCase();
          if (status.includes('abgeschlossen') || status === 'fertig' || status === 'done') {
            result[dbField] = 'abgeschlossen';
          } else if (status.includes('ausbau') || status === 'in_progress') {
            result[dbField] = 'im_ausbau';
          } else {
            result[dbField] = 'geplant';
          }
          break;
        case 'tiefbau_done':
        case 'apl_set':
        case 'kabel_tv_available':
          result[dbField] = value === '1' || value.toLowerCase() === 'true' || value.toLowerCase() === 'ja' || value.toLowerCase() === 'yes';
          break;
      }
    });

    // Validate required fields
    if (!result.street || !result.house_number) {
      return null;
    }

    return result;
  };

  const handleImport = async () => {
    setImporting(true);
    setStep('importing');

    const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

    try {
      for (const row of csvData) {
        const building = transformRow(row);
        if (!building) {
          result.skipped++;
          continue;
        }

        // Check if building exists
        const { data: existing } = await supabase
          .from('buildings')
          .select('id, has_manual_override, manual_override_active')
          .eq('street', building.street)
          .eq('house_number', building.house_number)
          .eq('city', building.city)
          .maybeSingle();

        if (existing) {
          // Skip if manual override is active
          if (existing.manual_override_active) {
            result.skipped++;
            continue;
          }

          // Update existing
          const { error } = await supabase
            .from('buildings')
            .update({
              ...building,
              original_csv_data: building as any,
            })
            .eq('id', existing.id);

          if (error) {
            result.errors.push(`${building.street} ${building.house_number}: ${error.message}`);
          } else {
            result.updated++;
          }
        } else {
          // Create new
          const insertData = {
            street: building.street,
            house_number: building.house_number,
            city: building.city || 'Falkensee',
            postal_code: building.postal_code || null,
            residential_units: building.residential_units || 1,
            ausbau_art: building.ausbau_art || null,
            ausbau_status: building.ausbau_status || 'geplant',
            tiefbau_done: building.tiefbau_done || false,
            apl_set: building.apl_set || false,
            kabel_tv_available: building.kabel_tv_available || false,
            gebaeude_id_v2: building.gebaeude_id_v2 || null,
            gebaeude_id_k7: building.gebaeude_id_k7 || null,
            is_manual_entry: false,
            original_csv_data: building as any,
          };
          
          const { error } = await supabase
            .from('buildings')
            .insert([insertData]);

          if (error) {
            result.errors.push(`${building.street} ${building.house_number}: ${error.message}`);
          } else {
            result.created++;
          }
        }
      }

      // Log import
      await supabase.from('csv_import_logs').insert({
        import_type: 'buildings',
        file_name: 'manual_upload',
        records_processed: csvData.length,
        records_created: result.created,
        records_updated: result.updated,
        records_skipped: result.skipped,
        errors: result.errors.length > 0 ? result.errors : null,
      });

      setImportResult(result);
      setStep('complete');

      toast({
        title: 'Import abgeschlossen',
        description: `${result.created} erstellt, ${result.updated} aktualisiert, ${result.skipped} übersprungen.`,
      });

      onImportComplete();
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import fehlgeschlagen',
        description: error.message,
        variant: 'destructive',
      });
      setStep('mapping');
    } finally {
      setImporting(false);
    }
  };

  const previewData = csvData.slice(0, 5).map(row => transformRow(row)).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            CSV Import - Gebäude
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Laden Sie eine CSV-Datei mit Gebäudedaten hoch.'}
            {step === 'mapping' && 'Überprüfen Sie die Spaltenzuordnung. KI hat bekannte Spalten automatisch zugeordnet.'}
            {step === 'preview' && 'Überprüfen Sie die Vorschau vor dem Import.'}
            {step === 'importing' && 'Import läuft...'}
            {step === 'complete' && 'Import abgeschlossen.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">CSV-Datei auswählen</p>
              <p className="text-sm text-muted-foreground mt-1">
                Unterstützt: CSV mit Komma oder Semikolon als Trennzeichen
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                Intelligente Spaltenzuordnung
              </h4>
              <p className="text-sm text-muted-foreground">
                Die KI erkennt automatisch Spalten wie "Straße", "Hausnummer", "Ausbauart" etc. 
                und ordnet sie den Datenbankfeldern zu. Sie können die Zuordnung anschließend anpassen.
              </p>
            </div>
          </div>
        )}

        {/* Step: Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>{Object.keys(mappings).length} von {headers.length} Spalten automatisch zugeordnet</span>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CSV-Spalte</TableHead>
                    <TableHead>Beispielwert</TableHead>
                    <TableHead></TableHead>
                    <TableHead>Datenbankfeld</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headers.map((header, index) => (
                    <TableRow key={header}>
                      <TableCell className="font-mono text-sm">{header}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-32 truncate">
                        {csvData[0]?.[index]?.substring(0, 30) || '-'}
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mappings[header] || 'skip'}
                          onValueChange={(value) => updateMapping(header, value === 'skip' ? '' : value)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">
                              <span className="text-muted-foreground">— Überspringen —</span>
                            </SelectItem>
                            {DB_FIELDS.map(field => (
                              <SelectItem key={field.key} value={field.key}>
                                {field.label} {field.required && '*'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm">
                <span className="text-muted-foreground">{csvData.length} Zeilen</span>
                {!canProceedToPreview() && (
                  <span className="text-destructive ml-4">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Straße und Hausnummer müssen zugeordnet werden
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { onOpenChange(false); resetState(); }}>
                  Abbrechen
                </Button>
                <Button onClick={() => setStep('preview')} disabled={!canProceedToPreview()}>
                  Vorschau
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Straße</TableHead>
                    <TableHead>Nr.</TableHead>
                    <TableHead>Stadt</TableHead>
                    <TableHead>WE</TableHead>
                    <TableHead>Ausbauart</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row?.street}</TableCell>
                      <TableCell>{row?.house_number}</TableCell>
                      <TableCell>{row?.city}</TableCell>
                      <TableCell>{row?.residential_units}</TableCell>
                      <TableCell>
                        {row?.ausbau_art && (
                          <Badge variant={row.ausbau_art === 'ftth' ? 'default' : 'secondary'}>
                            {row.ausbau_art.toUpperCase()}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {row?.ausbau_status?.replace('_', ' ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-sm text-muted-foreground">
              Vorschau der ersten {previewData.length} von {csvData.length} Zeilen
            </p>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Zurück
              </Button>
              <Button onClick={handleImport}>
                <Upload className="w-4 h-4 mr-2" />
                {csvData.length} Gebäude importieren
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <p className="mt-4 text-lg font-medium">Import läuft...</p>
            <p className="text-sm text-muted-foreground">Bitte warten Sie, dies kann einen Moment dauern.</p>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && importResult && (
          <div className="space-y-4">
            <div className="py-8 text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-success" />
              <p className="mt-4 text-xl font-medium">Import abgeschlossen</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-success">{importResult.created}</div>
                <div className="text-sm text-muted-foreground">Erstellt</div>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-primary">{importResult.updated}</div>
                <div className="text-sm text-muted-foreground">Aktualisiert</div>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-muted-foreground">{importResult.skipped}</div>
                <div className="text-sm text-muted-foreground">Übersprungen</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <h4 className="font-medium text-destructive mb-2">
                  {importResult.errors.length} Fehler
                </h4>
                <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                  {importResult.errors.slice(0, 10).map((err, idx) => (
                    <li key={idx} className="text-muted-foreground">{err}</li>
                  ))}
                  {importResult.errors.length > 10 && (
                    <li className="text-muted-foreground">...und {importResult.errors.length - 10} weitere</li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => { onOpenChange(false); resetState(); }}>
                Schließen
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
