import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Book } from 'lucide-react';

interface PhoneSelection {
  enabled: boolean;
  lines: number;
  portingRequired: boolean;
  portingData: {
    numberOfNumbers: number;
    phoneNumbers: string[];
    previousProvider: string;
  } | null;
  evn: boolean;
  phoneBookEntryType: 'none' | 'standard' | 'custom';
  phoneBookPrinted: boolean;
  phoneBookPhoneInfo: boolean;
  phoneBookInternet: boolean;
  phoneBookCustomName: string;
  phoneBookCustomAddress: string;
  phoneBookShowAddress: boolean;
}

interface PhoneBookOptionsProps {
  data: PhoneSelection;
  onChange: (data: PhoneSelection) => void;
}

export function PhoneBookOptions({ data, onChange }: PhoneBookOptionsProps) {
  return (
    <div className="bg-card rounded-xl p-5 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Book className="w-5 h-5 text-accent" />
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Telefondienste</p>
      </div>

      <div className="space-y-6">
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
            value={data.phoneBookEntryType}
            onValueChange={(value) => onChange({ 
              ...data, 
              phoneBookEntryType: value as 'none' | 'standard' | 'custom',
              // Reset custom fields when switching away from custom
              phoneBookCustomName: value !== 'custom' ? '' : data.phoneBookCustomName,
              phoneBookCustomAddress: value !== 'custom' ? '' : data.phoneBookCustomAddress,
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
          {data.phoneBookEntryType === 'custom' && (
            <div className="ml-6 space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="custom-name">Name für Eintrag *</Label>
                <Input
                  id="custom-name"
                  value={data.phoneBookCustomName}
                  onChange={(e) => onChange({ ...data, phoneBookCustomName: e.target.value })}
                  placeholder="Name für den Telefonbucheintrag"
                />
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="show-address"
                  checked={data.phoneBookShowAddress}
                  onCheckedChange={(checked) => onChange({ ...data, phoneBookShowAddress: checked === true })}
                />
                <Label htmlFor="show-address" className="cursor-pointer">
                  Adresse im Eintrag anzeigen
                </Label>
              </div>
              {data.phoneBookShowAddress && (
                <div className="space-y-2">
                  <Label htmlFor="custom-address">Adresszeile für Eintrag</Label>
                  <Input
                    id="custom-address"
                    value={data.phoneBookCustomAddress}
                    onChange={(e) => onChange({ ...data, phoneBookCustomAddress: e.target.value })}
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
        {data.phoneBookEntryType !== 'none' && (
          <div className="space-y-3 pt-2 border-t border-border">
            <Label className="text-sm text-muted-foreground">Zusätzliche Optionen</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="phone-printed"
                  checked={data.phoneBookPrinted}
                  onCheckedChange={(checked) => onChange({ ...data, phoneBookPrinted: checked === true })}
                />
                <Label htmlFor="phone-printed" className="cursor-pointer text-sm">
                  Gedrucktes Telefonbuch
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="phone-info"
                  checked={data.phoneBookPhoneInfo}
                  onCheckedChange={(checked) => onChange({ ...data, phoneBookPhoneInfo: checked === true })}
                />
                <Label htmlFor="phone-info" className="cursor-pointer text-sm">
                  Telefonauskunft
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="phone-internet"
                  checked={data.phoneBookInternet}
                  onCheckedChange={(checked) => onChange({ ...data, phoneBookInternet: checked === true })}
                />
                <Label htmlFor="phone-internet" className="cursor-pointer text-sm">
                  Internet-Auskunft
                </Label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
