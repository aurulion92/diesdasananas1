import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  User, 
  ArrowLeft, 
  CreditCard, 
  Home, 
  FileEdit, 
  TrendingUp, 
  AlertCircle,
  Loader2,
  ChevronDown,
  Check,
  Upload,
  Rocket,
  Gift,
  CheckCircle2,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { findExistingCustomer, getContractStatus, ExistingCustomer } from '@/data/existingCustomers';
import { searchStreets, getHouseNumbers, checkAddress } from '@/data/addressDatabase';
import { ftthTariffs } from '@/data/tariffs';
import { toast } from '@/hooks/use-toast';

interface ExistingCustomerPortalProps {
  onClose: () => void;
}

type PortalView = 'login' | 'menu' | 'upgrade' | 'move' | 'bank' | 'name';

export function ExistingCustomerPortal({ onClose }: ExistingCustomerPortalProps) {
  const [view, setView] = useState<PortalView>('login');
  const [customer, setCustomer] = useState<ExistingCustomer | null>(null);
  
  // Login form
  const [customerId, setCustomerId] = useState('');
  const [city, setCity] = useState('Ingolstadt');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Autocomplete
  const [streetSuggestions, setStreetSuggestions] = useState<string[]>([]);
  const [houseNumberSuggestions, setHouseNumberSuggestions] = useState<string[]>([]);
  const [showStreetDropdown, setShowStreetDropdown] = useState(false);
  const [showHouseNumberDropdown, setShowHouseNumberDropdown] = useState(false);
  const streetInputRef = useRef<HTMLInputElement>(null);
  const houseNumberInputRef = useRef<HTMLInputElement>(null);

  // Upgrade
  const [selectedUpgradeTariff, setSelectedUpgradeTariff] = useState<string | null>(null);
  
  // Move
  const [moveCity, setMoveCity] = useState('Ingolstadt');
  const [moveStreet, setMoveStreet] = useState('');
  const [moveHouseNumber, setMoveHouseNumber] = useState('');
  const [moveStreetSuggestions, setMoveStreetSuggestions] = useState<string[]>([]);
  const [moveHouseNumberSuggestions, setMoveHouseNumberSuggestions] = useState<string[]>([]);
  const [showMoveStreetDropdown, setShowMoveStreetDropdown] = useState(false);
  const [showMoveHouseNumberDropdown, setShowMoveHouseNumberDropdown] = useState(false);
  const [moveResult, setMoveResult] = useState<'success' | 'not-found' | null>(null);

  // Bank/Name change
  const [newAccountHolder, setNewAccountHolder] = useState('');
  const [newIban, setNewIban] = useState('');
  const [nameDocument, setNameDocument] = useState<File | null>(null);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');

  // Street search
  useEffect(() => {
    const searchStreetsAsync = async () => {
      if (street.length >= 3) {
        const results = await searchStreets(street, city);
        setStreetSuggestions(results);
        setShowStreetDropdown(results.length > 0);
      } else {
        setStreetSuggestions([]);
        setShowStreetDropdown(false);
      }
    };
    const debounce = setTimeout(searchStreetsAsync, 200);
    return () => clearTimeout(debounce);
  }, [street, city]);

  useEffect(() => {
    const loadHouseNumbers = async () => {
      if (street && streetSuggestions.includes(street)) {
        const results = await getHouseNumbers(street, city);
        setHouseNumberSuggestions(results);
      } else {
        setHouseNumberSuggestions([]);
      }
    };
    loadHouseNumbers();
  }, [street, city, streetSuggestions]);

  // Move street search
  useEffect(() => {
    const searchStreetsAsync = async () => {
      if (moveStreet.length >= 3) {
        const results = await searchStreets(moveStreet, moveCity);
        setMoveStreetSuggestions(results);
        setShowMoveStreetDropdown(results.length > 0);
      } else {
        setMoveStreetSuggestions([]);
        setShowMoveStreetDropdown(false);
      }
    };
    const debounce = setTimeout(searchStreetsAsync, 200);
    return () => clearTimeout(debounce);
  }, [moveStreet, moveCity]);

  useEffect(() => {
    const loadHouseNumbers = async () => {
      if (moveStreet && moveStreetSuggestions.includes(moveStreet)) {
        const results = await getHouseNumbers(moveStreet, moveCity);
        setMoveHouseNumberSuggestions(results);
      } else {
        setMoveHouseNumberSuggestions([]);
      }
    };
    loadHouseNumbers();
  }, [moveStreet, moveCity, moveStreetSuggestions]);

  const handleLogin = async () => {
    setIsLoading(true);
    setLoginError('');

    await new Promise(resolve => setTimeout(resolve, 500));

    const found = findExistingCustomer(customerId, street, houseNumber, city);
    
    if (found) {
      setCustomer(found);
      setView('menu');
      toast({
        title: "Willkommen zurück!",
        description: `Hallo ${found.firstName} ${found.lastName}`,
      });
    } else {
      setLoginError('Kundennummer und Adresse stimmen nicht überein. Bitte überprüfen Sie Ihre Angaben.');
    }
    
    setIsLoading(false);
  };

  const handleMoveSubmit = async () => {
    setIsLoading(true);
    
    const addressResult = await checkAddress(moveStreet, moveHouseNumber, moveCity);
    
    if (addressResult && addressResult.connectionType !== 'not-connected') {
      setMoveResult('success');
      toast({
        title: "Umzugsanfrage eingegangen",
        description: "Wir werden uns zeitnah bei Ihnen melden.",
      });
    } else {
      setMoveResult('not-found');
    }
    
    setIsLoading(false);
  };

  const handleBankSubmit = () => {
    toast({
      title: "Bankverbindung aktualisiert",
      description: "Ihre neue Bankverbindung wurde übermittelt.",
    });
    setView('menu');
  };

  const handleNameSubmit = () => {
    if (!nameDocument) {
      toast({
        title: "Dokument erforderlich",
        description: "Bitte laden Sie ein Dokument hoch.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Namensänderung eingegangen",
      description: "Wir prüfen Ihr Dokument und melden uns bei Ihnen.",
    });
    setView('menu');
  };

  const handleUpgradeSubmit = () => {
    const tariff = ftthTariffs.find(t => t.id === selectedUpgradeTariff);
    toast({
      title: "Tarifwechsel beantragt",
      description: `Ihr Wechsel zu ${tariff?.name} wurde übermittelt.`,
    });
    setView('menu');
  };

  const upgradeTariffs = ftthTariffs.filter(t => t.id !== customer?.currentTariff);

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Bestandskunden-Portal</h1>
        <p className="text-muted-foreground">Verwalten Sie Ihren Vertrag und Ihre Daten</p>
      </div>

      {/* Login View */}
      {view === 'login' && (
        <div className="bg-card rounded-2xl shadow-card p-6 md:p-8">
          <h2 className="text-xl font-bold text-primary mb-4">Anmelden</h2>
          <p className="text-muted-foreground mb-6">
            Geben Sie Ihre Kundennummer und Ihre Anschlussadresse ein.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Kundennummer</label>
              <Input
                placeholder="z.B. KD123456"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value.toUpperCase());
                  setLoginError('');
                }}
                className="h-12 rounded-xl"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Stadt</label>
              <Input
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setStreet('');
                  setHouseNumber('');
                }}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="relative">
              <label className="text-sm font-medium text-foreground mb-1 block">Straße</label>
              <div className="relative">
                <Input
                  ref={streetInputRef}
                  placeholder="Straße (mind. 3 Zeichen)"
                  value={street}
                  onChange={(e) => {
                    setStreet(e.target.value);
                    setHouseNumber('');
                    setLoginError('');
                  }}
                  onFocus={() => {
                    if (streetSuggestions.length > 0) setShowStreetDropdown(true);
                  }}
                  className="h-12 rounded-xl pr-10"
                />
                {streetSuggestions.length > 0 && (
                  <ChevronDown 
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground cursor-pointer"
                    onClick={() => setShowStreetDropdown(!showStreetDropdown)}
                  />
                )}
              </div>
              {showStreetDropdown && streetSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-auto">
                  {streetSuggestions.map((s, i) => (
                    <button
                      key={i}
                      className="w-full px-4 py-3 text-left hover:bg-accent/10 transition-colors"
                      onClick={() => {
                        setStreet(s);
                        setShowStreetDropdown(false);
                        setHouseNumber('');
                        setTimeout(() => houseNumberInputRef.current?.focus(), 100);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="text-sm font-medium text-foreground mb-1 block">Hausnummer</label>
              <div className="relative">
                <Input
                  ref={houseNumberInputRef}
                  placeholder="Hausnummer"
                  value={houseNumber}
                  onChange={(e) => {
                    setHouseNumber(e.target.value);
                    setLoginError('');
                  }}
                  onFocus={() => {
                    if (houseNumberSuggestions.length > 0) setShowHouseNumberDropdown(true);
                  }}
                  disabled={!street || !streetSuggestions.includes(street)}
                  className={cn(
                    "h-12 rounded-xl pr-10",
                    (!street || !streetSuggestions.includes(street)) && "opacity-50"
                  )}
                />
                {houseNumberSuggestions.length > 0 && (
                  <ChevronDown 
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground cursor-pointer"
                    onClick={() => setShowHouseNumberDropdown(!showHouseNumberDropdown)}
                  />
                )}
              </div>
              {showHouseNumberDropdown && houseNumberSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-auto">
                  {houseNumberSuggestions.map((h, i) => (
                    <button
                      key={i}
                      className="w-full px-4 py-3 text-left hover:bg-accent/10 transition-colors"
                      onClick={() => {
                        setHouseNumber(h);
                        setShowHouseNumberDropdown(false);
                      }}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loginError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {loginError}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1 h-12 rounded-full"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück
              </Button>
              <Button 
                variant="orange"
                onClick={handleLogin}
                disabled={!customerId || !street || !houseNumber || isLoading}
                className="flex-1 h-12"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Anmelden'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Menu View */}
      {view === 'menu' && customer && (
        <div className="space-y-6">
          {/* Current contract info */}
          <div className="bg-card rounded-2xl shadow-card p-6">
            <h3 className="font-bold text-primary mb-4">Ihr aktueller Vertrag</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kundennummer</span>
                <span className="font-mono font-medium">{customer.customerId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adresse</span>
                <span>{customer.street} {customer.houseNumber}, {customer.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tarif</span>
                <span className="font-medium">{customer.tariffName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Laufzeit</span>
                <span className="text-success font-medium">{getContractStatus(customer)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid gap-4">
            <button
              onClick={() => setView('upgrade')}
              className="bg-card rounded-xl shadow-soft p-5 flex items-center gap-4 hover:bg-accent/5 transition-all text-left border-2 border-transparent hover:border-accent/30"
            >
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-primary">Tarif-Upgrade</h4>
                <p className="text-sm text-muted-foreground">Wechseln Sie zu einem schnelleren Tarif</p>
              </div>
              <Gift className="w-5 h-5 text-accent" />
            </button>

            <button
              onClick={() => setView('move')}
              className="bg-card rounded-xl shadow-soft p-5 flex items-center gap-4 hover:bg-accent/5 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Home className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-primary">Umzug anzeigen</h4>
                <p className="text-sm text-muted-foreground">Nehmen Sie Ihren Anschluss mit</p>
              </div>
            </button>

            <button
              onClick={() => setView('bank')}
              className="bg-card rounded-xl shadow-soft p-5 flex items-center gap-4 hover:bg-accent/5 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-primary">Bankverbindung ändern</h4>
                <p className="text-sm text-muted-foreground">IBAN und Kontoinhaber aktualisieren</p>
              </div>
            </button>

            <button
              onClick={() => setView('name')}
              className="bg-card rounded-xl shadow-soft p-5 flex items-center gap-4 hover:bg-accent/5 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <FileEdit className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-primary">Namensänderung</h4>
                <p className="text-sm text-muted-foreground">Dokument erforderlich</p>
              </div>
            </button>
          </div>

          <Button variant="outline" onClick={onClose} className="w-full h-12 rounded-full">
            <ArrowLeft className="w-4 h-4" />
            Zum Neukundenbereich
          </Button>
        </div>
      )}

      {/* Upgrade View */}
      {view === 'upgrade' && customer && (
        <div className="bg-card rounded-2xl shadow-card p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-success" />
            <h2 className="text-xl font-bold text-primary">Tarif-Upgrade</h2>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 mb-6">
            <p className="text-sm text-muted-foreground">Ihr aktueller Tarif:</p>
            <p className="font-bold text-primary">{customer.tariffName}</p>
          </div>

          <div className="space-y-4 mb-6">
            <p className="font-medium text-foreground">Wählen Sie Ihren neuen Tarif:</p>
            {upgradeTariffs.map((tariff) => {
              // FTTH Kunden bekommen Router-Rabatt
              const routerDiscount = customer.connectionType === 'ftth' ? 4 : 0;
              
              return (
                <button
                  key={tariff.id}
                  onClick={() => setSelectedUpgradeTariff(tariff.id)}
                  className={cn(
                    "w-full p-5 rounded-xl border-2 transition-all text-left",
                    selectedUpgradeTariff === tariff.id
                      ? "border-success bg-success/5"
                      : "border-border hover:border-success/50"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{tariff.name}</span>
                        {selectedUpgradeTariff === tariff.id && (
                          <Check className="w-5 h-5 text-success" />
                        )}
                      </div>
                      <p className="text-muted-foreground">{tariff.speed}</p>
                      {routerDiscount > 0 && (
                        <p className="text-success text-sm mt-1">✓ Router -4€/Monat bei einfach Tarifen</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-accent text-xl">{tariff.monthlyPrice.toFixed(2).replace('.', ',')} €</p>
                      <p className="text-sm text-muted-foreground">/Monat</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-accent/5 rounded-xl p-4 mb-6 border border-accent/20">
            <p className="text-sm text-accent">
              <strong>Gut zu wissen:</strong> Bei einem Upgrade bleiben Ihre bestehenden Vertragsdaten erhalten. 
              Der neue Tarif wird zum nächstmöglichen Zeitpunkt aktiviert.
            </p>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setView('menu')} className="flex-1 h-12 rounded-full">
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            <Button 
              variant="success"
              onClick={handleUpgradeSubmit}
              disabled={!selectedUpgradeTariff}
              className="flex-1 h-12"
            >
              <Rocket className="w-4 h-4" />
              Upgrade beantragen
            </Button>
          </div>
        </div>
      )}

      {/* Move View */}
      {view === 'move' && (
        <div className="bg-card rounded-2xl shadow-card p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Home className="w-6 h-6 text-accent" />
            <h2 className="text-xl font-bold text-primary">Umzug anzeigen</h2>
          </div>

          {!moveResult && (
            <>
              <p className="text-muted-foreground mb-6">
                Geben Sie Ihre neue Adresse ein. Wir prüfen die Verfügbarkeit.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Stadt</label>
                  <Input
                    value={moveCity}
                    onChange={(e) => {
                      setMoveCity(e.target.value);
                      setMoveStreet('');
                      setMoveHouseNumber('');
                    }}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="relative">
                  <label className="text-sm font-medium text-foreground mb-1 block">Neue Straße</label>
                  <Input
                    placeholder="Straße (mind. 3 Zeichen)"
                    value={moveStreet}
                    onChange={(e) => {
                      setMoveStreet(e.target.value);
                      setMoveHouseNumber('');
                    }}
                    onFocus={() => {
                      if (moveStreetSuggestions.length > 0) setShowMoveStreetDropdown(true);
                    }}
                    className="h-12 rounded-xl"
                  />
                  {showMoveStreetDropdown && moveStreetSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-auto">
                      {moveStreetSuggestions.map((s, i) => (
                        <button
                          key={i}
                          className="w-full px-4 py-3 text-left hover:bg-accent/10 transition-colors"
                          onClick={() => {
                            setMoveStreet(s);
                            setShowMoveStreetDropdown(false);
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="text-sm font-medium text-foreground mb-1 block">Neue Hausnummer</label>
                  <Input
                    placeholder="Hausnummer"
                    value={moveHouseNumber}
                    onChange={(e) => setMoveHouseNumber(e.target.value)}
                    onFocus={() => {
                      if (moveHouseNumberSuggestions.length > 0) setShowMoveHouseNumberDropdown(true);
                    }}
                    disabled={!moveStreet || !moveStreetSuggestions.includes(moveStreet)}
                    className="h-12 rounded-xl"
                  />
                  {showMoveHouseNumberDropdown && moveHouseNumberSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-auto">
                      {moveHouseNumberSuggestions.map((h, i) => (
                        <button
                          key={i}
                          className="w-full px-4 py-3 text-left hover:bg-accent/10 transition-colors"
                          onClick={() => {
                            setMoveHouseNumber(h);
                            setShowMoveHouseNumberDropdown(false);
                          }}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="outline" onClick={() => setView('menu')} className="flex-1 h-12 rounded-full">
                    <ArrowLeft className="w-4 h-4" />
                    Zurück
                  </Button>
                  <Button 
                    variant="orange"
                    onClick={handleMoveSubmit}
                    disabled={!moveStreet || !moveHouseNumber || isLoading}
                    className="flex-1 h-12"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Abschicken'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {moveResult === 'success' && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
              <h3 className="text-xl font-bold text-success mb-2">Umzugsanfrage eingegangen!</h3>
              <p className="text-muted-foreground mb-6">
                Wir haben Ihre Anfrage erhalten und melden uns zeitnah bei Ihnen.
              </p>
              <Button variant="outline" onClick={() => setView('menu')} className="rounded-full">
                <ArrowLeft className="w-4 h-4" />
                Zurück zum Menü
              </Button>
            </div>
          )}

          {moveResult === 'not-found' && (
            <div className="text-center py-8">
              <MapPin className="w-16 h-16 text-accent mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Objekt nicht versorgt</h3>
              <p className="text-muted-foreground mb-6">
                Leider ist Ihre neue Adresse aktuell nicht von uns versorgt. 
                Wir haben Ihre Anfrage notiert und melden uns bei Ihnen, sobald sich etwas ändert.
              </p>
              <Button variant="outline" onClick={() => setView('menu')} className="rounded-full">
                <ArrowLeft className="w-4 h-4" />
                Zurück zum Menü
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Bank Change View */}
      {view === 'bank' && (
        <div className="bg-card rounded-2xl shadow-card p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-6 h-6 text-accent" />
            <h2 className="text-xl font-bold text-primary">Bankverbindung ändern</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Neuer Kontoinhaber</label>
              <Input
                placeholder="Vor- und Nachname"
                value={newAccountHolder}
                onChange={(e) => setNewAccountHolder(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Neue IBAN</label>
              <Input
                placeholder="DE00 0000 0000 0000 0000 00"
                value={newIban}
                onChange={(e) => setNewIban(e.target.value.toUpperCase())}
                className="h-12 rounded-xl font-mono"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={() => setView('menu')} className="flex-1 h-12 rounded-full">
                <ArrowLeft className="w-4 h-4" />
                Zurück
              </Button>
              <Button 
                variant="orange"
                onClick={handleBankSubmit}
                disabled={!newAccountHolder || !newIban}
                className="flex-1 h-12"
              >
                Speichern
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Name Change View */}
      {view === 'name' && (
        <div className="bg-card rounded-2xl shadow-card p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <FileEdit className="w-6 h-6 text-accent" />
            <h2 className="text-xl font-bold text-primary">Namensänderung</h2>
          </div>

          <div className="bg-accent/10 rounded-xl p-4 mb-6 border border-accent/20">
            <p className="text-sm text-accent">
              Für eine Namensänderung benötigen wir einen Nachweis (z.B. Heiratsurkunde, Personalausweis).
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Neuer Vorname</label>
              <Input
                placeholder="Vorname"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Neuer Nachname</label>
              <Input
                placeholder="Nachname"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Dokument hochladen</label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-accent/50 transition-colors">
                <input
                  type="file"
                  id="name-document"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setNameDocument(e.target.files?.[0] || null)}
                />
                <label htmlFor="name-document" className="cursor-pointer">
                  {nameDocument ? (
                    <div className="flex items-center justify-center gap-2 text-success">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{nameDocument.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="w-8 h-8" />
                      <span>Klicken zum Hochladen (PDF, JPG, PNG)</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={() => setView('menu')} className="flex-1 h-12 rounded-full">
                <ArrowLeft className="w-4 h-4" />
                Zurück
              </Button>
              <Button 
                variant="orange"
                onClick={handleNameSubmit}
                disabled={!newFirstName || !newLastName || !nameDocument}
                className="flex-1 h-12"
              >
                Absenden
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
