import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Eye,
  Copy,
  Code
} from 'lucide-react';

import { TEMPLATE_USE_CASES } from '@/services/templateService';

interface Placeholder {
  key: string;
  description: string;
  example: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  template_type: string;
  use_case: string | null;
  content: string;
  placeholders: Placeholder[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_TYPES = [
  { value: 'vzf', label: 'VZF (Vertragszusammenfassung)' },
  { value: 'confirmation', label: 'Bestellbestätigung' },
  { value: 'invoice', label: 'Rechnung' },
  { value: 'welcome', label: 'Willkommens-E-Mail' },
  { value: 'general', label: 'Allgemein' },
];

const DEFAULT_PLACEHOLDERS: Placeholder[] = [
  { key: '{{kunde_name}}', description: 'Vollständiger Kundenname', example: 'Max Mustermann' },
  { key: '{{kunde_vorname}}', description: 'Vorname', example: 'Max' },
  { key: '{{kunde_nachname}}', description: 'Nachname', example: 'Mustermann' },
  { key: '{{kunde_email}}', description: 'E-Mail-Adresse', example: 'max@example.com' },
  { key: '{{kunde_telefon}}', description: 'Telefonnummer', example: '0123456789' },
  { key: '{{adresse_strasse}}', description: 'Straße', example: 'Musterstraße' },
  { key: '{{adresse_hausnummer}}', description: 'Hausnummer', example: '42' },
  { key: '{{adresse_stadt}}', description: 'Stadt', example: 'Ingolstadt' },
  { key: '{{tarif_name}}', description: 'Tarifname', example: 'einfach 300' },
  { key: '{{tarif_preis}}', description: 'Monatlicher Tarifpreis', example: '39,90 €' },
  { key: '{{tarif_download}}', description: 'Download-Geschwindigkeit', example: '300 Mbit/s' },
  { key: '{{tarif_upload}}', description: 'Upload-Geschwindigkeit', example: '100 Mbit/s' },
  { key: '{{gesamt_monatlich}}', description: 'Gesamtkosten monatlich', example: '49,90 €' },
  { key: '{{gesamt_einmalig}}', description: 'Einmalige Kosten', example: '99,00 €' },
  { key: '{{bereitstellung}}', description: 'Bereitstellungspreis', example: '99,00 €' },
  { key: '{{vertragslaufzeit}}', description: 'Vertragslaufzeit', example: '24 Monate' },
  { key: '{{router_name}}', description: 'Router-Modell', example: 'FRITZ!Box 5690' },
  { key: '{{router_preis}}', description: 'Router-Monatspreis', example: '4,00 €' },
  { key: '{{tv_name}}', description: 'TV-Paket', example: 'COM-IN TV' },
  { key: '{{tv_preis}}', description: 'TV-Monatspreis', example: '10,00 €' },
  { key: '{{datum_heute}}', description: 'Aktuelles Datum', example: '12.06.2025' },
  { key: '{{bestellnummer}}', description: 'Bestellnummer', example: 'COM-ABC123' },
  { key: '{{vzf_timestamp}}', description: 'VZF-Erstellungszeitpunkt', example: '12.06.2025 14:30' },
];

export function DocumentTemplatesManager() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_type: 'general',
    use_case: '',
    content: '',
    is_active: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .order('template_type', { ascending: true });

    if (error) {
      toast({ title: 'Fehler beim Laden', description: error.message, variant: 'destructive' });
    } else {
      // Parse placeholders from JSON and include use_case (cast to any to handle new column)
      const parsed = (data || []).map((t: any) => ({
        ...t,
        placeholders: Array.isArray(t.placeholders) ? t.placeholders as Placeholder[] : [],
        use_case: t.use_case || null,
      })) as DocumentTemplate[];
      setTemplates(parsed);
    }
    setLoading(false);
  };

  const openNewDialog = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      template_type: 'general',
      use_case: '',
      content: getDefaultTemplate(),
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      template_type: template.template_type,
      use_case: template.use_case || '',
      content: template.content,
      is_active: template.is_active,
    });
    setIsDialogOpen(true);
  };

  const getDefaultTemplate = () => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    h1 { color: #003366; }
    .info { margin: 20px 0; }
    .label { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Dokumentvorlage</h1>
  
  <div class="info">
    <span class="label">Kunde:</span> {{kunde_name}}
  </div>
  
  <div class="info">
    <span class="label">Adresse:</span> {{adresse_strasse}} {{adresse_hausnummer}}, {{adresse_stadt}}
  </div>
  
  <div class="info">
    <span class="label">Tarif:</span> {{tarif_name}} - {{tarif_preis}}/Monat
  </div>
  
  <p>Vielen Dank für Ihre Bestellung!</p>
</body>
</html>`;
  };

  const handleSave = async () => {
    if (!formData.name || !formData.content) {
      toast({ title: 'Bitte Name und Inhalt ausfüllen', variant: 'destructive' });
      return;
    }

    const templateData: Record<string, any> = {
      name: formData.name,
      description: formData.description || null,
      template_type: formData.template_type,
      use_case: formData.use_case || null,
      content: formData.content,
      placeholders: JSON.parse(JSON.stringify(DEFAULT_PLACEHOLDERS)),
      is_active: formData.is_active,
    };

    if (editingTemplate) {
      const { error } = await supabase
        .from('document_templates')
        .update(templateData)
        .eq('id', editingTemplate.id);

      if (error) {
        toast({ title: 'Fehler beim Speichern', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Vorlage aktualisiert' });
        setIsDialogOpen(false);
        fetchTemplates();
      }
    } else {
      const { error } = await supabase
        .from('document_templates')
        .insert([templateData] as any);

      if (error) {
        toast({ title: 'Fehler beim Erstellen', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Vorlage erstellt' });
        setIsDialogOpen(false);
        fetchTemplates();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Vorlage wirklich löschen?')) return;

    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Fehler beim Löschen', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Vorlage gelöscht' });
      fetchTemplates();
    }
  };

  const toggleActive = async (template: DocumentTemplate) => {
    const { error } = await supabase
      .from('document_templates')
      .update({ is_active: !template.is_active })
      .eq('id', template.id);

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      fetchTemplates();
    }
  };

  const showPreview = (template: DocumentTemplate) => {
    // Replace placeholders with example values
    let html = template.content;
    DEFAULT_PLACEHOLDERS.forEach(p => {
      html = html.replace(new RegExp(p.key.replace(/[{}]/g, '\\$&'), 'g'), p.example);
    });
    setPreviewHtml(html);
    setIsPreviewOpen(true);
  };

  const insertPlaceholder = (key: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + key
    }));
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      vzf: 'bg-blue-100 text-blue-800',
      confirmation: 'bg-green-100 text-green-800',
      invoice: 'bg-yellow-100 text-yellow-800',
      welcome: 'bg-purple-100 text-purple-800',
      general: 'bg-gray-100 text-gray-800',
    };
    const label = TEMPLATE_TYPES.find(t => t.value === type)?.label || type;
    return <Badge className={colors[type] || colors.general}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Dokumentvorlagen</h2>
          <p className="text-muted-foreground">Vorlagen für VZF, E-Mails und andere Dokumente</p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Neue Vorlage
        </Button>
      </div>

      {/* Available Placeholders Info */}
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Code className="w-4 h-4" />
          <span className="font-medium">Verfügbare Platzhalter</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_PLACEHOLDERS.slice(0, 8).map(p => (
            <Badge key={p.key} variant="outline" className="font-mono text-xs">
              {p.key}
            </Badge>
          ))}
          <Badge variant="outline" className="text-xs">+{DEFAULT_PLACEHOLDERS.length - 8} weitere</Badge>
        </div>
      </div>

      {/* Templates Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Anwendungsfall</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Laden...</TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Keine Vorlagen vorhanden
                </TableCell>
              </TableRow>
            ) : (
              templates.map(template => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      {template.name}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(template.template_type)}</TableCell>
                  <TableCell>
                    {template.use_case ? (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {TEMPLATE_USE_CASES.find(uc => uc.value === template.use_case)?.label || template.use_case}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">–</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {template.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={() => toggleActive(template)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => showPreview(template)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditDialog(template)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(template.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4">
            {/* Left: Form */}
            <div className="col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="z.B. VZF Standard"
                  />
                </div>
                <div>
                  <Label>Typ</Label>
                  <Select
                    value={formData.template_type}
                    onValueChange={v => setFormData(prev => ({ ...prev, template_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Beschreibung</Label>
                  <Input
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Kurze Beschreibung der Vorlage"
                  />
                </div>
                <div>
                  <Label>Anwendungsfall</Label>
                  <Select
                    value={formData.use_case}
                    onValueChange={v => setFormData(prev => ({ ...prev, use_case: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Keiner (manuell)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Keiner (manuell)</SelectItem>
                      {TEMPLATE_USE_CASES.map(uc => (
                        <SelectItem key={uc.value} value={uc.value}>
                          <div>
                            <div>{uc.label}</div>
                            <div className="text-xs text-muted-foreground">{uc.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Definiert wann diese Vorlage automatisch verwendet wird
                  </p>
                </div>
              </div>


              <div>
                <Label>HTML-Inhalt</Label>
                <Textarea
                  value={formData.content}
                  onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="font-mono text-sm min-h-[400px]"
                  placeholder="HTML-Vorlage mit Platzhaltern..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={v => setFormData(prev => ({ ...prev, is_active: v }))}
                />
                <Label>Aktiv</Label>
              </div>
            </div>

            {/* Right: Placeholders */}
            <div className="border-l pl-4">
              <Label className="mb-2 block">Platzhalter einfügen</Label>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {DEFAULT_PLACEHOLDERS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => insertPlaceholder(p.key)}
                    className="w-full text-left p-2 rounded hover:bg-muted text-sm"
                  >
                    <div className="font-mono text-xs text-primary">{p.key}</div>
                    <div className="text-muted-foreground text-xs">{p.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Vorschau (mit Beispieldaten)</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg bg-white p-4 max-h-[70vh] overflow-auto">
            <iframe
              srcDoc={previewHtml}
              className="w-full min-h-[500px] border-0"
              title="Template Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}