import { useState, useEffect } from 'react';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { User, ArrowRight, ArrowLeft, CalendarIcon, CreditCard, Clock, Building, Phone, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { InfoTooltip } from '@/components/ui/info-tooltip';

export function CustomerForm() {
  const { 
    setCustomerData, 
    setBankData, 
    setPreferredDate, 
    setPreferredDateType, 
    setApartmentData,
    setCancelPreviousProvider,
    setProviderCancellationData,
    setExpressActivation,
    cancelPreviousProvider,
    providerCancellationData,
    expressActivation,
    expressOption,
    connectionType,
    isMFH,
    setStep,
    phoneSelection,
    customerType,
    alternateBillingAddress,
    setAlternateBillingAddress,
    alternatePaymentPerson,
    setAlternatePaymentPerson,
    address,
  } = useOrder();
  
  const [expressOptionFromDb, setExpressOptionFromDb] = useState<{
    id: string;
    slug: string;
    name: string;
    description: string;
    oneTimePrice: number;
    infoText?: string;
  } | null>(null);
  const [loadingExpressOption, setLoadingExpressOption] = useState(true);
  
  // Load porting providers from database
  const [portingProviders, setPortingProviders] = useState<Array<{
    id: string;
    name: string;
    display_name: string;
    provider_code: string | null;
    is_other: boolean;
  }>>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [customProviderName, setCustomProviderName] = useState<string>('');
  
  // Load express option and porting providers from database
  useEffect(() => {
    const fetchExpressOption = async () => {
      try {
        const { data, error } = await supabase
          .from('product_options')
          .select('id, slug, name, description, one_time_price, info_text')
          .eq('category', 'express')
          .eq('is_active', true)
          .single();
        
        if (!error && data) {
          setExpressOptionFromDb({
            id: data.id,
            slug: data.slug,
            name: data.name,
            description: data.description || '',
            oneTimePrice: data.one_time_price || 0,
            infoText: data.info_text || undefined,
          });
        }
      } catch (err) {
        console.error('Error loading express option:', err);
      } finally {
        setLoadingExpressOption(false);
      }
    };
    
    const fetchPortingProviders = async () => {
      try {
        const { data, error } = await supabase
          .from('phone_porting_providers')
          .select('id, name, display_name, provider_code, is_other')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        
        if (!error && data) {
          setPortingProviders(data);
        }
      } catch (err) {
        console.error('Error loading porting providers:', err);
      } finally {
        setLoadingProviders(false);
      }
    };
    
    fetchExpressOption();
    fetchPortingProviders();
  }, []);
  
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

  // Initialize cancellation data with porting data if available
  const [cancellationData, setCancellationData] = useState(() => {
    const portingData = phoneSelection.portingData;
    return {
      providerName: portingData?.previousProvider || '',
      customerNumber: portingData?.phoneNumbers?.[0] || '',
      connectionHolder: portingData?.connectionHolder || '',
      connectionAddress: portingData?.connectionAddress || '',
      portToNewConnection: portingData?.portingType === 'cancel_and_port' ? true : false,
      preferredDate: null as 'asap' | 'specific' | null,
      specificDate: null as string | null,
    };
  });

  // Sync cancellation data when porting data changes
  useEffect(() => {
    if (phoneSelection.portingRequired && phoneSelection.portingData) {
      const portingData = phoneSelection.portingData;
      // If no different holder/address specified in porting, use order address
      const orderAddress = address ? `${address.street} ${address.houseNumber}` : '';
      
      setCancellationData(prev => ({
        ...prev,
        providerName: portingData.previousProvider || prev.providerName,
        customerNumber: portingData.phoneNumbers?.[0] || prev.customerNumber,
        // Use porting data if provided, otherwise use order address (connection holder will be set by form data)
        connectionHolder: portingData.connectionHolder || prev.connectionHolder,
        connectionAddress: portingData.connectionAddress || orderAddress || prev.connectionAddress,
        portToNewConnection: portingData.portingType === 'cancel_and_port',
      }));
      // Automatically enable cancel previous provider if porting is requested with cancel_and_port
      if (portingData.portingType === 'cancel_and_port' && !cancelPreviousProvider) {
        setCancelPreviousProvider(true);
      }
    }
  }, [phoneSelection.portingRequired, phoneSelection.portingData, cancelPreviousProvider, setCancelPreviousProvider, address]);

  // Sync selectedProviderId when porting providers are loaded and porting data exists
  useEffect(() => {
    if (portingProviders.length > 0 && phoneSelection.portingData?.previousProvider) {
      const providerName = phoneSelection.portingData.previousProvider;
      // Find provider by display_name (case-insensitive match)
      const matchedProvider = portingProviders.find(
        p => p.display_name.toLowerCase() === providerName.toLowerCase()
      );
      if (matchedProvider && !matchedProvider.is_other) {
        setSelectedProviderId(matchedProvider.id);
      } else if (providerName) {
        // Provider not in list - select "Sonstige" option and set custom name
        const otherProvider = portingProviders.find(p => p.is_other);
        if (otherProvider) {
          setSelectedProviderId(otherProvider.id);
          setCustomProviderName(providerName);
        }
      }
    }
  }, [portingProviders, phoneSelection.portingData?.previousProvider]);

  // Auto-fill connectionHolder and connectionAddress when cancel provider is enabled and fields are empty
  useEffect(() => {
    if (cancelPreviousProvider) {
      setCancellationData(prev => {
        const updates: Partial<typeof prev> = {};
        
        // Auto-fill connectionHolder with customer name if empty
        if (!prev.connectionHolder && formData.firstName && formData.lastName) {
          updates.connectionHolder = `${formData.firstName} ${formData.lastName}`;
        }
        
        // Auto-fill connectionAddress with order address if empty
        if (!prev.connectionAddress && address) {
          updates.connectionAddress = `${address.street} ${address.houseNumber}`;
        }
        
        if (Object.keys(updates).length > 0) {
          return { ...prev, ...updates };
        }
        return prev;
      });
    }
  }, [cancelPreviousProvider, formData.firstName, formData.lastName, address]);

  const [dateType, setDateType] = useState<'asap' | 'specific' | ''>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [cancellationDate, setCancellationDate] = useState<Date | undefined>(undefined);

  const isMFHBuilding = isMFH();
  // Express only available for PK customers with ftth or limited connection
  const canHaveExpress = customerType === 'pk' && (connectionType === 'ftth' || connectionType === 'limited');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBankChange = (field: string, value: string) => {
    setBankDataLocal(prev => ({ ...prev, [field]: value }));
  };

  const handleApartmentChange = (field: string, value: string) => {
    setApartmentLocal(prev => ({ ...prev, [field]: value }));
  };

  const handleCancellationChange = (field: string, value: any) => {
    setCancellationData(prev => ({ ...prev, [field]: value }));
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

  const isAtLeast18 = (birthDate: string) => {
    if (!birthDate) return false;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 18;
  };

  const isValidPhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    // Must start with 0 and contain /
    return cleaned.startsWith('0') && cleaned.includes('/') && cleaned.length >= 6;
  };

  const isApartmentValid = !isMFHBuilding || (apartmentLocal.floor && apartmentLocal.apartment);

  // Cancellation validation - need all required fields
  const isCancellationValid = !cancelPreviousProvider || (
    cancellationData.providerName.trim() !== '' &&
    cancellationData.customerNumber.trim() !== '' &&
    cancellationData.connectionHolder.trim() !== '' &&
    cancellationData.connectionAddress.trim() !== '' &&
    (cancellationData.portToNewConnection || cancellationData.preferredDate !== null) &&
    (cancellationData.preferredDate !== 'specific' || cancellationData.specificDate !== null)
  );

  // Bei nahtlosem Übergang ist kein separater Termin nötig
  const isDateValid = cancelPreviousProvider && cancellationData.portToNewConnection 
    ? true  // Portierung bestimmt den Termin
    : (dateType === 'asap' || (dateType === 'specific' && selectedDate));

  const isValid = formData.salutation && 
                  formData.firstName && 
                  formData.lastName && 
                  formData.email && 
                  isValidEmail(formData.email) &&
                  formData.phone && 
                  isValidPhone(formData.phone) &&
                  formData.birthDate &&
                  isAtLeast18(formData.birthDate) &&
                  bankData.accountHolder &&
                  bankData.iban.replace(/\s/g, '').length >= 22 &&
                  isDateValid &&
                  isApartmentValid &&
                  isCancellationValid;

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
      if (cancelPreviousProvider) {
        setProviderCancellationData({
          providerName: cancellationData.providerName,
          customerNumber: cancellationData.customerNumber,
          connectionHolder: cancellationData.connectionHolder,
          connectionAddress: cancellationData.connectionAddress,
          portToNewConnection: cancellationData.portToNewConnection,
          preferredDate: cancellationData.portToNewConnection ? null : cancellationData.preferredDate,
          specificDate: cancellationData.portToNewConnection ? null : cancellationData.specificDate,
        });
      }
      setStep(4);
    }
  };

  // Minimum date is 2 weeks from now (14 days lead time)
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
              className={cn(
                "mt-1.5 h-12 rounded-xl",
                formData.birthDate && !isAtLeast18(formData.birthDate) && "border-destructive"
              )}
            />
            {formData.birthDate && !isAtLeast18(formData.birthDate) && (
              <p className="text-sm text-destructive mt-1">Sie müssen mindestens 18 Jahre alt sein</p>
            )}
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
              placeholder="0841/12345"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={cn(
                "mt-1.5 h-12 rounded-xl",
                formData.phone && !isValidPhone(formData.phone) && "border-destructive"
              )}
            />
            {formData.phone && !isValidPhone(formData.phone) && (
              <p className="text-sm text-destructive mt-1">Telefonnummer muss mit 0 beginnen und / enthalten (z.B. 0841/12345)</p>
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
          
          {/* Abweichender Beitragszahler */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="alternate-payment-person" 
                checked={alternatePaymentPerson.enabled}
                onCheckedChange={(checked) => setAlternatePaymentPerson({
                  ...alternatePaymentPerson,
                  enabled: checked === true,
                })}
              />
              <Label htmlFor="alternate-payment-person" className="cursor-pointer font-medium">
                Abweichender Beitragszahler
              </Label>
            </div>
            
            {alternatePaymentPerson.enabled && (
              <div className="ml-6 p-4 bg-muted/30 rounded-xl space-y-4">
                <div>
                  <Label className="text-foreground font-medium">Anrede *</Label>
                  <Select 
                    value={alternatePaymentPerson.salutation} 
                    onValueChange={(value) => setAlternatePaymentPerson({
                      ...alternatePaymentPerson,
                      salutation: value,
                    })}
                  >
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
                    <Label className="text-foreground font-medium">Vorname *</Label>
                    <Input
                      placeholder="Max"
                      value={alternatePaymentPerson.firstName}
                      onChange={(e) => setAlternatePaymentPerson({
                        ...alternatePaymentPerson,
                        firstName: e.target.value,
                      })}
                      className="mt-1.5 h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground font-medium">Nachname *</Label>
                    <Input
                      placeholder="Mustermann"
                      value={alternatePaymentPerson.lastName}
                      onChange={(e) => setAlternatePaymentPerson({
                        ...alternatePaymentPerson,
                        lastName: e.target.value,
                      })}
                      className="mt-1.5 h-12 rounded-xl"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-foreground font-medium">Geburtsdatum *</Label>
                  <Input
                    type="date"
                    value={alternatePaymentPerson.birthDate}
                    onChange={(e) => setAlternatePaymentPerson({
                      ...alternatePaymentPerson,
                      birthDate: e.target.value,
                    })}
                    className="mt-1.5 h-12 rounded-xl"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground font-medium">E-Mail *</Label>
                    <Input
                      type="email"
                      placeholder="email@beispiel.de"
                      value={alternatePaymentPerson.email}
                      onChange={(e) => setAlternatePaymentPerson({
                        ...alternatePaymentPerson,
                        email: e.target.value,
                      })}
                      className="mt-1.5 h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground font-medium">Telefon *</Label>
                    <Input
                      type="tel"
                      placeholder="0841/12345"
                      value={alternatePaymentPerson.phone}
                      onChange={(e) => setAlternatePaymentPerson({
                        ...alternatePaymentPerson,
                        phone: e.target.value,
                      })}
                      className="mt-1.5 h-12 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Abweichende Rechnungsadresse */}
        <div className="space-y-5 pt-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <Checkbox 
              id="alternate-billing-address" 
              checked={alternateBillingAddress.enabled}
              onCheckedChange={(checked) => setAlternateBillingAddress({
                ...alternateBillingAddress,
                enabled: checked === true,
              })}
            />
            <Label htmlFor="alternate-billing-address" className="cursor-pointer font-semibold text-primary">
              Abweichende Rechnungsadresse
            </Label>
          </div>
          
          {alternateBillingAddress.enabled && (
            <div className="ml-6 p-4 bg-muted/30 rounded-xl space-y-4">
              <div>
                <Label className="text-foreground font-medium">Anrede *</Label>
                <Select 
                  value={alternateBillingAddress.salutation} 
                  onValueChange={(value) => setAlternateBillingAddress({
                    ...alternateBillingAddress,
                    salutation: value,
                  })}
                >
                  <SelectTrigger className="mt-1.5 h-12 rounded-xl">
                    <SelectValue placeholder="Bitte wählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border z-50">
                    <SelectItem value="herr">Herr</SelectItem>
                    <SelectItem value="frau">Frau</SelectItem>
                    <SelectItem value="divers">Divers</SelectItem>
                    <SelectItem value="firma">Firma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground font-medium">Vorname *</Label>
                  <Input
                    placeholder="Max"
                    value={alternateBillingAddress.firstName}
                    onChange={(e) => setAlternateBillingAddress({
                      ...alternateBillingAddress,
                      firstName: e.target.value,
                    })}
                    className="mt-1.5 h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-foreground font-medium">Nachname *</Label>
                  <Input
                    placeholder="Mustermann"
                    value={alternateBillingAddress.lastName}
                    onChange={(e) => setAlternateBillingAddress({
                      ...alternateBillingAddress,
                      lastName: e.target.value,
                    })}
                    className="mt-1.5 h-12 rounded-xl"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-foreground font-medium">Firma (optional)</Label>
                <Input
                  placeholder="Firmenname"
                  value={alternateBillingAddress.company || ''}
                  onChange={(e) => setAlternateBillingAddress({
                    ...alternateBillingAddress,
                    company: e.target.value,
                  })}
                  className="mt-1.5 h-12 rounded-xl"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label className="text-foreground font-medium">Straße *</Label>
                  <Input
                    placeholder="Musterstraße"
                    value={alternateBillingAddress.street}
                    onChange={(e) => setAlternateBillingAddress({
                      ...alternateBillingAddress,
                      street: e.target.value,
                    })}
                    className="mt-1.5 h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-foreground font-medium">Hausnr. *</Label>
                  <Input
                    placeholder="1a"
                    value={alternateBillingAddress.houseNumber}
                    onChange={(e) => setAlternateBillingAddress({
                      ...alternateBillingAddress,
                      houseNumber: e.target.value,
                    })}
                    className="mt-1.5 h-12 rounded-xl"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-foreground font-medium">PLZ *</Label>
                  <Input
                    placeholder="12345"
                    value={alternateBillingAddress.postalCode}
                    onChange={(e) => setAlternateBillingAddress({
                      ...alternateBillingAddress,
                      postalCode: e.target.value,
                    })}
                    className="mt-1.5 h-12 rounded-xl"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-foreground font-medium">Ort *</Label>
                  <Input
                    placeholder="Musterstadt"
                    value={alternateBillingAddress.city}
                    onChange={(e) => setAlternateBillingAddress({
                      ...alternateBillingAddress,
                      city: e.target.value,
                    })}
                    className="mt-1.5 h-12 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}
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
              } else {
                // Bei Wunschtermin: Express deaktivieren
                setExpressActivation(false);
              }

              // Wechselzeitpunkt immer mit dem oberen Termin matchen,
              // sobald ein konkreter Anschalttermin gewählt wird
              if (cancelPreviousProvider) {
                // Expliziter Termin bedeutet: keine Portierungssteuerung mehr
                handleCancellationChange('portToNewConnection', false);
                handleCancellationChange('preferredDate', value);
                if (value === 'asap') {
                  handleCancellationChange('specificDate', null);
                }
              }
            }}
            className="space-y-3"
          >
            {/* Schnellstmöglich mit Express als Unteroption */}
            <div className={cn(
              "rounded-xl border-2 transition-all",
              dateType === 'asap' ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
            )}>
              <div className="p-4 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="asap" id="asap" />
                  <Label htmlFor="asap" className="flex-1 cursor-pointer">
                    <span className="font-semibold">Schnellstmöglich</span>
                    <span className="block text-sm text-muted-foreground">Wir melden uns zur Terminvereinbarung</span>
                  </Label>
                </div>
              </div>
              
              {dateType === 'asap' && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="ml-6 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Bitte beachten Sie: Unsere Anschaltzeiten betragen aktuell ca. 2-3 Wochen.
                    </p>
                  </div>
                  
                  {/* Express-Anschaltung als Unterpunkt - aus DB geladen */}
                  {canHaveExpress && expressOptionFromDb && (
                    <div className={cn(
                      "ml-6 p-4 rounded-xl border-2 transition-all",
                      expressActivation ? "border-accent bg-accent/10" : "border-dashed border-accent/40 hover:border-accent/60"
                    )}>
                      <div className="flex items-start space-x-3">
                        <Checkbox 
                          id="express-activation" 
                          checked={expressActivation}
                          onCheckedChange={(checked) => {
                            const isChecked = checked === true;
                            setExpressActivation(isChecked, isChecked ? expressOptionFromDb : null);
                          }}
                        />
                        <Label htmlFor="express-activation" className="cursor-pointer flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Zap className="w-4 h-4 text-accent" />
                            <span className="font-semibold text-accent">2-3 Wochen sind Ihnen zu lange?</span>
                            {expressOptionFromDb.infoText && (
                              <InfoTooltip text={expressOptionFromDb.infoText} />
                            )}
                          </div>
                          <span className="block text-sm font-medium mt-1">
                            {expressOptionFromDb.name}: {expressOptionFromDb.description}
                          </span>
                          <span className="inline-block mt-2 bg-accent text-accent-foreground text-xs px-3 py-1 rounded-full font-medium">
                            +{expressOptionFromDb.oneTimePrice.toFixed(2).replace('.', ',')} € einmalig
                          </span>
                        </Label>
                      </div>
                    </div>
                  )}
                  
                  {/* Loading state */}
                  {canHaveExpress && loadingExpressOption && (
                    <div className="ml-6 p-4 rounded-xl border-2 border-dashed border-border">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Express-Option wird geladen...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Wunschtermin */}
            <div className={cn(
              "p-4 rounded-xl border-2 transition-all cursor-pointer",
              dateType === 'specific' ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
            )}>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="specific" id="specific" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="specific" className="cursor-pointer">
                    <span className="font-semibold">Wunschtermin wählen</span>
                  </Label>
                  
                  {dateType === 'specific' && (
                    <>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-12 rounded-xl mt-3",
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
                            onSelect={(date) => {
                              setSelectedDate(date);
                              // Synchronisiere mit Wechselservice
                              if (cancelPreviousProvider && !cancellationData.portToNewConnection && date) {
                                handleCancellationChange('preferredDate', 'specific');
                                handleCancellationChange('specificDate', format(date, 'yyyy-MM-dd'));
                                setCancellationDate(date);
                              }
                            }}
                            disabled={(date) => date < minDate}
                            initialFocus
                            className="pointer-events-auto"
                            locale={de}
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="mt-2 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          Bitte beachten Sie: Es handelt sich um einen unverbindlichen Wunschtermin. 
                          Unsere Anschaltzeiten betragen aktuell ca. 2-3 Wochen.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </RadioGroup>

          {/* Bisherigen Anbieter kündigen */}
          <div className="space-y-4">
            <div className={cn(
              "flex items-start space-x-3 p-4 rounded-xl border-2 transition-all",
              cancelPreviousProvider ? "border-accent bg-accent/5" : "border-border"
            )}>
              <Checkbox 
                id="cancel-provider" 
                checked={cancelPreviousProvider}
                onCheckedChange={(checked) => setCancelPreviousProvider(checked === true)}
              />
              <Label htmlFor="cancel-provider" className="cursor-pointer flex-1">
                <span className="font-medium">Wechselservice: Bisherigen Anbieter kündigen</span>
                <span className="block text-sm text-muted-foreground">
                  COM-IN übernimmt die Kündigung Ihres bisherigen Anbieters
                </span>
              </Label>
            </div>

            {/* Cancellation Details */}
            {cancelPreviousProvider && (
              <div className="ml-6 space-y-4 p-4 bg-muted/30 rounded-xl">
                {/* Info when data comes from porting form */}
                {phoneSelection.portingRequired && phoneSelection.portingData && (
                  <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                    <p className="text-sm text-accent flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Daten aus der Rufnummernportierung übernommen
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground font-medium">Anschlussinhaber *</Label>
                    <Input
                      placeholder="Name des bisherigen Anschlussinhabers"
                      value={cancellationData.connectionHolder}
                      onChange={(e) => handleCancellationChange('connectionHolder', e.target.value)}
                      className="mt-1.5 h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground font-medium">Anschlussadresse *</Label>
                    <Input
                      placeholder="Adresse des bisherigen Anschlusses"
                      value={cancellationData.connectionAddress}
                      onChange={(e) => handleCancellationChange('connectionAddress', e.target.value)}
                      className="mt-1.5 h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground font-medium">Abgebender Anbieter *</Label>
                    <Select 
                      value={selectedProviderId}
                      onValueChange={(value) => {
                        setSelectedProviderId(value);
                        const provider = portingProviders.find(p => p.id === value);
                        if (provider && !provider.is_other) {
                          handleCancellationChange('providerName', provider.display_name);
                          setCustomProviderName('');
                        } else if (provider?.is_other) {
                          // Clear provider name, will be set by custom input
                          handleCancellationChange('providerName', customProviderName);
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1.5 h-12 rounded-xl">
                        <SelectValue placeholder="Anbieter wählen" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border border-border z-50">
                        {portingProviders.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-foreground font-medium">Telefonnummer zum Kündigen *</Label>
                    <Input
                      placeholder="Ihre Anschluss-Rufnummer"
                      value={cancellationData.customerNumber}
                      onChange={(e) => handleCancellationChange('customerNumber', e.target.value)}
                      className="mt-1.5 h-12 rounded-xl"
                    />
                  </div>
                </div>

                {/* Custom provider name input when "Sonstige" is selected */}
                {selectedProviderId && portingProviders.find(p => p.id === selectedProviderId)?.is_other && (
                  <div>
                    <Label className="text-foreground font-medium">Name des Anbieters *</Label>
                    <Input
                      placeholder="Bitte geben Sie den Namen des Anbieters ein"
                      value={customProviderName}
                      onChange={(e) => {
                        setCustomProviderName(e.target.value);
                        handleCancellationChange('providerName', e.target.value);
                      }}
                      className="mt-1.5 h-12 rounded-xl"
                    />
                  </div>
                )}

                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Phone className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Ihre Anschluss-Rufnummer wird für die Kündigung benötigt.
                </p>

                {/* Wechselzeitpunkt - nur wenn NICHT Express gewählt */}
                {!expressActivation && (
                  <div className="pt-3 border-t border-border">
                    <Label className="text-foreground font-medium mb-3 block">Wechselzeitpunkt</Label>
                    <RadioGroup 
                      value={cancellationData.portToNewConnection ? 'port' : cancellationData.preferredDate || ''} 
                      onValueChange={(value) => {
                        if (value === 'port') {
                          handleCancellationChange('portToNewConnection', true);
                          handleCancellationChange('preferredDate', null);
                          handleCancellationChange('specificDate', null);
                          // Bei nahtlosem Übergang: Haupttermin zurücksetzen da Portierung den Termin bestimmt
                          setDateType('');
                          setSelectedDate(undefined);
                          setExpressActivation(false);
                        } else {
                          handleCancellationChange('portToNewConnection', false);
                          handleCancellationChange('preferredDate', value);
                          // Synchronisiere den Haupttermin oben
                          if (value === 'asap') {
                            setDateType('asap');
                            setSelectedDate(undefined);
                            handleCancellationChange('specificDate', null);
                          } else if (value === 'specific') {
                            setDateType('specific');
                            // Express deaktivieren bei spezifischem Datum
                            setExpressActivation(false);
                          }
                        }
                      }}
                      className="space-y-3"
                    >
                      <div className={cn(
                        "flex flex-col p-3 rounded-lg border transition-all",
                        cancellationData.portToNewConnection ? "border-accent bg-accent/5" : "border-border"
                      )}>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="port" id="port-seamless" />
                          <Label htmlFor="port-seamless" className="cursor-pointer flex-1">
                            <span className="font-medium">Nahtloser Übergang (Portierung)</span>
                            <span className="block text-xs text-muted-foreground">
                              Wechsel zum COM-IN-Anschluss ohne Unterbrechung
                            </span>
                          </Label>
                        </div>
                        {cancellationData.portToNewConnection && phoneSelection.portingRequired && (
                          <div className="mt-2 ml-6 p-2 bg-accent/10 rounded-lg border border-accent/20">
                            <p className="text-xs text-accent flex items-start gap-1">
                              <Phone className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              Ihre Rufnummer wird nahtlos zu COM-IN portiert. Der Wechseltermin richtet sich nach der Portierung.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className={cn(
                        "p-3 rounded-lg border transition-all cursor-pointer",
                        !cancellationData.portToNewConnection && cancellationData.preferredDate === 'asap' ? "border-accent bg-accent/5" : "border-border"
                      )}>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="asap" id="cancel-asap" />
                          <Label htmlFor="cancel-asap" className="cursor-pointer flex-1">
                            <span className="font-medium">Schnellstmöglich</span>
                          </Label>
                        </div>
                        {!cancellationData.portToNewConnection && cancellationData.preferredDate === 'asap' && (
                          <div className="mt-2 ml-6 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              Hinweis: Ggfls. Doppelzahlung bei Ihrem bisherigen Anbieter möglich, falls keine Vertragsübernahme stattfindet.
                            </p>
                          </div>
                        )}
                      </div>

                      <div
                        className={cn(
                          "p-3 rounded-lg border transition-all cursor-pointer",
                          !cancellationData.portToNewConnection && cancellationData.preferredDate === 'specific'
                            ? "border-accent bg-accent/5"
                            : "border-border"
                        )}
                        onClick={() => {
                          // Direktes Anwählen des Wunschtermins im Wechselzeitpunkt
                          handleCancellationChange('portToNewConnection', false);
                          handleCancellationChange('preferredDate', 'specific');
                          setDateType('specific');
                          setExpressActivation(false);
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="specific" id="cancel-specific" />
                          <Label htmlFor="cancel-specific" className="cursor-pointer flex-1">
                            <span className="font-medium">Wunschtermin wählen</span>
                            {cancellationDate && !cancellationData.portToNewConnection && cancellationData.preferredDate === 'specific' && (
                              <span className="block text-xs text-accent">
                                Gewählt: {format(cancellationDate, "PPP", { locale: de })}
                              </span>
                            )}
                          </Label>
                        </div>
                        
                        {!cancellationData.portToNewConnection && cancellationData.preferredDate === 'specific' && (
                          <div className="mt-3 ml-6 space-y-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal h-10 rounded-lg",
                                    !cancellationDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {cancellationDate ? format(cancellationDate, "PPP", { locale: de }) : "Datum wählen"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-card border border-border z-50" align="start">
                                <Calendar
                                  mode="single"
                                  selected={cancellationDate}
                                  onSelect={(date) => {
                                    setCancellationDate(date);
                                    if (date) {
                                      handleCancellationChange('specificDate', format(date, 'yyyy-MM-dd'));
                                      // Synchronisiere auch den Haupttermin
                                      setSelectedDate(date);
                                      setDateType('specific');
                                      setExpressActivation(false);
                                    }
                                  }}
                                  disabled={(date) => date < minDate}
                                  initialFocus
                                  className="pointer-events-auto"
                                  locale={de}
                                />
                              </PopoverContent>
                            </Popover>
                            <p className="text-xs text-muted-foreground flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              Datum wird automatisch für den Anschalttermin übernommen.
                            </p>
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                              <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1">
                                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                Hinweis: Ggfls. Doppelzahlung bei Ihrem bisherigen Anbieter möglich, falls keine Vertragsübernahme stattfindet.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Hinweis bei Express-Anschaltung */}
                {expressActivation && (
                  <div className="pt-3 border-t border-border">
                    <div className="p-3 bg-accent/10 rounded-lg flex items-start gap-2">
                      <Zap className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-accent">
                        Bei Express-Anschaltung erfolgt die Schaltung innerhalb von 3 Werktagen – 
                        unabhängig vom Kündigungstermin bei Ihrem bisherigen Anbieter.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
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
