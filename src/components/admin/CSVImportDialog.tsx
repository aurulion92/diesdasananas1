import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Loader2,
  FileSpreadsheet,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Wrench,
  RotateCcw,
  Settings,
  X,
  Plus,
  Eye,
  Info
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

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
  'ftth_portal': 'gebaeude_id_v2',
  'ftthportal': 'gebaeude_id_v2',
  'ftth_portal_id': 'gebaeude_id_v2',
  'ftthportalid': 'gebaeude_id_v2',
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

type ImportStep = 'upload' | 'settings' | 'mapping' | 'preview' | 'sync-check' | 'importing' | 'complete';
type ImportMode = 'manual' | 'automatic';

interface SyncConflict {
  building: any;
  existing: any;
  changes: { field: string; oldValue: any; newValue: any }[];
}

interface CSVImportSettings {
  ignore_patterns: string[];
  default_mode: ImportMode;
}

interface PreviewRow {
  data: Record<string, any>;
  existing: any | null;
  hasChanges: boolean;
  changes: { field: string; oldValue: any; newValue: any }[];
  willBeSkipped: boolean;
  skipReason?: string;
}

export const CSVImportDialog = ({ open, onOpenChange, onImportComplete }: CSVImportDialogProps) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ 
    created: number; 
    updated: number; 
    skipped: number; 
    errors: string[];
    batchId: string | null;
  } | null>(null);
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([]);
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set());
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [settings, setSettings] = useState<CSVImportSettings>({
    ignore_patterns: ['flurstück'],
    default_mode: 'manual'
  });
  const [importMode, setImportMode] = useState<ImportMode>('manual');
  const [newIgnorePattern, setNewIgnorePattern] = useState('');
  const [ignoredRowsCount, setIgnoredRowsCount] = useState(0);
  const [invalidRowsCount, setInvalidRowsCount] = useState(0);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, phase: '' });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [importAborted, setImportAborted] = useState(false);
  const abortControllerRef = useRef<{ aborted: boolean }>({ aborted: false });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'csv_import_settings')
        .maybeSingle();
      
      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        const loadedSettings = data.value as unknown as CSVImportSettings;
        if (loadedSettings.ignore_patterns && loadedSettings.default_mode) {
          setSettings(loadedSettings);
          setImportMode(loadedSettings.default_mode || 'manual');
        }
      }
    };
    if (open) loadSettings();
  }, [open]);

  const saveSettings = async (newSettings: CSVImportSettings) => {
    setSettings(newSettings);
    await supabase
      .from('app_settings')
      .upsert({ 
        key: 'csv_import_settings', 
        value: newSettings as any,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
  };

  const addIgnorePattern = () => {
    if (newIgnorePattern.trim() && !settings.ignore_patterns.includes(newIgnorePattern.trim().toLowerCase())) {
      const newSettings = {
        ...settings,
        ignore_patterns: [...settings.ignore_patterns, newIgnorePattern.trim().toLowerCase()]
      };
      saveSettings(newSettings);
      setNewIgnorePattern('');
    }
  };

  const removeIgnorePattern = (pattern: string) => {
    const newSettings = {
      ...settings,
      ignore_patterns: settings.ignore_patterns.filter(p => p !== pattern)
    };
    saveSettings(newSettings);
  };

  const shouldIgnoreRow = (row: string[]): boolean => {
    const rowText = row.join(' ').toLowerCase();
    return settings.ignore_patterns.some(pattern => rowText.includes(pattern.toLowerCase()));
  };

  const resetState = () => {
    setStep('upload');
    setCsvData([]);
    setHeaders([]);
    setMappings({});
    setImportResult(null);
    setSyncConflicts([]);
    setSelectedConflicts(new Set());
    setPreviewRows([]);
    setIgnoredRowsCount(0);
    setInvalidRowsCount(0);
    setImportProgress({ current: 0, total: 0, phase: '' });
    setShowCancelConfirm(false);
    setImportAborted(false);
    abortControllerRef.current = { aborted: false };
  };

  const handleCancelImport = () => {
    if (importing) {
      setShowCancelConfirm(true);
    } else {
      onOpenChange(false);
      resetState();
    }
  };

  const confirmCancelImport = () => {
    abortControllerRef.current.aborted = true;
    setImportAborted(true);
    setShowCancelConfirm(false);
    toast({
      title: 'Import abgebrochen',
      description: 'Der Import wurde abgebrochen. Bereits importierte Daten bleiben erhalten.',
    });
    setStep('complete');
    setImporting(false);
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

      // Filter out ignored rows and count them
      const filteredData = parsedData.filter(row => !shouldIgnoreRow(row));
      const ignoredCount = parsedData.length - filteredData.length;
      setIgnoredRowsCount(ignoredCount);

      setHeaders(parsedHeaders);
      setCsvData(filteredData);

      // Auto-map columns using known mappings
      const autoMappings: Record<string, string> = {};
      parsedHeaders.forEach(header => {
        const normalized = header.toLowerCase().replace(/[^a-z0-9_äöü]/g, '');
        if (KNOWN_MAPPINGS[normalized]) {
          autoMappings[header] = KNOWN_MAPPINGS[normalized];
        }
      });
      setMappings(autoMappings);

      setStep('settings');
      
      toast({
        title: 'CSV geladen',
        description: `${filteredData.length} Zeilen erkannt${ignoredCount > 0 ? ` (${ignoredCount} ignoriert)` : ''}.`,
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

    // Validate required fields - street and house_number must exist and not be empty
    if (!result.street || !result.house_number || 
        result.street.trim() === '' || result.house_number.trim() === '') {
      return null;
    }

    return result;
  };

  // Filter out invalid rows (no street or house number) before processing
  const getValidRows = (): { valid: string[][], invalidCount: number } => {
    let invalidCount = 0;
    const valid = csvData.filter(row => {
      const building = transformRow(row);
      if (!building) {
        invalidCount++;
        return false;
      }
      return true;
    });
    return { valid, invalidCount };
  };

  // Build preview with change detection
  const buildPreview = async () => {
    setStep('importing');
    const preview: PreviewRow[] = [];
    
    for (const row of csvData) {
      const building = transformRow(row);
      if (!building) {
        preview.push({
          data: { street: row[0] || '-', house_number: row[1] || '-' },
          existing: null,
          hasChanges: false,
          changes: [],
          willBeSkipped: true,
          skipReason: 'Ungültige Daten'
        });
        continue;
      }

      const { data: existing } = await supabase
        .from('buildings')
        .select('*')
        .eq('street', building.street)
        .eq('house_number', building.house_number)
        .eq('city', building.city || 'Falkensee')
        .maybeSingle();

      const changes: { field: string; oldValue: any; newValue: any }[] = [];
      
      if (existing) {
        const fieldsToCompare = ['ausbau_art', 'ausbau_status', 'tiefbau_done', 'apl_set', 'kabel_tv_available', 'residential_units', 'gebaeude_id_v2', 'gebaeude_id_k7'];
        
        for (const field of fieldsToCompare) {
          if (building[field] !== undefined && existing[field] !== building[field]) {
            changes.push({
              field,
              oldValue: existing[field],
              newValue: building[field]
            });
          }
        }
      }

      const willBeSkipped = existing?.manual_override_active && changes.length > 0;

      preview.push({
        data: building,
        existing,
        hasChanges: changes.length > 0,
        changes,
        willBeSkipped,
        skipReason: willBeSkipped ? 'Manuelle Änderungen aktiv' : undefined
      });
    }

    setPreviewRows(preview);
    
    // Check for sync conflicts
    const conflicts = preview.filter(p => p.willBeSkipped && p.changes.length > 0);
    if (conflicts.length > 0 && importMode === 'manual') {
      setSyncConflicts(conflicts.map(c => ({
        building: c.data,
        existing: c.existing,
        changes: c.changes
      })));
      setStep('sync-check');
    } else {
      setStep('preview');
    }
  };

  const toggleConflictSelection = (id: string) => {
    setSelectedConflicts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const revertManualOverride = async (buildingId: string) => {
    const { error } = await supabase
      .from('buildings')
      .update({ 
        manual_override_active: false,
        has_manual_override: false 
      })
      .eq('id', buildingId);

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Manuelle Änderungen zurückgesetzt' });
      setSyncConflicts(prev => prev.filter(c => c.existing.id !== buildingId));
      // Also update preview
      setPreviewRows(prev => prev.map(p => 
        p.existing?.id === buildingId 
          ? { ...p, willBeSkipped: false, skipReason: undefined }
          : p
      ));
      if (syncConflicts.length <= 1) {
        setStep('preview');
      }
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setStep('importing');

    const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[], batchId: null as string | null };
    const affectedIds: string[] = [];
    const previousStates: any[] = [];
    const BATCH_SIZE = 500;

    try {
      console.log('CSV Import gestartet', { csvRows: csvData.length });
      // Initialen Fortschritt mit Gesamtzahl CSV-Zeilen setzen
      setImportProgress({ current: 0, total: csvData.length, phase: 'Prüfe Zeilen (Straße/Hausnummer)...' });

      // First, filter out invalid rows
      const { valid: validRows, invalidCount } = getValidRows();
      console.log('CSV Import - gültige/ungültige Zeilen', { valid: validRows.length, invalid: invalidCount });
      setInvalidRowsCount(invalidCount);
      result.skipped += invalidCount;

      const totalRows = validRows.length || csvData.length;
      setImportProgress({ current: 0, total: totalRows, phase: 'Vorbereitung...' });

      // Create import log entry first to get batch ID
      const { data: logEntry, error: logError } = await supabase
        .from('csv_import_logs')
        .insert({
          import_type: 'buildings',
          file_name: 'manual_upload',
          records_processed: csvData.length,
        })
        .select('id')
        .single();

      if (logError) throw logError;
      const batchId = logEntry.id;
      result.batchId = batchId;

      // Transform all valid rows
      setImportProgress({ current: 0, total: totalRows, phase: 'Transformiere Daten...' });
      const buildings = validRows.map(row => transformRow(row)).filter(Boolean) as Record<string, any>[];

      // Fetch all existing buildings in batches for comparison
      setImportProgress({ current: 0, total: totalRows, phase: 'Lade existierende Daten...' });
      const existingBuildings = new Map<string, any>();
      
      // Fetch existing buildings in chunks to avoid timeout
      const uniqueKeys = buildings.map(b => `${b.street}|${b.house_number}|${b.city || 'Falkensee'}`);
      const chunkSize = 1000;
      
      for (let i = 0; i < buildings.length; i += chunkSize) {
        const chunk = buildings.slice(i, i + chunkSize);
        const { data: existingChunk } = await supabase
          .from('buildings')
          .select('*')
          .or(chunk.map(b => `and(street.eq.${b.street},house_number.eq.${b.house_number},city.eq.${b.city || 'Falkensee'})`).join(','));
        
        if (existingChunk) {
          existingChunk.forEach(b => {
            existingBuildings.set(`${b.street}|${b.house_number}|${b.city}`, b);
          });
        }
        setImportProgress({ current: Math.min(i + chunkSize, buildings.length), total: totalRows, phase: 'Lade existierende Daten...' });
      }

      // Separate into updates and inserts
      const toUpdate: { building: Record<string, any>; existing: any }[] = [];
      const toInsert: Record<string, any>[] = [];

      for (const building of buildings) {
        const key = `${building.street}|${building.house_number}|${building.city || 'Falkensee'}`;
        const existing = existingBuildings.get(key);

        if (existing) {
          if (existing.manual_override_active) {
            result.skipped++;
          } else {
            toUpdate.push({ building, existing });
          }
        } else {
          toInsert.push(building);
        }
      }

      // Process inserts in batches
      setImportProgress({ current: 0, total: toInsert.length + toUpdate.length, phase: 'Erstelle neue Einträge...' });
      
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        // Check if import was aborted
        if (abortControllerRef.current.aborted) {
          console.log('Import abgebrochen bei Insert-Batch', i);
          break;
        }

        const batch = toInsert.slice(i, i + BATCH_SIZE).map(building => ({
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
          last_import_batch_id: batchId,
        }));

        const { data: insertedBuildings, error } = await supabase
          .from('buildings')
          .insert(batch)
          .select('id');

        if (error) {
          result.errors.push(`Batch Insert Fehler: ${error.message}`);
        } else {
          result.created += batch.length;
          if (insertedBuildings) {
            insertedBuildings.forEach(b => {
              previousStates.push({ id: b.id, type: 'create', previous: null });
              affectedIds.push(b.id);
            });
          }
        }

        setImportProgress({ 
          current: Math.min(i + BATCH_SIZE, toInsert.length), 
          total: toInsert.length + toUpdate.length, 
          phase: `Erstelle neue Einträge... (${Math.min(i + BATCH_SIZE, toInsert.length)}/${toInsert.length})` 
        });
      }

      // Process updates in batches
      setImportProgress({ 
        current: toInsert.length, 
        total: toInsert.length + toUpdate.length, 
        phase: 'Aktualisiere existierende Einträge...' 
      });

      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        // Check if import was aborted
        if (abortControllerRef.current.aborted) {
          console.log('Import abgebrochen bei Update-Batch', i);
          break;
        }

        const batch = toUpdate.slice(i, i + BATCH_SIZE);
        
        for (const { building, existing } of batch) {
          // Check abort in inner loop too
          if (abortControllerRef.current.aborted) break;

          previousStates.push({
            id: existing.id,
            type: 'update',
            previous: existing
          });
          affectedIds.push(existing.id);

          const { error } = await supabase
            .from('buildings')
            .update({
              ...building,
              original_csv_data: building as any,
              last_import_batch_id: batchId,
            })
            .eq('id', existing.id);

          if (error) {
            result.errors.push(`${building.street} ${building.house_number}: ${error.message}`);
          } else {
            result.updated++;
          }
        }

        setImportProgress({ 
          current: toInsert.length + Math.min(i + BATCH_SIZE, toUpdate.length), 
          total: toInsert.length + toUpdate.length, 
          phase: `Aktualisiere existierende Einträge... (${Math.min(i + BATCH_SIZE, toUpdate.length)}/${toUpdate.length})` 
        });
      }

      // Check if aborted before final steps
      if (abortControllerRef.current.aborted) {
        // Still save what we have
        await supabase
          .from('csv_import_logs')
          .update({
            records_created: result.created,
            records_updated: result.updated,
            records_skipped: result.skipped,
            errors: [...result.errors, 'Import wurde abgebrochen'],
            affected_building_ids: affectedIds,
            previous_states: previousStates,
          })
          .eq('id', batchId);
        
        setImportResult(result);
        return;
      }

      // Update import log with results and undo data
      await supabase
        .from('csv_import_logs')
        .update({
          records_created: result.created,
          records_updated: result.updated,
          records_skipped: result.skipped,
          errors: result.errors.length > 0 ? result.errors : null,
          affected_building_ids: affectedIds,
          previous_states: previousStates,
        })
        .eq('id', batchId);

      setImportResult(result);
      setStep('complete');

      toast({
        title: 'Import abgeschlossen',
        description: `${result.created} erstellt, ${result.updated} aktualisiert, ${result.skipped} übersprungen${invalidCount > 0 ? ` (davon ${invalidCount} ohne Straße/Hausnummer)` : ''}.`,
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

  const ChangePreviewTooltip = ({ changes }: { changes: { field: string; oldValue: any; newValue: any }[] }) => (
    <div className="space-y-1 text-xs">
      <div className="font-medium mb-2">Änderungen:</div>
      {changes.map((change, idx) => {
        const fieldLabel = DB_FIELDS.find(f => f.key === change.field)?.label || change.field;
        return (
          <div key={idx} className="flex items-center gap-2">
            <span className="font-medium">{fieldLabel}:</span>
            <span className="text-destructive line-through">{String(change.oldValue ?? '-')}</span>
            <ArrowRight className="w-3 h-3" />
            <span className="text-success">{String(change.newValue ?? '-')}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <Dialog 
      open={open} 
      onOpenChange={(o) => { 
        // Prevent closing during import unless user confirms
        if (importing && !o) {
          setShowCancelConfirm(true);
          return;
        }
        onOpenChange(o); 
        if (!o) resetState(); 
      }}
    >
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          // Prevent closing by clicking outside during import
          if (importing) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing with Escape during import
          if (importing) {
            e.preventDefault();
            setShowCancelConfirm(true);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            CSV Import - Gebäude
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Laden Sie eine CSV-Datei mit Gebäudedaten hoch.'}
            {step === 'settings' && 'Konfigurieren Sie den Import-Modus und Filterregeln.'}
            {step === 'mapping' && 'Überprüfen Sie die Spaltenzuordnung. KI hat bekannte Spalten automatisch zugeordnet.'}
            {step === 'preview' && 'Überprüfen Sie die Vorschau vor dem Import.'}
            {step === 'sync-check' && 'Konflikte mit manuell bearbeiteten Gebäuden.'}
            {step === 'importing' && 'Import läuft...'}
            {step === 'complete' && (importAborted ? 'Import abgebrochen.' : 'Import abgeschlossen.')}
          </DialogDescription>
        </DialogHeader>

        {/* Cancel Confirmation Dialog */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-background border rounded-lg p-6 max-w-md shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Import abbrechen?</h3>
              <p className="text-muted-foreground mb-4">
                Möchten Sie den Import wirklich abbrechen? Bereits importierte Daten bleiben erhalten, 
                aber der restliche Import geht verloren.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
                  Weitermachen
                </Button>
                <Button variant="destructive" onClick={confirmCancelImport}>
                  Abbrechen
                </Button>
              </div>
            </div>
          </div>
        )}

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

        {/* Step: Settings */}
        {step === 'settings' && (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-accent" />
                  <span className="font-medium">Import-Einstellungen</span>
                </div>
                {ignoredRowsCount > 0 && (
                  <Badge variant="secondary">
                    {ignoredRowsCount} Zeilen ignoriert
                  </Badge>
                )}
              </div>

              {/* Import Mode */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Import-Modus</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Entscheiden Sie, ob Sie jeden Eintrag manuell prüfen oder automatisch importieren möchten.
                  </p>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={importMode === 'manual' ? 'default' : 'outline'}
                      onClick={() => setImportMode('manual')}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Manuell prüfen
                    </Button>
                    <Button
                      type="button"
                      variant={importMode === 'automatic' ? 'default' : 'outline'}
                      onClick={() => setImportMode('automatic')}
                      className="flex-1"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Automatisch
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {importMode === 'manual' 
                      ? 'Sie sehen eine Vorschau aller Änderungen und können Konflikte manuell lösen.'
                      : 'Alle Einträge werden sofort importiert. Manuell bearbeitete Gebäude werden übersprungen.'}
                  </p>
                </div>

                {/* Ignore Patterns */}
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium">Zeilen ignorieren</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Zeilen, die diese Begriffe enthalten, werden beim Import ignoriert.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {settings.ignore_patterns.map((pattern) => (
                      <Badge key={pattern} variant="secondary" className="flex items-center gap-1">
                        {pattern}
                        <button 
                          onClick={() => removeIgnorePattern(pattern)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="z.B. 'flurstück', 'test', ..."
                      value={newIgnorePattern}
                      onChange={(e) => setNewIgnorePattern(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIgnorePattern())}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addIgnorePattern}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { onOpenChange(false); resetState(); }}>
                Abbrechen
              </Button>
              <Button onClick={() => setStep('mapping')}>
                Weiter zur Spaltenzuordnung
              </Button>
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
                {ignoredRowsCount > 0 && (
                  <span className="text-muted-foreground ml-2">({ignoredRowsCount} ignoriert)</span>
                )}
                {!canProceedToPreview() && (
                  <span className="text-destructive ml-4">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Straße und Hausnummer müssen zugeordnet werden
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('settings')}>
                  Zurück
                </Button>
                <Button onClick={buildPreview} disabled={!canProceedToPreview()}>
                  Vorschau
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Sync Check - Show conflicts with manually edited buildings */}
        {step === 'sync-check' && (
          <div className="space-y-4">
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-warning font-medium mb-2">
                <AlertTriangle className="w-5 h-5" />
                {syncConflicts.length} manuell bearbeitete Gebäude betroffen
              </div>
              <p className="text-sm text-muted-foreground">
                Die folgenden Gebäude wurden manuell bearbeitet. Sie können entscheiden, ob Sie die manuellen Änderungen beibehalten oder durch die CSV-Daten ersetzen möchten.
              </p>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-3">
              {syncConflicts.map((conflict, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-accent" />
                      <span className="font-medium">
                        {conflict.existing.street} {conflict.existing.house_number}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => revertManualOverride(conflict.existing.id)}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Änderungen zurücksetzen
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div className="text-muted-foreground mb-2">Unterschiede:</div>
                    {conflict.changes.map((change, cIdx) => {
                      const fieldLabel = DB_FIELDS.find(f => f.key === change.field)?.label || change.field;
                      return (
                        <div key={cIdx} className="flex items-center gap-2 pl-2 border-l-2 border-muted">
                          <span className="font-medium min-w-24">{fieldLabel}:</span>
                          <span className="text-destructive line-through">
                            {String(change.oldValue ?? '-')}
                          </span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-success">
                            {String(change.newValue ?? '-')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Zurück
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('preview')}>
                  Trotzdem fortfahren (Konflikte überspringen)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm mb-2">
              <Badge variant="outline" className="gap-1">
                <span className="w-2 h-2 rounded-full bg-success" />
                Neu: {previewRows.filter(r => !r.existing && !r.willBeSkipped).length}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Update: {previewRows.filter(r => r.existing && r.hasChanges && !r.willBeSkipped).length}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                Übersprungen: {previewRows.filter(r => r.willBeSkipped || (!r.hasChanges && r.existing)).length}
              </Badge>
            </div>

            <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Straße</TableHead>
                    <TableHead>Nr.</TableHead>
                    <TableHead>Stadt</TableHead>
                    <TableHead>WE</TableHead>
                    <TableHead>Ausbauart</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.slice(0, 50).map((row, idx) => (
                    <TableRow 
                      key={idx} 
                      className={row.willBeSkipped ? 'opacity-50' : row.hasChanges ? 'bg-primary/5' : ''}
                    >
                      <TableCell>
                        {row.willBeSkipped ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="w-4 h-4 text-warning" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{row.skipReason}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : row.hasChanges && row.existing ? (
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <button className="hover:bg-accent/20 p-1 rounded">
                                <Wrench className="w-4 h-4 text-accent" />
                              </button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              <ChangePreviewTooltip changes={row.changes} />
                            </HoverCardContent>
                          </HoverCard>
                        ) : !row.existing ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Plus className="w-4 h-4 text-success" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Neu</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : null}
                      </TableCell>
                      <TableCell>{row.data.street}</TableCell>
                      <TableCell>{row.data.house_number}</TableCell>
                      <TableCell>{row.data.city}</TableCell>
                      <TableCell>{row.data.residential_units}</TableCell>
                      <TableCell>
                        {row.data.ausbau_art && (
                          <Badge variant={row.data.ausbau_art === 'ftth' ? 'default' : 'secondary'}>
                            {row.data.ausbau_art.toUpperCase()}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {row.data.ausbau_status?.replace('_', ' ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {previewRows.length > 50 && (
              <p className="text-sm text-muted-foreground">
                Zeige 50 von {previewRows.length} Zeilen
              </p>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Zurück
              </Button>
              <Button onClick={handleImport}>
                <Upload className="w-4 h-4 mr-2" />
                {previewRows.filter(r => !r.willBeSkipped && (r.hasChanges || !r.existing)).length} Gebäude importieren
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="py-8 space-y-6">
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
              <p className="mt-4 text-lg font-medium">Import läuft...</p>
              <p className="text-sm text-muted-foreground">{importProgress.phase || 'Initialisiere...'}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fortschritt</span>
                <span className="font-medium">
                  {importProgress.total > 0 
                    ? `${importProgress.current.toLocaleString()} / ${importProgress.total.toLocaleString()} (${Math.round((importProgress.current / importProgress.total) * 100)}%)`
                    : 'Berechne...'}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300 ease-out"
                  style={{ width: importProgress.total > 0 ? `${(importProgress.current / importProgress.total) * 100}%` : '0%' }}
                />
              </div>
              {importProgress.total > 0 && importProgress.current > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Geschätzte Restzeit: ~{Math.max(1, Math.ceil(((importProgress.total - importProgress.current) / Math.max(1, importProgress.current)) * 0.3))} Minuten
                </p>
              )}
            </div>

            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleCancelImport}>
                <X className="w-4 h-4 mr-2" />
                Import abbrechen
              </Button>
            </div>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (importResult || importAborted) && (
          <div className="space-y-4">
            <div className="py-8 text-center">
              {importAborted ? (
                <>
                  <AlertTriangle className="w-16 h-16 mx-auto text-warning" />
                  <p className="mt-4 text-xl font-medium">Import abgebrochen</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Der Import wurde vorzeitig beendet. Bereits importierte Daten wurden gespeichert.
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle className="w-16 h-16 mx-auto text-success" />
                  <p className="mt-4 text-xl font-medium">Import abgeschlossen</p>
                </>
              )}
            </div>

            {importResult && (
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
            )}

            {importResult.batchId && (
              <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">Rückgängig machen:</span>{' '}
                  <span className="text-muted-foreground">
                    Dieser Import kann im Gebäude-Manager über "Letzten Import rückgängig machen" widerrufen werden.
                  </span>
                </div>
              </div>
            )}

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
