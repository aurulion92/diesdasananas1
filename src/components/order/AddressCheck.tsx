import { useState } from 'react';
import { useOrder } from '@/context/OrderContext';
import { checkAddress } from '@/data/mockAddresses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, Loader2, AlertCircle, CheckCircle2, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AddressCheck() {
  const { setAddress, setStep } = useOrder();
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<'found' | 'not-found' | null>(null);

  const handleCheck = async () => {
    setIsChecking(true);
    setResult(null);
    
    // Simuliere API-Aufruf
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const found = checkAddress(street, houseNumber, postalCode);
    
    if (found) {
      setAddress(found);
      setResult('found');
    } else {
      setResult('not-found');
    }
    
    setIsChecking(false);
  };

  const handleContinue = () => {
    setStep(2);
  };

  return (
    <div className="max-w-xl mx-auto animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-hero flex items-center justify-center shadow-glow">
          <MapPin className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Verfügbarkeit prüfen</h2>
        <p className="text-muted-foreground">
          Geben Sie Ihre Adresse ein, um die verfügbaren Tarife zu sehen
        </p>
      </div>

      <div className="bg-card rounded-xl shadow-card p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Label htmlFor="street">Straße</Label>
            <Input
              id="street"
              placeholder="z.B. Hauptstraße"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="houseNumber">Hausnr.</Label>
            <Input
              id="houseNumber"
              placeholder="z.B. 1"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="postalCode">PLZ</Label>
            <Input
              id="postalCode"
              placeholder="z.B. 10115"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="city">Ort</Label>
            <Input
              id="city"
              placeholder="z.B. Berlin"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        <Button 
          onClick={handleCheck} 
          className="w-full" 
          size="lg"
          disabled={!street || !houseNumber || !postalCode || isChecking}
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Prüfe Verfügbarkeit...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Verfügbarkeit prüfen
            </>
          )}
        </Button>

        {/* Ergebnis anzeigen */}
        {result === 'found' && (
          <div className="animate-scale-in p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-success">Glasfaser verfügbar!</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  An Ihrer Adresse ist Glasfaser-Internet verfügbar. Wählen Sie jetzt Ihren Wunschtarif.
                </p>
                <Button onClick={handleContinue} className="mt-4" variant="success">
                  Weiter zur Tarifauswahl
                </Button>
              </div>
            </div>
          </div>
        )}

        {result === 'not-found' && (
          <div className="animate-scale-in p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-warning flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-warning">Adresse nicht gefunden</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Ihre Adresse ist aktuell nicht in unserer Datenbank hinterlegt. 
                  Wir prüfen gerne die Ausbaumöglichkeiten für Sie.
                </p>
                <div className="mt-4 p-3 bg-card rounded-lg border">
                  <p className="text-sm font-medium mb-2">Kontaktieren Sie uns:</p>
                  <a 
                    href="tel:+4912345678" 
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <Phone className="w-4 h-4" />
                    +49 123 456 78
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Demo Hinweis */}
      <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">
          <strong>Demo-Hinweis:</strong> Testen Sie mit "Hauptstraße 1, 10115 Berlin" (FTTH) 
          oder "Parkstraße 15, 10115 Berlin" (FTTB)
        </p>
      </div>
    </div>
  );
}
