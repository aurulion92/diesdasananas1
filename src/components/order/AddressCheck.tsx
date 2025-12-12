import { useState, useEffect, useRef } from 'react';
import { useOrder } from '@/context/OrderContext';
import { checkAddress, searchStreets, getHouseNumbers, ConnectionType } from '@/data/addressDatabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Rocket, Loader2, AlertCircle, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react';
import { ContactForm } from './ContactForm';
import { cn } from '@/lib/utils';

export function AddressCheck() {
  const { setAddress, setStep, setConnectionType } = useOrder();
  const [city, setCity] = useState('Ingolstadt');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<'ftth' | 'limited' | 'not-connected' | 'not-found' | null>(null);
  const [foundAddress, setFoundAddress] = useState<{ street: string; houseNumber: string; city: string } | null>(null);
  const [showLimitedContactForm, setShowLimitedContactForm] = useState(false);

  // Autocomplete states
  const [streetSuggestions, setStreetSuggestions] = useState<string[]>([]);
  const [houseNumberSuggestions, setHouseNumberSuggestions] = useState<string[]>([]);
  const [showStreetDropdown, setShowStreetDropdown] = useState(false);
  const [showHouseNumberDropdown, setShowHouseNumberDropdown] = useState(false);
  const [isLoadingStreets, setIsLoadingStreets] = useState(false);
  const [isLoadingHouseNumbers, setIsLoadingHouseNumbers] = useState(false);

  const streetInputRef = useRef<HTMLInputElement>(null);
  const houseNumberInputRef = useRef<HTMLInputElement>(null);
  const streetDropdownRef = useRef<HTMLDivElement>(null);
  const houseNumberDropdownRef = useRef<HTMLDivElement>(null);

  // Search streets when typing (min 3 chars)
  useEffect(() => {
    const searchStreetsAsync = async () => {
      if (street.length >= 3) {
        setIsLoadingStreets(true);
        const results = await searchStreets(street, city);
        setStreetSuggestions(results);
        setShowStreetDropdown(results.length > 0);
        setIsLoadingStreets(false);
      } else {
        setStreetSuggestions([]);
        setShowStreetDropdown(false);
      }
    };

    const debounce = setTimeout(searchStreetsAsync, 200);
    return () => clearTimeout(debounce);
  }, [street, city]);

  // Load house numbers when street has at least 3 characters
  useEffect(() => {
    const loadHouseNumbers = async () => {
      if (street && street.length >= 3) {
        setIsLoadingHouseNumbers(true);
        const results = await getHouseNumbers(street, city);
        setHouseNumberSuggestions(results);
        setIsLoadingHouseNumbers(false);
      } else {
        setHouseNumberSuggestions([]);
      }
    };

    loadHouseNumbers();
  }, [street, city]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (streetDropdownRef.current && !streetDropdownRef.current.contains(event.target as Node) &&
          !streetInputRef.current?.contains(event.target as Node)) {
        setShowStreetDropdown(false);
      }
      if (houseNumberDropdownRef.current && !houseNumberDropdownRef.current.contains(event.target as Node) &&
          !houseNumberInputRef.current?.contains(event.target as Node)) {
        setShowHouseNumberDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStreetSelect = (selectedStreet: string) => {
    setStreet(selectedStreet);
    setShowStreetDropdown(false);
    setHouseNumber('');
    setResult(null);
    // Focus house number input after selecting street
    setTimeout(() => houseNumberInputRef.current?.focus(), 100);
  };

  const handleHouseNumberSelect = (selectedNumber: string) => {
    setHouseNumber(selectedNumber);
    setShowHouseNumberDropdown(false);
    setResult(null);
  };

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

  // Check if house number exists in suggestions
  const isValidHouseNumber = houseNumberSuggestions.length === 0 || houseNumberSuggestions.includes(houseNumber);
  const isHouseNumberInDatabase = houseNumberSuggestions.includes(houseNumber);
  const isValidStreet = streetSuggestions.includes(street) || street.length < 3;

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
          {/* Stadt */}
          <div>
            <Input
              placeholder="Stadt"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setStreet('');
                setHouseNumber('');
                setResult(null);
              }}
              className="h-12 rounded-full bg-background border-border text-center"
            />
          </div>

          {/* Straße mit Autocomplete */}
          <div className="relative">
            <div className="relative">
              <Input
                ref={streetInputRef}
                placeholder="Straße (mind. 3 Zeichen)"
                value={street}
                onChange={(e) => {
                  setStreet(e.target.value);
                  setHouseNumber('');
                  setResult(null);
                }}
                onFocus={() => {
                  if (streetSuggestions.length > 0) {
                    setShowStreetDropdown(true);
                  }
                }}
                className={cn(
                  "h-12 rounded-full bg-background border-border text-center pr-10",
                  isLoadingStreets && "pr-10"
                )}
              />
              {isLoadingStreets && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
              )}
              {!isLoadingStreets && streetSuggestions.length > 0 && (
                <ChevronDown 
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground cursor-pointer"
                  onClick={() => setShowStreetDropdown(!showStreetDropdown)}
                />
              )}
            </div>
            
            {showStreetDropdown && streetSuggestions.length > 0 && (
              <div 
                ref={streetDropdownRef}
                className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-auto"
              >
                {streetSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full px-4 py-3 text-left hover:bg-accent/10 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    onClick={() => handleStreetSelect(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hausnummer mit Dropdown */}
          <div className="relative">
            <div className="relative">
              <Input
                ref={houseNumberInputRef}
                placeholder="Hausnummer"
                value={houseNumber}
                onChange={(e) => {
                  setHouseNumber(e.target.value);
                  setResult(null);
                }}
                onFocus={() => {
                  if (houseNumberSuggestions.length > 0) {
                    setShowHouseNumberDropdown(true);
                  }
                }}
                className="h-12 rounded-full bg-background border-border text-center pr-10"
              />
              {houseNumberSuggestions.length > 0 && (
                <ChevronDown 
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground cursor-pointer"
                  onClick={() => setShowHouseNumberDropdown(!showHouseNumberDropdown)}
                />
              )}
            </div>

            {showHouseNumberDropdown && houseNumberSuggestions.length > 0 && (
              <div 
                ref={houseNumberDropdownRef}
                className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-auto"
              >
                {houseNumberSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full px-4 py-3 text-left hover:bg-accent/10 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    onClick={() => handleHouseNumberSelect(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Hinweis für Straßeneingabe */}
        <p className="text-sm text-muted-foreground mb-4 text-center">
          Tippen Sie mindestens drei Buchstaben, um Straßenvorschläge zu erhalten.
        </p>

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

        {/* Hinweis wenn Hausnummer nicht in der Liste - zeigt Kontaktformular */}
        {houseNumber && !isHouseNumberInDatabase && houseNumberSuggestions.length > 0 && (
          <div className="animate-scale-in mt-6 space-y-4">
            <div className="p-5 bg-muted border border-border rounded-xl">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-foreground text-lg">Hausnummer nicht in der Datenbank</h4>
                  <p className="text-muted-foreground mt-1">
                    Diese Hausnummer ist nicht in unserer Datenbank hinterlegt. 
                    Bitte kontaktieren Sie uns, damit wir prüfen können, ob ein Anschluss möglich ist.
                  </p>
                </div>
              </div>
            </div>
            <ContactForm reason="not-connected" address={{ street, houseNumber, city }} />
          </div>
        )}

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
          <div className="animate-scale-in mt-6 space-y-4">
            <div className="p-5 bg-accent/10 border border-accent/20 rounded-xl">
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
                    Passender Tarif nicht dabei?{' '}
                    <button 
                      onClick={() => setShowLimitedContactForm(true)}
                      className="text-primary hover:underline font-medium"
                    >
                      Kontaktieren Sie uns
                    </button>
                  </p>
                </div>
              </div>
            </div>
            {showLimitedContactForm && foundAddress && (
              <ContactForm reason="general" address={foundAddress} />
            )}
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

    </div>
  );
}
