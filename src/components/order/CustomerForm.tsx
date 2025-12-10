import { useState } from 'react';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { User, ArrowRight, ArrowLeft, CalendarIcon, CreditCard, Clock, Building } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function CustomerForm() {
  const { 
    setCustomerData, 
    setBankData, 
    setPreferredDate, 
    setPreferredDateType, 
    setApartmentData,
    setCancelPreviousProvider,
    cancelPreviousProvider,
    isMFH,
    setStep 
  } = useOrder();
  
  const [formData, setFormData] = useState({
    salutation: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
  });

  const [bankData, setBankDataLocal] = useState({
    accountHolder: '',
    iban: '',
  });

  const [apartmentLocal, setApartmentLocal] = useState({
    floor: '',
    apartment: '',
  });

  const [dateType, setDateType] = useState<'asap' | 'specific' | ''>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const isMFHBuilding = isMFH();

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBankChange = (field: string, value: string) => {
    setBankDataLocal(prev => ({ ...prev, [field]: value }));
  };

  const handleApartmentChange = (field: string, value: string) => {
    setApartmentLocal(prev => ({ ...prev, [field]: value }));
  };

  // Format IBAN with spaces
  const formatIban = (value: string) => {
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 27); // Max IBAN length with spaces for DE
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone: string) => {
    return phone.replace(/\s/g, '').length >= 6;
  };

  const isApartmentValid = !isMFHBuilding || (apartmentLocal.floor && apartmentLocal.apartment);

  const isValid = formData.salutation && 
                  formData.firstName && 
                  formData.lastName && 
                  formData.email && 
                  isValidEmail(formData.email) &&
                  formData.phone && 
                  isValidPhone(formData.phone) &&
                  formData.birthDate &&
                  bankData.accountHolder &&
                  bankData.iban.replace(/\s/g, '').length >= 22 &&
                  dateType !== '' &&
                  (dateType === 'asap' || (dateType === 'specific' && selectedDate)) &&
                  isApartmentValid;

  const handleContinue = () => {
    if (isValid) {
      setCustomerData(formData);
      setBankData(bankData);
      setPreferredDateType(dateType as 'asap' | 'specific');
      if (dateType === 'specific' && selectedDate) {
        setPreferredDate(format(selectedDate, 'yyyy-MM-dd'));
      } else {
        setPreferredDate(null);
      }
      if (isMFHBuilding && apartmentLocal.floor && apartmentLocal.apartment) {
        setApartmentData(apartmentLocal);
      }
      setStep(4);
    }
  };

  // Minimum date is 14 days from now
  const minDate = addDays(new Date(), 14);

  // Floor options (EG, 1-10)
  const floorOptions = ['EG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  return (
    <div className="max-w-xl mx-auto animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
          <User className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-bold text-primary">Ihre persönlichen Daten</h2>
        <p className="text-muted-foreground mt-1">
          Für Ihren Vertrag benötigen wir folgende Angaben
        </p>
      </div>

      <div className="bg-card rounded-2xl shadow-card p-6 md:p-8 space-y-6">
        {/* Wohnungslage - nur bei MFH */}
        {isMFHBuilding && (
          <div className="space-y-5">
            <h3 className="font-semibold text-primary flex items-center gap-2">
              <Building className="w-5 h-5" />
              Wohnungslage (Mehrfamilienhaus) *
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="floor" className="text-foreground font-medium">Stockwerk *</Label>
                <Select onValueChange={(value) => handleApartmentChange('floor', value)}>
                  <SelectTrigger className="mt-1.5 h-12 rounded-xl">
                    <SelectValue placeholder="Stockwerk wählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border z-50">
                    {floorOptions.map(floor => (
                      <SelectItem key={floor} value={floor}>
                        {floor === 'EG' ? 'Erdgeschoss' : `${floor}. OG`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="apartment" className="text-foreground font-medium">Wohnung *</Label>
                <Input
                  id="apartment"
                  placeholder="z.B. links, 2a, 12"
                  value={apartmentLocal.apartment}
                  onChange={(e) => handleApartmentChange('apartment', e.target.value)}
                  className="mt-1.5 h-12 rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* Persönliche Daten */}
        <div className={cn("space-y-5", isMFHBuilding && "pt-4 border-t border-border")}>
          <h3 className="font-semibold text-primary flex items-center gap-2">
            <User className="w-5 h-5" />
            Persönliche Daten
          </h3>

          <div>
            <Label htmlFor="salutation" className="text-foreground font-medium">Anrede *</Label>
            <Select onValueChange={(value) => handleChange('salutation', value)}>
              <SelectTrigger className="mt-1.5 h-12 rounded-xl">
                <SelectValue placeholder="Bitte wählen" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border z-50">
                <SelectItem value="herr">Herr</SelectItem>
                <SelectItem value="frau">Frau</SelectItem>
                <SelectItem value="divers">Divers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="text-foreground font-medium">Vorname *</Label>
              <Input
                id="firstName"
                placeholder="Max"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className="mt-1.5 h-12 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-foreground font-medium">Nachname *</Label>
              <Input
                id="lastName"
                placeholder="Mustermann"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className="mt-1.5 h-12 rounded-xl"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="birthDate" className="text-foreground font-medium">Geburtsdatum *</Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleChange('birthDate', e.target.value)}
              className="mt-1.5 h-12 rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-foreground font-medium">E-Mail-Adresse *</Label>
            <Input
              id="email"
              type="email"
              placeholder="max.mustermann@email.de"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={cn(
                "mt-1.5 h-12 rounded-xl",
                formData.email && !isValidEmail(formData.email) && "border-destructive"
              )}
            />
            {formData.email && !isValidEmail(formData.email) && (
              <p className="text-sm text-destructive mt-1">Bitte geben Sie eine gültige E-Mail-Adresse ein</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone" className="text-foreground font-medium">Telefonnummer *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+49 841 12345"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={cn(
                "mt-1.5 h-12 rounded-xl",
                formData.phone && !isValidPhone(formData.phone) && "border-destructive"
              )}
            />
            {formData.phone && !isValidPhone(formData.phone) && (
              <p className="text-sm text-destructive mt-1">Bitte geben Sie eine gültige Telefonnummer ein</p>
            )}
          </div>
        </div>

        {/* Bankdaten */}
        <div className="space-y-5 pt-4 border-t border-border">
          <h3 className="font-semibold text-primary flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Bankverbindung (SEPA-Lastschrift)
          </h3>

          <div>
            <Label htmlFor="accountHolder" className="text-foreground font-medium">Kontoinhaber *</Label>
            <Input
              id="accountHolder"
              placeholder="Max Mustermann"
              value={bankData.accountHolder}
              onChange={(e) => handleBankChange('accountHolder', e.target.value)}
              className="mt-1.5 h-12 rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="iban" className="text-foreground font-medium">IBAN *</Label>
            <Input
              id="iban"
              placeholder="DE89 3704 0044 0532 0130 00"
              value={bankData.iban}
              onChange={(e) => handleBankChange('iban', formatIban(e.target.value))}
              className="mt-1.5 h-12 rounded-xl font-mono"
            />
          </div>
        </div>

        {/* Wunschtermin */}
        <div className="space-y-5 pt-4 border-t border-border">
          <h3 className="font-semibold text-primary flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Gewünschter Anschalttermin *
          </h3>

          <RadioGroup 
            value={dateType} 
            onValueChange={(value) => {
              setDateType(value as 'asap' | 'specific');
              if (value === 'asap') {
                setSelectedDate(undefined);
              }
            }}
            className="space-y-3"
          >
            <div className={cn(
              "flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
              dateType === 'asap' ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
            )}>
              <RadioGroupItem value="asap" id="asap" />
              <Label htmlFor="asap" className="flex-1 cursor-pointer">
                <span className="font-semibold">Schnellstmöglich</span>
                <span className="block text-sm text-muted-foreground">Wir melden uns zur Terminvereinbarung</span>
              </Label>
            </div>

            <div className={cn(
              "flex items-start space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
              dateType === 'specific' ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
            )}>
              <RadioGroupItem value="specific" id="specific" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="specific" className="cursor-pointer">
                  <span className="font-semibold">Wunschtermin wählen</span>
                  <span className="block text-sm text-muted-foreground mb-3">Frühestens in 14 Tagen</span>
                </Label>
                
                {dateType === 'specific' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-12 rounded-xl",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: de }) : "Datum wählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border border-border z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < minDate}
                        initialFocus
                        className="pointer-events-auto"
                        locale={de}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </RadioGroup>

          {/* Bisherigen Anbieter kündigen */}
          <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-xl">
            <Checkbox 
              id="cancel-provider" 
              checked={cancelPreviousProvider}
              onCheckedChange={(checked) => setCancelPreviousProvider(checked === true)}
            />
            <Label htmlFor="cancel-provider" className="cursor-pointer flex-1">
              <span className="font-medium">Bisherigen Anbieter kündigen</span>
              <span className="block text-sm text-muted-foreground">
                COM-IN soll die Kündigung meines bisherigen Anbieters übernehmen
              </span>
            </Label>
          </div>
        </div>

        {/* Pflichtfeld Hinweis */}
        <p className="text-sm text-muted-foreground">* Pflichtfeld</p>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <Button 
            variant="outline" 
            onClick={() => setStep(2)}
            className="flex-1 h-12 rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!isValid}
            className="flex-1 h-12"
            variant="orange"
          >
            Weiter zur Übersicht
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}