import { useState } from 'react';
import { useOrder } from '@/context/OrderContext';
import { checkAddress, ConnectionType } from '@/data/addressDatabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Rocket, Loader2, AlertCircle, CheckCircle2, Phone, AlertTriangle } from 'lucide-react';
import { ContactForm } from './ContactForm';

export function AddressCheck() {
  const { setAddress, setStep, setConnectionType } = useOrder();
  const [city, setCity] = useState('Ingolstadt');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<'ftth' | 'limited' | 'not-connected' | 'not-found' | null>(null);
  const [foundAddress, setFoundAddress] = useState<{ street: string; houseNumber: string; city: string } | null>(null);

  const handleCheck = async () => {
    setIsChecking(true);
    setResult(null);
    
    try {
      const found = await checkAddress(street, houseNumber, city);
      
      if (found) {
        setAddress(found);
        setFoundAddress({ street: found.street, houseNumber: found.houseNumber, city: found.city });
        
        if (found.connectionType === 'ftth') {
          setResult('ftth');
        } else if (found.connectionType === 'limited') {
          setResult('limited');
        } else {
          setResult('not-connected');
        }
      } else {
        setResult('not-found');
        setFoundAddress({ street, houseNumber, city });
      }
    } catch (error) {
      console.error('Error checking address:', error);
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
              placeholder="Stadt"
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
            disabled={!street || !houseNumber || !city || isChecking}
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

        {/* FTTH - Alle Tarife verfügbar */}
        {result === 'ftth' && (
          <div className="animate-scale-in mt-6 p-5 bg-success/10 border border-success/20 rounded-xl">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-success text-lg">Glasfaser verfügbar!</h4>
                <p className="text-muted-foreground mt-1">
                  An Ihrer Adresse sind alle unsere einfach Internet Produkte verfügbar. Wählen Sie jetzt Ihren Wunschtarif.
                </p>
                <Button onClick={handleContinue} variant="success" className="mt-4">
                  Weiter zur Produktauswahl
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Limited - Nur FiberBasic 100 */}
        {result === 'limited' && (
          <div className="animate-scale-in mt-6 p-5 bg-accent/10 border border-accent/20 rounded-xl">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-accent text-lg">Eingeschränkte Verfügbarkeit</h4>
                <p className="text-muted-foreground mt-1">
                  An Ihrer Adresse ist unser <strong>FiberBasic 100</strong> Tarif für <strong>34,90 €/Monat</strong> verfügbar.
                </p>
                <Button onClick={handleContinue} variant="orange" className="mt-4">
                  FiberBasic 100 auswählen
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Passender Tarif nicht dabei? Kontaktieren Sie uns für weitere Optionen.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Not connected - Kontaktformular */}
        {result === 'not-connected' && (
          <div className="animate-scale-in mt-6 space-y-4">
            <div className="p-5 bg-destructive/10 border border-destructive/20 rounded-xl">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-destructive text-lg">Objekt nicht angebunden</h4>
                  <p className="text-muted-foreground mt-1">
                    Leider ist Ihr Objekt aktuell nicht an unser Glasfasernetz angebunden oder ausgebaut. 
                    Bitte kontaktieren Sie uns, damit wir die Möglichkeiten prüfen können.
                  </p>
                </div>
              </div>
            </div>
            {foundAddress && (
              <ContactForm reason="not-connected" address={foundAddress} />
            )}
          </div>
        )}

        {/* Not found in database */}
        {result === 'not-found' && (
          <div className="animate-scale-in mt-6 space-y-4">
            <div className="p-5 bg-muted border border-border rounded-xl">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-foreground text-lg">Adresse nicht gefunden</h4>
                  <p className="text-muted-foreground mt-1">
                    Ihre Adresse ist nicht in unserer Datenbank hinterlegt. 
                    Bitte kontaktieren Sie uns, damit wir prüfen können, ob ein Anschluss möglich ist.
                  </p>
                </div>
              </div>
            </div>
            {foundAddress && (
              <ContactForm reason="not-connected" address={foundAddress} />
            )}
          </div>
        )}
      </div>

      {/* Demo Hinweis */}
      <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
        <p className="text-sm text-muted-foreground text-center">
          <strong>Demo:</strong> Testen Sie z.B. "Adam-Lechner-Straße 1" (FTTH) 
          oder "Adam-Lechner-Straße 5" (Nicht ausgebaut)
        </p>
      </div>
    </div>
  );
}
