import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Trash2, ChevronDown, ChevronRight, Variable, Calculator, Database, Calendar, FileText } from 'lucide-react';

export interface VariableMapping {
  id: string;
  placeholder_key: string;
  source_type: 'static' | 'order' | 'product' | 'customer' | 'calculated' | 'date' | 'system';
  source_field: string;
  formula?: string;
  default_value?: string;
  description?: string;
}

interface TemplateVariableMapperProps {
  mappings: VariableMapping[];
  onChange: (mappings: VariableMapping[]) => void;
}

// Available source fields grouped by type
const SOURCE_FIELDS = {
  order: [
    { value: 'id', label: 'Bestell-ID' },
    { value: 'customer_name', label: 'Kundenname (vollständig)' },
    { value: 'customer_first_name', label: 'Vorname' },
    { value: 'customer_last_name', label: 'Nachname' },
    { value: 'customer_email', label: 'E-Mail' },
    { value: 'customer_phone', label: 'Telefon' },
    { value: 'street', label: 'Straße' },
    { value: 'house_number', label: 'Hausnummer' },
    { value: 'postal_code', label: 'PLZ' },
    { value: 'city', label: 'Stadt' },
    { value: 'floor', label: 'Etage' },
    { value: 'apartment', label: 'Wohnung' },
    { value: 'bank_iban', label: 'IBAN' },
    { value: 'bank_account_holder', label: 'Kontoinhaber' },
    { value: 'monthly_total', label: 'Monatlich gesamt' },
    { value: 'one_time_total', label: 'Einmalig gesamt' },
    { value: 'setup_fee', label: 'Bereitstellungspreis' },
    { value: 'contract_months', label: 'Vertragslaufzeit' },
    { value: 'desired_start_date', label: 'Wunschtermin' },
    { value: 'phone_porting', label: 'Rufnummernmitnahme (ja/nein)' },
    { value: 'phone_porting_numbers', label: 'Portierende Rufnummern' },
    { value: 'promo_code', label: 'Aktionscode' },
    { value: 'referral_customer_number', label: 'Empfehlungs-Kundennummer' },
    { value: 'connection_type', label: 'Anschlussart' },
    { value: 'created_at', label: 'Bestelldatum' },
  ],
  product: [
    { value: 'product_name', label: 'Produktname' },
    { value: 'product_monthly_price', label: 'Monatspreis' },
    { value: 'download_speed', label: 'Download-Geschwindigkeit' },
    { value: 'upload_speed', label: 'Upload-Geschwindigkeit' },
    { value: 'includes_phone', label: 'Inkl. Telefon (ja/nein)' },
    { value: 'includes_fiber_tv', label: 'Inkl. TV (ja/nein)' },
  ],
  customer: [
    { value: 'customer_number', label: 'Kundennummer' },
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'E-Mail' },
  ],
  date: [
    { value: 'today', label: 'Heutiges Datum' },
    { value: 'today_long', label: 'Datum (ausgeschrieben)' },
    { value: 'now', label: 'Datum + Uhrzeit' },
    { value: 'year', label: 'Aktuelles Jahr' },
    { value: 'month', label: 'Aktueller Monat' },
  ],
  system: [
    { value: 'company_name', label: 'Firmenname' },
    { value: 'company_email', label: 'Firmen-E-Mail' },
    { value: 'company_phone', label: 'Firmen-Telefon' },
    { value: 'logo_url', label: 'Logo-URL' },
  ],
};

const SOURCE_TYPE_INFO = [
  { value: 'static', label: 'Statisch', icon: FileText, description: 'Fester Wert' },
  { value: 'order', label: 'Bestellung', icon: Database, description: 'Aus Bestelldaten' },
  { value: 'product', label: 'Produkt', icon: Database, description: 'Aus Produktdaten' },
  { value: 'customer', label: 'Kunde', icon: Database, description: 'Aus Kundendaten' },
  { value: 'calculated', label: 'Berechnet', icon: Calculator, description: 'Formel (z.B. +, -)' },
  { value: 'date', label: 'Datum', icon: Calendar, description: 'Datumswerte' },
  { value: 'system', label: 'System', icon: Variable, description: 'Systemwerte' },
];

export function TemplateVariableMapper({ mappings, onChange }: TemplateVariableMapperProps) {
  const [isOpen, setIsOpen] = useState(true);

  const addMapping = () => {
    const newMapping: VariableMapping = {
      id: crypto.randomUUID(),
      placeholder_key: '',
      source_type: 'order',
      source_field: '',
      default_value: '',
    };
    onChange([...mappings, newMapping]);
  };

  const updateMapping = (id: string, field: keyof VariableMapping, value: string) => {
    onChange(mappings.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeMapping = (id: string) => {
    onChange(mappings.filter(m => m.id !== id));
  };

  const getSourceFields = (type: string) => {
    return SOURCE_FIELDS[type as keyof typeof SOURCE_FIELDS] || [];
  };

  const getTypeIcon = (type: string) => {
    const info = SOURCE_TYPE_INFO.find(t => t.value === type);
    return info?.icon || Variable;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50">
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Variable className="w-4 h-4" />
          <span className="font-medium">Variablen-Mapping</span>
          {mappings.length > 0 && (
            <Badge variant="secondary">{mappings.length}</Badge>
          )}
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-4 pb-4">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Definieren Sie, welche Platzhalter im PDF durch welche Daten ersetzt werden.
          </p>

          {/* Source Type Legend */}
          <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
            {SOURCE_TYPE_INFO.map(type => {
              const Icon = type.icon;
              return (
                <Badge key={type.value} variant="outline" className="gap-1">
                  <Icon className="w-3 h-3" />
                  {type.label}
                </Badge>
              );
            })}
          </div>

          {/* Mappings List */}
          {mappings.length > 0 && (
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-[1fr_120px_1fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
                <span>Platzhalter im PDF</span>
                <span>Quelle</span>
                <span>Feld / Formel</span>
                <span>Standardwert</span>
                <span></span>
              </div>

              {mappings.map((mapping) => {
                const TypeIcon = getTypeIcon(mapping.source_type);
                const fields = getSourceFields(mapping.source_type);
                
                return (
                  <div key={mapping.id} className="grid grid-cols-[1fr_120px_1fr_1fr_40px] gap-2 items-center">
                    <Input
                      placeholder="z.B. {{kunde_name}}"
                      value={mapping.placeholder_key}
                      onChange={(e) => updateMapping(mapping.id, 'placeholder_key', e.target.value)}
                      className="h-9 text-sm font-mono"
                    />
                    
                    <Select
                      value={mapping.source_type}
                      onValueChange={(value) => {
                        updateMapping(mapping.id, 'source_type', value);
                        updateMapping(mapping.id, 'source_field', '');
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_TYPE_INFO.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <span className="flex items-center gap-2">
                              <type.icon className="w-3 h-3" />
                              {type.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {mapping.source_type === 'static' ? (
                      <Input
                        placeholder="Fester Wert"
                        value={mapping.source_field}
                        onChange={(e) => updateMapping(mapping.id, 'source_field', e.target.value)}
                        className="h-9 text-sm"
                      />
                    ) : mapping.source_type === 'calculated' ? (
                      <Input
                        placeholder="z.B. monthly_total + setup_fee"
                        value={mapping.formula || ''}
                        onChange={(e) => updateMapping(mapping.id, 'formula', e.target.value)}
                        className="h-9 text-sm font-mono"
                      />
                    ) : fields.length > 0 ? (
                      <Select
                        value={mapping.source_field}
                        onValueChange={(value) => updateMapping(mapping.id, 'source_field', value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Feld wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          {fields.map(field => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Feldname"
                        value={mapping.source_field}
                        onChange={(e) => updateMapping(mapping.id, 'source_field', e.target.value)}
                        className="h-9 text-sm"
                      />
                    )}

                    <Input
                      placeholder="Fallback"
                      value={mapping.default_value || ''}
                      onChange={(e) => updateMapping(mapping.id, 'default_value', e.target.value)}
                      className="h-9 text-sm"
                    />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMapping(mapping.id)}
                      className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {mappings.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Variablen definiert. Klicken Sie auf "Variable hinzufügen".
            </p>
          )}

          <Button variant="outline" size="sm" onClick={addMapping} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Variable hinzufügen
          </Button>

          {/* Common Variables Quick Add */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium">Schnell hinzufügen:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { key: '{{datum}}', type: 'date', field: 'today' },
                { key: '{{kunde_name}}', type: 'order', field: 'customer_name' },
                { key: '{{iban}}', type: 'order', field: 'bank_iban' },
                { key: '{{produkt}}', type: 'product', field: 'product_name' },
                { key: '{{monatspreis}}', type: 'product', field: 'product_monthly_price' },
                { key: '{{gesamt_monatlich}}', type: 'order', field: 'monthly_total' },
              ].map(preset => (
                <Badge
                  key={preset.key}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => {
                    const exists = mappings.some(m => m.placeholder_key === preset.key);
                    if (!exists) {
                      onChange([...mappings, {
                        id: crypto.randomUUID(),
                        placeholder_key: preset.key,
                        source_type: preset.type as any,
                        source_field: preset.field,
                        default_value: '',
                      }]);
                    }
                  }}
                >
                  {preset.key}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
