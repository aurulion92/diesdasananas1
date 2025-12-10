import { useState } from 'react';
import { useOrder } from '@/context/OrderContext';
import { checkAddress } from '@/data/mockAddresses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Rocket, Search, Loader2, AlertCircle, CheckCircle2, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AddressCheck() {
  const { setAddress, setStep } = useOrder();
  const [city, setCity] = useState('Ingolstadt');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
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
    <div className="max-w-3xl mx-auto animate-slide-up">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <Rocket className="w-16 h-16 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-3">
          Jetzt Verfügbarkeit prüfen
        </h1>
        <p className="text-accent font-medium text-lg">
          ...und gigaschnell lossurfen mit unseren neuen <span className="font-bold">einfach Internet</span> Produkten!
        </p>
      </div>

      {/* Formular */}
      <div className="bg-card rounded-2xl shadow-card p-6 md:p-8">
        <p className="text-center text-foreground mb-6 font-medium">
          Geben Sie Ihre Straße und Ihre Hausnummer an, damit wir prüfen können, welche Produkte an Ihrem Standort verfügbar sind.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Input
              placeholder="Ingolstadt"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-12 rounded-full bg-background border-border text-center"
            />
          </div>
          <div>
            <Input
              placeholder="Straße"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="h-12 rounded-full bg-background border-border text-center"
            />
          </div>
          <div>
            <Input
              placeholder="Hausnummer"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              className="h-12 rounded-full bg-background border-border text-center"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleCheck} 
            variant="orange"
            size="lg"
            disabled={!street || !houseNumber || isChecking}
            className="px-10"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Prüfe...
              </>
            ) : (
              'Weiter'
            )}
          </Button>
        </div>

        {/* Ergebnis anzeigen */}
        {result === 'found' && (
          <div className="animate-scale-in mt-6 p-5 bg-success/10 border border-success/20 rounded-xl">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-success text-lg">Glasfaser verfügbar!</h4>
                <p className="text-muted-foreground mt-1">
                  An Ihrer Adresse sind unsere einfach Internet Produkte verfügbar. Wählen Sie jetzt Ihren Wunschtarif.
                </p>
                <Button onClick={handleContinue} variant="success" className="mt-4">
                  Weiter zur Produktauswahl
                </Button>
              </div>
            </div>
          </div>
        )}

        {result === 'not-found' && (
          <div className="animate-scale-in mt-6 p-5 bg-accent/10 border border-accent/20 rounded-xl">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-accent text-lg">Adresse nicht gefunden</h4>
                <p className="text-muted-foreground mt-1">
                  Ihre Adresse ist aktuell nicht in unserer Datenbank hinterlegt. 
                  Wir prüfen gerne die Ausbaumöglichkeiten für Sie.
                </p>
                <div className="mt-4 p-4 bg-card rounded-xl border border-border">
                  <p className="text-sm font-medium mb-2">Kontaktieren Sie uns:</p>
                  <a 
                    href="tel:+49841885110" 
                    className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
                  >
                    <Phone className="w-4 h-4" />
                    +49 841 88511-0
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Demo Hinweis */}
      <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
        <p className="text-sm text-muted-foreground text-center">
          <strong>Demo:</strong> Testen Sie mit "Hauptstraße 1" (PLZ: 10115, FTTH) 
          oder "Parkstraße 15" (PLZ: 10115, FTTB)
        </p>
      </div>
    </div>
  );
}
