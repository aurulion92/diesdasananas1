import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export interface ConsentData {
  advertising: boolean | null; // null = not yet selected, true = yes, false = no
  agb: boolean;
  datenschutz: boolean;
  widerruf: boolean;
  sepaMandat: boolean;
}

interface ConsentCheckboxesProps {
  data: ConsentData;
  onChange: (data: ConsentData) => void;
  errors?: {
    advertising?: string;
    agb?: string;
    datenschutz?: string;
    widerruf?: string;
    sepaMandat?: string;
  };
  showSepa?: boolean; // Whether to show SEPA mandate checkbox (shown separately in bank section)
}

export function ConsentCheckboxes({ data, onChange, errors, showSepa = false }: ConsentCheckboxesProps) {
  return (
    <div className="space-y-5">
      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Einwilligungen
      </h4>
      
      {/* SEPA-Lastschriftmandat - Optional, shown in bank section */}
      {showSepa && (
        <div className={cn(
          "flex items-start space-x-3 p-4 rounded-xl border-2 transition-colors",
          errors?.sepaMandat ? "border-destructive bg-destructive/5" : data.sepaMandat ? "border-primary bg-primary/5" : "border-border"
        )}>
          <Checkbox
            id="consent-sepa"
            checked={data.sepaMandat}
            onCheckedChange={(checked) => onChange({ ...data, sepaMandat: checked === true })}
            className="mt-0.5"
          />
          <div className="flex-1">
            <Label htmlFor="consent-sepa" className="cursor-pointer text-sm font-semibold text-primary">
              Ja, ich erteile der COM-IN das Lastschriftmandat *
            </Label>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Ich ermächtige die COM-IN Telekommunikations GmbH (Zahlungsempfänger), Zahlungen von meinem Konto mittels 
              Lastschrift einzuziehen. Zugleich weise ich mein Kreditinstitut an, die von COM-IN Telekommunikations GmbH auf mein 
              Konto gezogene Lastschriften einzulösen. Die COM-IN Telekommunikations GmbH akzeptiert ausschließlich das 
              Bankeinzugsverfahren. Eine Barzahlung oder Überweisung ist nicht möglich.
            </p>
            {errors?.sepaMandat && (
              <p className="text-xs text-destructive mt-1.5 font-medium">{errors.sepaMandat}</p>
            )}
          </div>
        </div>
      )}

      {/* Informierte Werbeeinwilligung - Radio buttons */}
      <div className={cn(
        "p-4 rounded-xl border transition-colors",
        errors?.advertising ? "border-destructive bg-destructive/5" : "border-border"
      )}>
        <p className="text-xs text-muted-foreground mb-3">
          Die Pflicht zur jährlichen Tarifberatung nach § 57 Abs. 3 TKG bleibt von dieser Erklärung einer 
          Werbeeinwilligung unberührt.
        </p>
        <Label className="font-semibold text-sm text-primary mb-3 block">Werbeeinwilligung</Label>
        <RadioGroup 
          value={data.advertising === true ? 'yes' : data.advertising === false ? 'no' : ''}
          onValueChange={(value) => onChange({ ...data, advertising: value === 'yes' })}
          className="space-y-2"
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="yes" id="advertising-yes" />
            <Label htmlFor="advertising-yes" className="cursor-pointer text-sm leading-relaxed text-success">
              Ja, ich möchte regelmäßig von COM-IN über Aktionen und neue Produkte informiert werden
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="no" id="advertising-no" />
            <Label htmlFor="advertising-no" className="cursor-pointer text-sm leading-relaxed text-muted-foreground">
              Nein, ich möchte nicht regelmäßig von COM-IN über Aktionen und neue Produkte informiert werden
            </Label>
          </div>
        </RadioGroup>
        {errors?.advertising && (
          <p className="text-xs text-destructive mt-2">{errors.advertising}</p>
        )}
      </div>

      {/* AGB - Required */}
      <div className={cn(
        "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
        errors?.agb ? "border-destructive bg-destructive/5" : "border-border"
      )}>
        <Checkbox
          id="consent-agb"
          checked={data.agb}
          onCheckedChange={(checked) => onChange({ ...data, agb: checked === true })}
          className="mt-0.5"
        />
        <div className="flex-1">
          <Label htmlFor="consent-agb" className="cursor-pointer text-sm font-medium">
            Allgemeine Geschäftsbedingungen *
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ja, ich habe die <a href="https://comin-glasfaser.de/agb/" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">AGBs</a> gelesen, verstanden und akzeptiert.
          </p>
          {errors?.agb && (
            <p className="text-xs text-destructive mt-1">{errors.agb}</p>
          )}
        </div>
      </div>

      {/* Datenschutz - Required */}
      <div className={cn(
        "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
        errors?.datenschutz ? "border-destructive bg-destructive/5" : "border-border"
      )}>
        <Checkbox
          id="consent-datenschutz"
          checked={data.datenschutz}
          onCheckedChange={(checked) => onChange({ ...data, datenschutz: checked === true })}
          className="mt-0.5"
        />
        <div className="flex-1">
          <Label htmlFor="consent-datenschutz" className="cursor-pointer text-sm font-medium">
            Datenschutz *
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ja, ich habe die <a href="https://comin-glasfaser.de/agb/" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">Datenschutzbestimmungen</a> gelesen, verstanden und akzeptiert.
          </p>
          {errors?.datenschutz && (
            <p className="text-xs text-destructive mt-1">{errors.datenschutz}</p>
          )}
        </div>
      </div>

      {/* Widerruf - Required */}
      <div className={cn(
        "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
        errors?.widerruf ? "border-destructive bg-destructive/5" : "border-border"
      )}>
        <Checkbox
          id="consent-widerruf"
          checked={data.widerruf}
          onCheckedChange={(checked) => onChange({ ...data, widerruf: checked === true })}
          className="mt-0.5"
        />
        <div className="flex-1">
          <Label htmlFor="consent-widerruf" className="cursor-pointer text-sm font-medium">
            Widerruf *
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ja, ich habe die Möglichkeiten eines <a href="https://comin-glasfaser.de/agb/" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">Widerrufs</a> gelesen, verstanden und akzeptiert.
          </p>
          {errors?.widerruf && (
            <p className="text-xs text-destructive mt-1">{errors.widerruf}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Separate SEPA Mandate component for use in Bank section
export function SepaMandateCheckbox({ 
  checked, 
  onChange, 
  error 
}: { 
  checked: boolean; 
  onChange: (checked: boolean) => void; 
  error?: string;
}) {
  return (
    <div className={cn(
      "flex items-start space-x-3 p-4 rounded-xl border-2 transition-colors mt-4",
      error ? "border-destructive bg-destructive/5" : checked ? "border-primary bg-primary/5" : "border-border"
    )}>
      <Checkbox
        id="sepa-mandate"
        checked={checked}
        onCheckedChange={(c) => onChange(c === true)}
        className="mt-0.5"
      />
      <div className="flex-1">
        <Label htmlFor="sepa-mandate" className="cursor-pointer text-sm font-semibold text-primary">
          Ja, ich erteile der COM-IN das Lastschriftmandat *
        </Label>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Ich ermächtige die COM-IN Telekommunikations GmbH (Zahlungsempfänger), Zahlungen von meinem Konto mittels 
          Lastschrift einzuziehen. Zugleich weise ich mein Kreditinstitut an, die von COM-IN Telekommunikations GmbH auf mein 
          Konto gezogene Lastschriften einzulösen. Die COM-IN Telekommunikations GmbH akzeptiert ausschließlich das 
          Bankeinzugsverfahren. Eine Barzahlung oder Überweisung ist nicht möglich.
        </p>
        {error && (
          <p className="text-xs text-destructive mt-1.5 font-medium">{error}</p>
        )}
      </div>
    </div>
  );
}

export const initialConsentData: ConsentData = {
  advertising: null,
  agb: false,
  datenschutz: false,
  widerruf: false,
  sepaMandat: false,
};
