import { useState, useEffect, useRef } from 'react';
import { useOrder } from '@/context/OrderContext';
import { checkAddress, searchStreets, getHouseNumbers, ConnectionType, checkBuildingAvailability, searchCities } from '@/data/addressDatabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Rocket, Loader2, AlertCircle, CheckCircle2, AlertTriangle, ChevronDown, Building2 } from 'lucide-react';
import { ContactForm } from './ContactForm';
import { GNVCheck } from './GNVCheck';
import { cn } from '@/lib/utils';

interface AddressCheckProps {
  customerType?: 'pk' | 'kmu';
  onSwitchToKmu?: () => void; // Callback to switch to KMU order flow
}

export function AddressCheck({ customerType = 'pk', onSwitchToKmu }: AddressCheckProps) {
  const { setAddress, setStep, setConnectionType, address, gnvRequired, gnvData } = useOrder();
  const [city, setCity] = useState('Ingolstadt');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<'ftth' | 'limited' | 'not-connected' | 'not-found' | 'kmu-only' | null>(null);
  const [foundAddress, setFoundAddress] = useState<{ street: string; houseNumber: string; city: string } | null>(null);
  const [showLimitedContactForm, setShowLimitedContactForm] = useState(false);
  const [showGnvForm, setShowGnvForm] = useState(false);

  // Autocomplete states
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [streetSuggestions, setStreetSuggestions] = useState<string[]>([]);
  const [houseNumberSuggestions, setHouseNumberSuggestions] = useState<string[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showStreetDropdown, setShowStreetDropdown] = useState(false);
  const [showHouseNumberDropdown, setShowHouseNumberDropdown] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingStreets, setIsLoadingStreets] = useState(false);
  const [isLoadingHouseNumbers, setIsLoadingHouseNumbers] = useState(false);
  
  // Keyboard navigation states
  const [cityHighlightIndex, setCityHighlightIndex] = useState(-1);
  const [streetHighlightIndex, setStreetHighlightIndex] = useState(-1);
  const [houseNumberHighlightIndex, setHouseNumberHighlightIndex] = useState(-1);

  const cityInputRef = useRef<HTMLInputElement>(null);
  const streetInputRef = useRef<HTMLInputElement>(null);
  const houseNumberInputRef = useRef<HTMLInputElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const streetDropdownRef = useRef<HTMLDivElement>(null);
  const houseNumberDropdownRef = useRef<HTMLDivElement>(null);

  // Search cities when typing (min 2 chars)
  useEffect(() => {
    const searchCitiesAsync = async () => {
      if (city.length >= 2) {
        setIsLoadingCities(true);
        const results = await searchCities(city);
        setCitySuggestions(results);
        setShowCityDropdown(results.length > 0 && !results.some(r => r.toLowerCase() === city.toLowerCase()));
        setIsLoadingCities(false);
      } else {
        setCitySuggestions([]);
        setShowCityDropdown(false);
      }
    };

    const debounce = setTimeout(searchCitiesAsync, 200);
    return () => clearTimeout(debounce);
  }, [city]);

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
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node) &&
          !cityInputRef.current?.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
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

  const handleCitySelect = (selectedCity: string) => {
    setCity(selectedCity);
    setShowCityDropdown(false);
    setCityHighlightIndex(-1);
    setStreet('');
    setHouseNumber('');
    setResult(null);
    // Focus street input after selecting city
    setTimeout(() => streetInputRef.current?.focus(), 100);
  };

  const handleStreetSelect = (selectedStreet: string) => {
    setStreet(selectedStreet);
    setShowStreetDropdown(false);
    setStreetHighlightIndex(-1);
    setHouseNumber('');
    setResult(null);
    // Focus house number input after selecting street
    setTimeout(() => houseNumberInputRef.current?.focus(), 100);
  };

  const handleHouseNumberSelect = (selectedNumber: string) => {
    setHouseNumber(selectedNumber);
    setShowHouseNumberDropdown(false);
    setHouseNumberHighlightIndex(-1);
    // Don't reset result here - live check will trigger
  };

  // Track last checked address to prevent re-checking the same address
  const lastCheckedRef = useRef<string>('');

  // Live address check with debouncing
  useEffect(() => {
    // Only check if all fields are filled AND house number is in the database
    const isValidAddress = city && street && houseNumber && 
                          houseNumberSuggestions.length > 0 && 
                          houseNumberSuggestions.includes(houseNumber);
    
    if (!isValidAddress) {
      return;
    }

    // Create a unique key for this address combination
    const addressKey = `${city}-${street}-${houseNumber}-${customerType}`;
    
    // Don't re-check if we already checked this exact address
    if (lastCheckedRef.current === addressKey) {
      return;
    }

    // Debounce the check
    const debounceTimer = setTimeout(async () => {
      // Double-check the address key hasn't been checked yet
      if (lastCheckedRef.current === addressKey) {
        return;
      }
      
      lastCheckedRef.current = addressKey;
      setIsChecking(true);
      
      try {
        const found = await checkAddress(street, houseNumber, city, customerType);
        
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
          // If not found for this customer type, check if building exists with different availability
          if (customerType === 'pk') {
            const availability = await checkBuildingAvailability(street, houseNumber, city);
            if (availability.exists && !availability.pkAvailable && availability.kmuAvailable) {
              setResult('kmu-only');
              setFoundAddress({ street, houseNumber, city });
              return;
            }
          }
          setResult('not-found');
          setFoundAddress({ street, houseNumber, city });
        }
      } catch (error) {
        console.error('Error checking address:', error);
        setResult('not-found');
      } finally {
        setIsChecking(false);
      }
    }, 400);

    return () => clearTimeout(debounceTimer);
  }, [city, street, houseNumber, houseNumberSuggestions, customerType, setAddress]);

  // Reset last checked ref when address fields change
  useEffect(() => {
    const addressKey = `${city}-${street}-${houseNumber}-${customerType}`;
    if (lastCheckedRef.current !== addressKey) {
      setResult(null);
    }
  }, [city, street, houseNumber, customerType]);

  // Keyboard navigation for city dropdown
  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const filteredCities = citySuggestions.filter(s => 
      s.toLowerCase().startsWith(city.toLowerCase())
    );
    
    if (!showCityDropdown || filteredCities.length === 0) {
      if (e.key === 'ArrowDown' && filteredCities.length > 0) {
        setShowCityDropdown(true);
        setCityHighlightIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setCityHighlightIndex(prev => prev < filteredCities.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setCityHighlightIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (cityHighlightIndex >= 0 && cityHighlightIndex < filteredCities.length) {
          handleCitySelect(filteredCities[cityHighlightIndex]);
        }
        break;
      case 'Escape':
        setShowCityDropdown(false);
        setCityHighlightIndex(-1);
        break;
    }
  };

  // Keyboard navigation for street dropdown
  const handleStreetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showStreetDropdown || streetSuggestions.length === 0) {
      // Open dropdown on arrow down if there are suggestions
      if (e.key === 'ArrowDown' && streetSuggestions.length > 0) {
        setShowStreetDropdown(true);
        setStreetHighlightIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setStreetHighlightIndex(prev => 
          prev < streetSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setStreetHighlightIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (streetHighlightIndex >= 0 && streetHighlightIndex < streetSuggestions.length) {
          handleStreetSelect(streetSuggestions[streetHighlightIndex]);
        }
        break;
      case 'Escape':
        setShowStreetDropdown(false);
        setStreetHighlightIndex(-1);
        break;
    }
  };

  // Keyboard navigation for house number dropdown
  const handleHouseNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Get filtered suggestions for keyboard navigation
    const filteredSuggestions = houseNumberSuggestions.filter(suggestion => 
      !houseNumber || suggestion.toLowerCase().startsWith(houseNumber.toLowerCase())
    );

    if (!showHouseNumberDropdown || filteredSuggestions.length === 0) {
      // Open dropdown on arrow down if there are suggestions
      if (e.key === 'ArrowDown' && filteredSuggestions.length > 0) {
        setShowHouseNumberDropdown(true);
        setHouseNumberHighlightIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHouseNumberHighlightIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHouseNumberHighlightIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (houseNumberHighlightIndex >= 0 && houseNumberHighlightIndex < filteredSuggestions.length) {
          handleHouseNumberSelect(filteredSuggestions[houseNumberHighlightIndex]);
        }
        break;
      case 'Escape':
        setShowHouseNumberDropdown(false);
        setHouseNumberHighlightIndex(-1);
        break;
    }
  };

  // Manual check as fallback (for house numbers not in database)
  const handleManualCheck = async () => {
    setIsChecking(true);
    setResult(null);
    
    try {
      const found = await checkAddress(street, houseNumber, city, customerType);
      
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
        // If not found for this customer type, check if building exists with different availability
        if (customerType === 'pk') {
          const availability = await checkBuildingAvailability(street, houseNumber, city);
          if (availability.exists && !availability.pkAvailable && availability.kmuAvailable) {
            setResult('kmu-only');
            setFoundAddress({ street, houseNumber, city });
            return;
          }
        }
        setResult('not-found');
        setFoundAddress({ street, houseNumber, city });
      }
    } catch (error) {
      console.error('Error checking address:', error);
      setResult('not-found');
    } finally {
      setIsChecking(false);
    }
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
        <div className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-6 flex items-center justify-center">
          <Rocket className="w-16 h-16 md:w-20 md:h-20 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-3">
          Jetzt Verfügbarkeit prüfen
        </h1>
        <p className="text-accent font-medium text-lg">
          ...und gigaschnell lossurfen mit unseren neuen <span className="font-bold">{customerType === 'kmu' ? 'easy business' : 'einfach Internet'}</span> Produkten!
        </p>
      </div>

      {/* Formular */}
      <div className="bg-card rounded-2xl shadow-card p-6 md:p-8">
        <p className="text-center text-foreground mb-6 font-medium">
          Geben Sie Ihre Straße und Ihre Hausnummer an, damit wir prüfen können, welche Produkte an Ihrem Standort verfügbar sind.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Stadt mit Autocomplete */}
          <div className="relative">
            <div className="relative">
              <Input
                ref={cityInputRef}
                placeholder="Stadt"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setStreet('');
                  setHouseNumber('');
                  setResult(null);
                  setCityHighlightIndex(-1);
                }}
                onFocus={() => {
                  if (citySuggestions.length > 0 && !citySuggestions.some(s => s.toLowerCase() === city.toLowerCase())) {
                    setShowCityDropdown(true);
                  }
                }}
                onKeyDown={handleCityKeyDown}
                className={cn(
                  "h-12 rounded-full bg-background border-border text-center pr-10",
                  isLoadingCities && "pr-10"
                )}
              />
              {isLoadingCities && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
              )}
              {!isLoadingCities && citySuggestions.length > 0 && (
                <ChevronDown 
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground cursor-pointer"
                  onClick={() => setShowCityDropdown(!showCityDropdown)}
                />
              )}
            </div>
            
            {showCityDropdown && citySuggestions.length > 0 && (
              <div 
                ref={cityDropdownRef}
                className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-auto"
              >
                {citySuggestions
                  .filter(suggestion => suggestion.toLowerCase().startsWith(city.toLowerCase()))
                  .map((suggestion, index) => (
                    <button
                      key={index}
                      className={cn(
                        "w-full px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl",
                        index === cityHighlightIndex 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-accent/10"
                      )}
                      onClick={() => handleCitySelect(suggestion)}
                      onMouseEnter={() => setCityHighlightIndex(index)}
                    >
                      {suggestion}
                    </button>
                  ))}
              </div>
            )}
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
                  setStreetHighlightIndex(-1);
                }}
                onFocus={() => {
                  if (streetSuggestions.length > 0) {
                    setShowStreetDropdown(true);
                  }
                }}
                onKeyDown={handleStreetKeyDown}
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
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl",
                      index === streetHighlightIndex 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-accent/10"
                    )}
                    onClick={() => handleStreetSelect(suggestion)}
                    onMouseEnter={() => setStreetHighlightIndex(index)}
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
                  setHouseNumberHighlightIndex(-1);
                }}
                onFocus={() => {
                  if (houseNumberSuggestions.length > 0) {
                    setShowHouseNumberDropdown(true);
                  }
                }}
                onKeyDown={handleHouseNumberKeyDown}
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
                {houseNumberSuggestions
                  .filter(suggestion => 
                    !houseNumber || suggestion.toLowerCase().startsWith(houseNumber.toLowerCase())
                  )
                  .map((suggestion, index) => (
                    <button
                      key={index}
                      className={cn(
                        "w-full px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl",
                        index === houseNumberHighlightIndex 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-accent/10"
                      )}
                      onClick={() => handleHouseNumberSelect(suggestion)}
                      onMouseEnter={() => setHouseNumberHighlightIndex(index)}
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

        {/* Loading indicator during live check */}
        {isChecking && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>Prüfe Verfügbarkeit...</span>
            </div>
          </div>
        )}

        {/* Manual check button - only show if house number is NOT in database but fields are filled */}
        {!isChecking && street && houseNumber && city && !isHouseNumberInDatabase && houseNumberSuggestions.length > 0 && (
          <div className="flex justify-end">
            <Button 
              onClick={handleManualCheck} 
              variant="orange"
              size="lg"
              className="px-10"
            >
              Trotzdem prüfen
            </Button>
          </div>
        )}

        {/* Hinweis wenn Hausnummer nicht in der Liste - zeigt Kontaktformular nur wenn kein anderes result aktiv */}
        {houseNumber && !isHouseNumberInDatabase && houseNumberSuggestions.length > 0 && !result && (
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
        {result === 'ftth' && !showGnvForm && (
          <div className="animate-scale-in mt-6 p-5 bg-success/10 border border-success/20 rounded-xl">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-success text-lg">Glasfaser verfügbar!</h4>
                <p className="text-muted-foreground mt-1">
                  An Ihrer Adresse sind alle unsere {customerType === 'kmu' ? 'easy business' : 'einfach Internet'} Produkte verfügbar. Wählen Sie jetzt Ihren Wunschtarif.
                </p>
                <Button 
                  onClick={() => {
                    // Check if GNV is required for this address
                    if (gnvRequired() && !gnvData?.required) {
                      setShowGnvForm(true);
                    } else {
                      handleContinue();
                    }
                  }} 
                  variant="success" 
                  className="mt-4"
                >
                  Weiter zur Produktauswahl
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* GNV Form - shown when FTTH but no GNV exists */}
        {result === 'ftth' && showGnvForm && (
          <div className="animate-scale-in mt-6">
            <GNVCheck />
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

        {/* KMU only - Building exists but only business tariffs available */}
        {result === 'kmu-only' && (
          <div className="animate-scale-in mt-6 space-y-4">
            <div className="p-5 bg-primary/10 border border-primary/20 rounded-xl">
              <div className="flex items-start gap-4">
                <Building2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-primary text-lg">Nur Geschäftskunden-Anschlüsse verfügbar</h4>
                  <p className="text-muted-foreground mt-1">
                    An dieser Adresse bieten wir ausschließlich Geschäftskunden-Anschlüsse an. 
                    Unsere <strong>easy business</strong> Produkte stehen Ihnen in der Bestellstrecke für Geschäftskunden zur Verfügung.
                  </p>
                  {onSwitchToKmu ? (
                    <Button 
                      onClick={() => {
                        console.log('Switch to KMU clicked');
                        onSwitchToKmu();
                      }} 
                      variant="default" 
                      className="mt-4"
                      type="button"
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Zur Geschäftskunden-Bestellung
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">
                      Bitte wählen Sie auf der Startseite "Geschäftskunde" aus.
                    </p>
                  )}
                </div>
              </div>
            </div>
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
