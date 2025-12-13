import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface ConsentData {
  advertising: boolean;
  agb: boolean;
}

interface ConsentCheckboxesProps {
  data: ConsentData;
  onChange: (data: ConsentData) => void;
  errors?: {
    advertising?: string;
    agb?: string;
  };
}

export function ConsentCheckboxes({ data, onChange, errors }: ConsentCheckboxesProps) {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Einwilligungen
      </h4>
      
      {/* Advertising Consent */}
      <div className={cn(
        "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
        errors?.advertising ? "border-destructive bg-destructive/5" : "border-border"
      )}>
        <Checkbox
          id="consent-advertising"
          checked={data.advertising}
          onCheckedChange={(checked) => onChange({ ...data, advertising: checked === true })}
          className="mt-0.5"
        />
        <div className="flex-1">
          <Label htmlFor="consent-advertising" className="cursor-pointer text-sm leading-relaxed">
            Ich willige ein, dass COM-IN mich zu Werbezwecken per E-Mail, Telefon oder Post kontaktieren darf. 
            Diese Einwilligung kann ich jederzeit widerrufen.
          </Label>
          {errors?.advertising && (
            <p className="text-xs text-destructive mt-1">{errors.advertising}</p>
          )}
        </div>
      </div>

      {/* AGB Consent - Required */}
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
          <Label htmlFor="consent-agb" className="cursor-pointer text-sm leading-relaxed">
            Ich habe die{' '}
            <a 
              href="https://www.comin-glasfaser.de/agb" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              Allgemeinen Geschäftsbedingungen (AGB)
            </a>{' '}
            und die{' '}
            <a 
              href="https://www.comin-glasfaser.de/datenschutz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              Datenschutzerklärung
            </a>{' '}
            gelesen und akzeptiere diese. *
          </Label>
          {errors?.agb && (
            <p className="text-xs text-destructive mt-1">{errors.agb}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export const initialConsentData: ConsentData = {
  advertising: false,
  agb: false,
};
