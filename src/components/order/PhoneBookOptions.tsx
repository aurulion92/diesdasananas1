import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Book, Phone } from 'lucide-react';

export interface PhoneBookData {
  evn: boolean;
  entryType: 'none' | 'standard' | 'custom';
  printed: boolean;
  phoneInfo: boolean;
  internet: boolean;
  customName: string;
  customAddress: string;
  showAddress: boolean;
}

interface PhoneBookOptionsProps {
  data: PhoneBookData;
  onChange: (data: PhoneBookData) => void;
}

export function PhoneBookOptions({ data, onChange }: PhoneBookOptionsProps) {
  return (
    <div className="space-y-6 bg-muted/30 rounded-lg p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        <Book className="w-4 h-4" />
        Telefondienste
      </div>

      {/* EVN */}
      <div className="flex items-center space-x-3">
        <Checkbox
          id="phone-evn"
          checked={data.evn}
          onCheckedChange={(checked) => onChange({ ...data, evn: checked === true })}
        />
        <Label htmlFor="phone-evn" className="cursor-pointer">
          Einzelverbindungsnachweis (EVN)
        </Label>
      </div>

      {/* Phone Book Entry */}
      <div className="space-y-3">
        <Label className="text-sm">Telefonbucheintrag</Label>
        <RadioGroup
          value={data.entryType}
          onValueChange={(value) => onChange({ 
            ...data, 
            entryType: value as 'none' | 'standard' | 'custom',
            // Reset custom fields when switching away from custom
            customName: value !== 'custom' ? '' : data.customName,
            customAddress: value !== 'custom' ? '' : data.customAddress,
          })}
          className="space-y-2"
        >
          <div className="flex items-center space-x-3 p-2 rounded border border-border">
            <RadioGroupItem value="none" id="entry-none" />
            <Label htmlFor="entry-none" className="cursor-pointer">Kein Eintrag</Label>
          </div>
          <div className="flex items-center space-x-3 p-2 rounded border border-border">
            <RadioGroupItem value="standard" id="entry-standard" />
            <Label htmlFor="entry-standard" className="cursor-pointer">
              Standardeintrag (Name und Adresse aus Kundendaten)
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-2 rounded border border-border">
            <RadioGroupItem value="custom" id="entry-custom" />
            <Label htmlFor="entry-custom" className="cursor-pointer">
              Abweichender Eintrag
            </Label>
          </div>
        </RadioGroup>

        {/* Custom Entry Fields */}
        {data.entryType === 'custom' && (
          <div className="ml-6 space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="custom-name">Name für Eintrag *</Label>
              <Input
                id="custom-name"
                value={data.customName}
                onChange={(e) => onChange({ ...data, customName: e.target.value })}
                placeholder="Name für den Telefonbucheintrag"
              />
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="show-address"
                checked={data.showAddress}
                onCheckedChange={(checked) => onChange({ ...data, showAddress: checked === true })}
              />
              <Label htmlFor="show-address" className="cursor-pointer">
                Adresse im Eintrag anzeigen
              </Label>
            </div>
            {data.showAddress && (
              <div className="space-y-2">
                <Label htmlFor="custom-address">Adresszeile für Eintrag</Label>
                <Input
                  id="custom-address"
                  value={data.customAddress}
                  onChange={(e) => onChange({ ...data, customAddress: e.target.value })}
                  placeholder="Abweichende Adresse (optional)"
                />
                <p className="text-xs text-muted-foreground">
                  Wenn leer, wird die Vertragsadresse verwendet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Additional Options - only show if entry type is not 'none' */}
      {data.entryType !== 'none' && (
        <div className="space-y-3 pt-2 border-t border-border">
          <Label className="text-sm text-muted-foreground">Zusätzliche Optionen</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="phone-printed"
                checked={data.printed}
                onCheckedChange={(checked) => onChange({ ...data, printed: checked === true })}
              />
              <Label htmlFor="phone-printed" className="cursor-pointer text-sm">
                Gedrucktes Telefonbuch
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="phone-info"
                checked={data.phoneInfo}
                onCheckedChange={(checked) => onChange({ ...data, phoneInfo: checked === true })}
              />
              <Label htmlFor="phone-info" className="cursor-pointer text-sm">
                Telefonauskunft
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="phone-internet"
                checked={data.internet}
                onCheckedChange={(checked) => onChange({ ...data, internet: checked === true })}
              />
              <Label htmlFor="phone-internet" className="cursor-pointer text-sm">
                Internet-Auskunft
              </Label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const initialPhoneBookData: PhoneBookData = {
  evn: false,
  entryType: 'none',
  printed: false,
  phoneInfo: false,
  internet: false,
  customName: '',
  customAddress: '',
  showAddress: true,
};
