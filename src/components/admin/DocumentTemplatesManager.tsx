import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
  Code,
  Upload,
  FileUp,
  X,
  Loader2,
  Image as ImageIcon,
  Send,
  Mail,
  Paperclip
} from 'lucide-react';

import { TEMPLATE_USE_CASES } from '@/services/templateService';
import { TemplateVariableMapper, VariableMapping } from './TemplateVariableMapper';

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
  use_cases: string[];
  content: string;
  pdf_url: string | null;
  image_url: string | null;
  placeholders: Placeholder[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // New fields
  variable_mappings: VariableMapping[];
  trigger_event: string | null;
  auto_send: boolean;
  send_as_attachment: boolean;
  recipient_type: string;
  email_subject_template: string | null;
}

const TEMPLATE_TYPES = [
  { value: 'vzf', label: 'VZF (Vertragszusammenfassung)' },
  { value: 'confirmation', label: 'Bestellbestätigung' },
  { value: 'invoice', label: 'Rechnung' },
  { value: 'welcome', label: 'Willkommens-E-Mail' },
  { value: 'general', label: 'Allgemein' },
  { value: 'pdf', label: 'PDF-Vorlage' },
];

const TRIGGER_EVENTS = [
  { value: 'manual', label: 'Manuell', description: 'Nur bei manueller Auslösung' },
  { value: 'order_created', label: 'Bestellung erstellt', description: 'Direkt nach Bestelleingang' },
  { value: 'order_confirmed', label: 'Bestellung bestätigt', description: 'Nach Admin-Bestätigung' },
  { value: 'order_completed', label: 'Bestellung abgeschlossen', description: 'Nach Abschluss der Bestellung' },
  { value: 'order_cancelled', label: 'Bestellung storniert', description: 'Bei Stornierung' },
];

const RECIPIENT_TYPES = [
  { value: 'customer', label: 'Kunde' },
  { value: 'admin', label: 'Admin' },
  { value: 'both', label: 'Beide' },
];

const DEFAULT_PLACEHOLDERS: Placeholder[] = [
  { key: '{{kunde_name}}', description: 'Vollständiger Kundenname', example: 'Max Mustermann' },
  { key: '{{kunde_vorname}}', description: 'Vorname', example: 'Max' },
  { key: '{{kunde_nachname}}', description: 'Nachname', example: 'Mustermann' },
  { key: '{{kunde_anrede}}', description: 'Anrede (Herr/Frau)', example: 'Herr' },
  { key: '{{kunde_email}}', description: 'E-Mail-Adresse', example: 'max@example.com' },
  { key: '{{kunde_telefon}}', description: 'Telefonnummer', example: '0123456789' },
  { key: '{{adresse_strasse}}', description: 'Straße', example: 'Musterstraße' },
  { key: '{{adresse_hausnummer}}', description: 'Hausnummer', example: '42' },
  { key: '{{adresse_plz}}', description: 'Postleitzahl', example: '85053' },
  { key: '{{adresse_stadt}}', description: 'Stadt', example: 'Ingolstadt' },
  { key: '{{produkt_name}}', description: 'Produktname', example: 'einfach 300' },
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
  { key: '{{telefon_name}}', description: 'Telefon-Option', example: 'Telefon Flat' },
  { key: '{{telefon_preis}}', description: 'Telefon-Monatspreis', example: '5,00 €' },
  { key: '{{datum_heute}}', description: 'Aktuelles Datum', example: '12.06.2025' },
  { key: '{{bestellnummer}}', description: 'Bestellnummer', example: 'COM-ABC123' },
  { key: '{{vzf_timestamp}}', description: 'VZF-Erstellungszeitpunkt', example: '12.06.2025 14:30' },
  { key: '{{iban}}', description: 'IBAN', example: 'DE89 3704 0044 0532 0130 00' },
  { key: '{{kontoinhaber}}', description: 'Kontoinhaber', example: 'Max Mustermann' },
  { key: '{{wunschtermin}}', description: 'Gewünschter Anschlusstermin', example: '01.07.2025' },
  { key: '{{logo_url}}', description: 'Logo-URL (aus E-Mail Logo Template)', example: 'https://...' },
];

export function DocumentTemplatesManager() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_type: 'general',
    use_cases: [] as string[],
    content: '',
    pdf_url: '',
    image_url: '',
    is_active: true,
    // New fields
    variable_mappings: [] as VariableMapping[],
    trigger_event: 'manual',
    auto_send: false,
    send_as_attachment: false,
    recipient_type: 'customer',
    email_subject_template: '',
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
      const parsed = (data || []).map((t: any) => ({
        ...t,
        placeholders: Array.isArray(t.placeholders) ? t.placeholders as Placeholder[] : [],
        use_cases: Array.isArray(t.use_cases) ? t.use_cases : (t.use_case ? [t.use_case] : []),
        pdf_url: t.pdf_url || null,
        image_url: t.image_url || null,
        variable_mappings: Array.isArray(t.variable_mappings) ? t.variable_mappings : [],
        trigger_event: t.trigger_event || 'manual',
        auto_send: t.auto_send || false,
        send_as_attachment: t.send_as_attachment || false,
        recipient_type: t.recipient_type || 'customer',
        email_subject_template: t.email_subject_template || null,
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
      use_cases: [],
      content: getDefaultTemplate(),
      pdf_url: '',
      image_url: '',
      is_active: true,
      variable_mappings: [],
      trigger_event: 'manual',
      auto_send: false,
      send_as_attachment: false,
      recipient_type: 'customer',
      email_subject_template: '',
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      template_type: template.template_type,
      use_cases: template.use_cases || [],
      content: template.content,
      pdf_url: template.pdf_url || '',
      image_url: template.image_url || '',
      is_active: template.is_active,
      variable_mappings: template.variable_mappings || [],
      trigger_event: template.trigger_event || 'manual',
      auto_send: template.auto_send || false,
      send_as_attachment: template.send_as_attachment || false,
      recipient_type: template.recipient_type || 'customer',
      email_subject_template: template.email_subject_template || '',
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

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      toast({ title: 'Nur PDF-Dateien erlaubt', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileName = `templates/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { data, error } = await supabase.storage
        .from('admin-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('admin-uploads')
        .getPublicUrl(fileName);

      setFormData(prev => ({ 
        ...prev, 
        pdf_url: urlData.publicUrl,
        template_type: 'pdf'
      }));
      
      toast({ title: 'PDF hochgeladen', description: file.name });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload fehlgeschlagen', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePdf = () => {
    setFormData(prev => ({ ...prev, pdf_url: '' }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Nur Bilddateien erlaubt (PNG, JPG, etc.)', variant: 'destructive' });
      return;
    }

    setUploadingImage(true);
    try {
      const fileName = `images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { data, error } = await supabase.storage
        .from('admin-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('admin-uploads')
        .getPublicUrl(fileName);

      setFormData(prev => ({ 
        ...prev, 
        image_url: urlData.publicUrl,
      }));
      
      toast({ title: 'Bild hochgeladen', description: file.name });
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast({ title: 'Upload fehlgeschlagen', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const handleSave = async () => {
    if (!formData.name || (!formData.content && !formData.pdf_url)) {
      toast({ title: 'Bitte Name und Inhalt/PDF ausfüllen', variant: 'destructive' });
      return;
    }

    const templateData: Record<string, any> = {
      name: formData.name,
      description: formData.description || null,
      template_type: formData.template_type,
      use_case: formData.use_cases[0] || null, // Keep legacy field
      use_cases: formData.use_cases,
      content: formData.content,
      pdf_url: formData.pdf_url || null,
      image_url: formData.image_url || null,
      placeholders: JSON.parse(JSON.stringify(DEFAULT_PLACEHOLDERS)),
      is_active: formData.is_active,
      // New fields
      variable_mappings: formData.variable_mappings,
      trigger_event: formData.trigger_event || null,
      auto_send: formData.auto_send,
      send_as_attachment: formData.send_as_attachment,
      recipient_type: formData.recipient_type,
      email_subject_template: formData.email_subject_template || null,
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
    if (template.pdf_url) {
      window.open(template.pdf_url, '_blank');
      return;
    }
    
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

  const toggleUseCase = (value: string) => {
    setFormData(prev => ({
      ...prev,
      use_cases: prev.use_cases.includes(value)
        ? prev.use_cases.filter(uc => uc !== value)
        : [...prev.use_cases, value]
    }));
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      vzf: 'bg-blue-100 text-blue-800',
      confirmation: 'bg-green-100 text-green-800',
      invoice: 'bg-yellow-100 text-yellow-800',
      welcome: 'bg-purple-100 text-purple-800',
      pdf: 'bg-red-100 text-red-800',
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

      {/* Template Usage Info */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-900 dark:text-blue-100">Template-Verwendung</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white dark:bg-background/50 rounded p-3">
            <div className="font-medium text-primary mb-1">VZF bei Bestellung (order_vzf)</div>
            <ul className="text-muted-foreground text-xs space-y-1">
              <li>• VZF-Download im Bestellworkflow</li>
              <li>• VZF regenerieren im Admin-Panel</li>
              <li>• <span className="text-orange-600 font-medium">PDF-Anhang in Bestätigungs-E-Mail</span></li>
            </ul>
          </div>
          <div className="bg-white dark:bg-background/50 rounded p-3">
            <div className="font-medium text-primary mb-1">Bestellbestätigung E-Mail (order_confirmation_email)</div>
            <ul className="text-muted-foreground text-xs space-y-1">
              <li>• E-Mail-Text nach Bestellabschluss</li>
              <li>• <span className="text-orange-600 font-medium">VZF wird als PDF beigefügt</span></li>
            </ul>
          </div>
        </div>
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
              <TableHead>Anwendungsfälle</TableHead>
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
                      {template.image_url ? (
                        <img src={template.image_url} alt="" className="w-6 h-6 object-contain rounded" />
                      ) : template.pdf_url ? (
                        <FileUp className="w-4 h-4 text-red-500" />
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      )}
                      {template.name}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(template.template_type)}</TableCell>
                  <TableCell>
                    {template.use_cases && template.use_cases.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {template.use_cases.map(uc => (
                          <Badge key={uc} variant="secondary" className="font-mono text-xs">
                            {TEMPLATE_USE_CASES.find(u => u.value === uc)?.label || uc}
                          </Badge>
                        ))}
                      </div>
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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

              <div>
                <Label>Beschreibung</Label>
                <Input
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Kurze Beschreibung der Vorlage"
                />
              </div>

              {/* Multiple Use Cases Selection */}
              <div>
                <Label className="mb-2 block">Anwendungsfälle (mehrere möglich)</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto bg-muted/20">
                  {TEMPLATE_USE_CASES.map(uc => (
                    <div key={uc.value} className="flex items-start gap-2">
                      <Checkbox
                        id={`uc-${uc.value}`}
                        checked={formData.use_cases.includes(uc.value)}
                        onCheckedChange={() => toggleUseCase(uc.value)}
                      />
                      <div className="flex-1">
                        <label htmlFor={`uc-${uc.value}`} className="text-sm font-medium cursor-pointer">
                          {uc.label}
                        </label>
                        <p className="text-xs text-muted-foreground">{uc.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Definiert wann diese Vorlage automatisch verwendet wird
                </p>
              </div>

              {/* Trigger & Send Settings */}
              <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <Send className="w-4 h-4" />
                  <Label className="font-medium">Versand-Einstellungen</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Auslöser</Label>
                    <Select
                      value={formData.trigger_event}
                      onValueChange={v => setFormData(prev => ({ ...prev, trigger_event: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGER_EVENTS.map(t => (
                          <SelectItem key={t.value} value={t.value}>
                            <div>
                              <span>{t.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">({t.description})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm">Empfänger</Label>
                    <Select
                      value={formData.recipient_type}
                      onValueChange={v => setFormData(prev => ({ ...prev, recipient_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECIPIENT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">E-Mail Betreff</Label>
                  <Input
                    value={formData.email_subject_template}
                    onChange={e => setFormData(prev => ({ ...prev, email_subject_template: e.target.value }))}
                    placeholder="z.B. Ihre Bestellung {{bestellnummer}} bei {{company_name}}"
                  />
                </div>

                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.auto_send}
                      onCheckedChange={v => setFormData(prev => ({ ...prev, auto_send: v }))}
                    />
                    <div>
                      <Label className="text-sm flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        Automatisch senden
                      </Label>
                      <p className="text-xs text-muted-foreground">Bei Auslöser automatisch versenden</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.send_as_attachment}
                      onCheckedChange={v => setFormData(prev => ({ ...prev, send_as_attachment: v }))}
                    />
                    <div>
                      <Label className="text-sm flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        Als Anhang senden
                      </Label>
                      <p className="text-xs text-muted-foreground">PDF als E-Mail-Anhang beifügen</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variable Mapping */}
              <TemplateVariableMapper
                mappings={formData.variable_mappings}
                onChange={(mappings) => setFormData(prev => ({ ...prev, variable_mappings: mappings }))}
              />

              {/* File Upload Sections - PDF and Image */}
              <div className="grid grid-cols-2 gap-4">
                {/* PDF Upload Section */}
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <Label className="text-sm">PDF-Vorlage</Label>
                    </div>
                    {formData.pdf_url && (
                      <Button variant="ghost" size="sm" onClick={removePdf}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  {formData.pdf_url ? (
                    <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                      <FileUp className="w-8 h-8 text-red-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">PDF hochgeladen</p>
                        <a 
                          href={formData.pdf_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline truncate block"
                        >
                          Ansehen
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handlePdfUpload}
                        className="hidden"
                        id="pdf-upload"
                      />
                      <label 
                        htmlFor="pdf-upload"
                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Hochladen...
                          </>
                        ) : (
                          <>
                            <FileUp className="w-4 h-4" />
                            PDF auswählen
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                {/* Image Upload Section */}
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      <Label className="text-sm">Bild (z.B. Logo)</Label>
                    </div>
                    {formData.image_url && (
                      <Button variant="ghost" size="sm" onClick={removeImage}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  {formData.image_url ? (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <img 
                        src={formData.image_url} 
                        alt="Hochgeladenes Bild" 
                        className="w-12 h-12 object-contain rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Bild hochgeladen</p>
                        <a 
                          href={formData.image_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline truncate block"
                        >
                          Ansehen
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label 
                        htmlFor="image-upload"
                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Hochladen...
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4" />
                            Bild auswählen
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>HTML-Inhalt {formData.pdf_url && '(optional bei PDF)'}</Label>
                <Textarea
                  value={formData.content}
                  onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="font-mono text-sm min-h-[300px]"
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
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
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
