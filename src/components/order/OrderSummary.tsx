import { useState } from 'react';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Download, 
  ArrowLeft, 
  CheckCircle2, 
  MapPin, 
  Globe, 
  User, 
  Package,
  PartyPopper,
  Rocket,
  Router,
  Tv,
  Phone,
  CreditCard,
  Calendar,
  Tag,
  Gift,
  Zap,
  ArrowRightLeft,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { generateVZFContent, VZFData } from '@/utils/generateVZF';
import { renderVZFFromTemplate, VZFRenderData } from '@/utils/renderVZFTemplate';
import { downloadVZFAsPDF } from '@/services/pdfService';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ConsentCheckboxes } from '@/components/order/ConsentCheckboxes';

export function OrderSummary() {
  const { 
    address, 
    apartmentData,
    selectedTariff,
    selectedRouter,
    tvSelection,
    phoneSelection,
    selectedAddons, 
    contractDuration,
    customerData,
    bankData,
    preferredDateType,
    preferredDate,
    cancelPreviousProvider,
    providerCancellationData,
    expressActivation,
    referralData,
    appliedPromoCode,
    vzfDownloaded,
    vzfConfirmed,
    setVzfDownloaded,
    setVzfConfirmed,
    consentData,
    setConsentData,
    getTotalMonthly,
    getTotalOneTime,
    getRouterPrice,
    getRouterDiscount,
    getSetupFee,
    isSetupFeeWaived,
    getReferralBonus,
    generateOrderNumber,
    getOrderNumber,
    setStep 
  } = useOrder();

  const [orderComplete, setOrderComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Check for FiberBasic by name since id is now UUID
  const isFiberBasic = selectedTariff?.name?.toLowerCase().includes('fiberbasic') || 
                       selectedTariff?.name?.toLowerCase().includes('fiber basic') || false;
  const routerDiscount = getRouterDiscount();
  
  // Check if phone is booked (via tariff, phoneSelection, or phone option addon)
  const hasPhoneAddon = selectedAddons.some(addon => addon.category === 'phone');
  const phoneIsBooked = selectedTariff?.includesPhone === true || phoneSelection.enabled || hasPhoneAddon;

  const handleDownloadVZF = async () => {
    if (!selectedTariff || !customerData) return;

    const vzfData = {
      tariff: selectedTariff,
      router: selectedRouter,
      tvType: tvSelection.type,
      tvPackage: tvSelection.package,
      tvHdAddon: tvSelection.hdAddon,
      tvHardware: tvSelection.hardware,
      waipuStick: tvSelection.waipuStick,
      waipuStickPrice: tvSelection.waipuStickPrice,
      phoneEnabled: phoneIsBooked,
      phoneLines: phoneSelection.lines || (hasPhoneAddon ? 1 : 0),
      routerDiscount: routerDiscount,
      setupFee: getSetupFee(),
      setupFeeWaived: isSetupFeeWaived(),
      contractDuration: isFiberBasic ? contractDuration : 24,
      expressActivation: expressActivation,
      promoCode: appliedPromoCode?.code,
      isFiberBasic: isFiberBasic,
      referralBonus: getReferralBonus(),
    };

    const renderData: VZFRenderData = {
      customerName: `${customerData.firstName} ${customerData.lastName}`,
      customerFirstName: customerData.firstName,
      customerLastName: customerData.lastName,
      customerEmail: customerData.email,
      customerPhone: customerData.phone,
      street: address?.street || '',
      houseNumber: address?.houseNumber || '',
      city: address?.city || 'Ingolstadt',
      tariffName: selectedTariff.name,
      tariffPrice: `${(isFiberBasic && contractDuration === 12 ? selectedTariff.monthlyPrice12 : selectedTariff.monthlyPrice).toFixed(2).replace('.', ',')} €`,
      tariffDownload: `${selectedTariff.downloadSpeed} Mbit/s`,
      tariffUpload: `${selectedTariff.uploadSpeed} Mbit/s`,
      contractDuration: `${isFiberBasic ? contractDuration : 24} Monate`,
      routerName: selectedRouter?.name || 'Kein Router',
      routerPrice: `${getRouterPrice().toFixed(2).replace('.', ',')} €`,
      tvName: tvSelection.type === 'comin' ? 'COM-IN TV' : tvSelection.package?.name || 'Kein TV',
      tvPrice: '0,00 €',
      monthlyTotal: `${getTotalMonthly().toFixed(2).replace('.', ',')} €`,
      oneTimeTotal: `${getTotalOneTime().toFixed(2).replace('.', ',')} €`,
      setupFee: `${getSetupFee().toFixed(2).replace('.', ',')} €`,
      orderNumber: generateOrderNumber(),
      vzfTimestamp: format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de }),
    };

    try {
      // Build VZF data for content generation
      const vzfDataForContent: VZFData = {
        tariff: selectedTariff,
        router: selectedRouter,
        tvType: tvSelection.type,
        tvPackage: tvSelection.package,
        tvHdAddon: tvSelection.hdAddon,
        tvHardware: tvSelection.hardware,
        waipuStick: tvSelection.waipuStick,
        waipuStickPrice: tvSelection.waipuStickPrice,
        phoneEnabled: phoneIsBooked,
        phoneLines: phoneSelection.lines || (hasPhoneAddon ? 1 : 0),
        routerDiscount: routerDiscount,
        setupFee: getSetupFee(),
        setupFeeWaived: isSetupFeeWaived(),
        contractDuration: isFiberBasic ? contractDuration : 24,
        expressActivation: expressActivation,
        promoCode: appliedPromoCode?.code,
        isFiberBasic: isFiberBasic,
        referralBonus: getReferralBonus(),
        serviceAddons: selectedAddons,
      };

      // Get the HTML content
      const htmlContent = await renderVZFFromTemplate(vzfDataForContent, renderData);
      const orderNumber = renderData.orderNumber;

      // Try to generate and download as PDF
      const success = await downloadVZFAsPDF(htmlContent, orderNumber);
      
      if (success) {
        setVzfDownloaded(true);
        toast({
          title: "VZF heruntergeladen",
          description: "Bitte lesen Sie das Dokument sorgfältig durch.",
        });
      } else {
        throw new Error('PDF generation failed');
      }
    } catch (error) {
      console.error('VZF download error:', error);
      // Fallback: Open in new window for printing
      const vzfDataForContent: VZFData = {
        tariff: selectedTariff,
        router: selectedRouter,
        tvType: tvSelection.type,
        tvPackage: tvSelection.package,
        tvHdAddon: tvSelection.hdAddon,
        tvHardware: tvSelection.hardware,
        waipuStick: tvSelection.waipuStick,
        waipuStickPrice: tvSelection.waipuStickPrice,
        phoneEnabled: phoneIsBooked,
        phoneLines: phoneSelection.lines || (hasPhoneAddon ? 1 : 0),
        routerDiscount: routerDiscount,
        setupFee: getSetupFee(),
        setupFeeWaived: isSetupFeeWaived(),
        contractDuration: isFiberBasic ? contractDuration : 24,
        expressActivation: expressActivation,
        promoCode: appliedPromoCode?.code,
        isFiberBasic: isFiberBasic,
        referralBonus: getReferralBonus(),
        serviceAddons: selectedAddons,
      };
      const htmlContent = generateVZFContent(vzfDataForContent);
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      }
      setVzfDownloaded(true);
      toast({
        title: "VZF geöffnet",
        description: "Bitte drucken Sie das Dokument als PDF.",
      });
    }
  };

  const handleOrder = async () => {
    if (!selectedTariff || !customerData || !address) return;
    
    setIsSubmitting(true);
    
    try {
      // Build VZF data for reconstruction - convert to plain JSON
      const vzfData = JSON.parse(JSON.stringify({
        tariff: selectedTariff,
        router: selectedRouter,
        tvSelection,
        phoneSelection,
        routerDiscount,
        setupFee: getSetupFee(),
        setupFeeWaived: isSetupFeeWaived(),
        contractDuration: isFiberBasic ? contractDuration : 24,
        expressActivation,
        promoCode: appliedPromoCode?.code,
        isFiberBasic,
        referralBonus: getReferralBonus(),
      }));

      // Build selected options array
      const selectedOptions = [];
      if (selectedRouter && selectedRouter.id !== 'router-none') {
        selectedOptions.push({
          type: 'router',
          name: selectedRouter.name,
          monthlyPrice: getRouterPrice(),
          discount: routerDiscount
        });
      }
      if (tvSelection.type !== 'none') {
        selectedOptions.push({
          type: 'tv',
          tvType: tvSelection.type,
          package: tvSelection.package,
          hdAddon: tvSelection.hdAddon,
          hardware: tvSelection.hardware,
          waipuStick: tvSelection.waipuStick
        });
      }
      if (phoneSelection.enabled && !isFiberBasic) {
        selectedOptions.push({
          type: 'phone',
          lines: phoneSelection.lines,
          portingRequired: phoneSelection.portingRequired,
          portingData: phoneSelection.portingData
        });
      }

      // Build applied promotions
      const appliedPromotions = [];
      if (appliedPromoCode) {
        appliedPromotions.push({
          code: appliedPromoCode.code,
          description: appliedPromoCode.description,
          routerDiscount: appliedPromoCode.routerDiscount,
          setupFeeWaived: appliedPromoCode.setupFeeWaived
        });
      }

      const orderData = {
        // Customer data
        customer_name: `${customerData.firstName} ${customerData.lastName}`,
        customer_first_name: customerData.firstName,
        customer_last_name: customerData.lastName,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        
        // Address
        street: address.street,
        house_number: address.houseNumber,
        city: address.city || 'Falkensee',
        floor: apartmentData?.floor || null,
        apartment: apartmentData?.apartment || null,
        connection_type: address.connectionType,
        
        // Product
        product_name: selectedTariff.name,
        product_monthly_price: isFiberBasic && contractDuration === 12 
          ? selectedTariff.monthlyPrice12 || selectedTariff.monthlyPrice 
          : selectedTariff.monthlyPrice,
        contract_months: isFiberBasic ? contractDuration : 24,
        
        // Pricing
        monthly_total: getTotalMonthly(),
        one_time_total: getTotalOneTime(),
        setup_fee: getSetupFee(),
        
        // Options & Promotions - convert to JSON compatible
        selected_options: JSON.parse(JSON.stringify(selectedOptions)),
        applied_promotions: JSON.parse(JSON.stringify(appliedPromotions)),
        promo_code: appliedPromoCode?.code || null,
        referral_customer_number: referralData.type === 'referral' && referralData.referralValidated 
          ? referralData.referrerCustomerId 
          : null,
        
        // Scheduling
        desired_start_date: preferredDateType === 'asap' ? null : preferredDate,
        express_activation: expressActivation,
        
        // Phone porting
        phone_porting: phoneSelection.portingRequired || false,
        phone_porting_numbers: phoneSelection.portingData?.phoneNumbers || [],
        phone_porting_provider: phoneSelection.portingData?.previousProvider || null,
        
        // Phone book options
        phone_evn: phoneSelection.evn || false,
        phone_book_entry_type: phoneSelection.phoneBookEntryType || 'none',
        phone_book_printed: phoneSelection.phoneBookPrinted || false,
        phone_book_phone_info: phoneSelection.phoneBookPhoneInfo || false,
        phone_book_internet: phoneSelection.phoneBookInternet || false,
        phone_book_custom_name: phoneSelection.phoneBookCustomName || null,
        phone_book_custom_address: phoneSelection.phoneBookCustomAddress || null,
        phone_book_show_address: phoneSelection.phoneBookShowAddress ?? true,
        
        // Consent
        consent_advertising: consentData.advertising,
        consent_agb: consentData.agb,
        
        // Previous provider cancellation
        cancel_previous_provider: cancelPreviousProvider,
        previous_provider_name: providerCancellationData?.providerName || null,
        previous_provider_customer_number: providerCancellationData?.customerNumber || null,
        
        // Bank data
        bank_account_holder: bankData?.accountHolder || null,
        bank_iban: bankData?.iban || null,
        
        // VZF data for reconstruction
        vzf_data: vzfData,
      };

      const { data: insertedOrder, error } = await supabase.from('orders').insert([orderData]).select('id').single();

      if (error) {
        console.error('Order submission error:', error);
        toast({
          title: "Fehler bei der Bestellung",
          description: "Bitte versuchen Sie es erneut oder kontaktieren Sie uns.",
          variant: "destructive"
        });
        return;
      }

      // Send confirmation email with VZF attachment
      try {
        const renderData: VZFRenderData = {
          customerName: `${customerData.firstName} ${customerData.lastName}`,
          customerFirstName: customerData.firstName,
          customerLastName: customerData.lastName,
          customerEmail: customerData.email,
          customerPhone: customerData.phone,
          street: address.street,
          houseNumber: address.houseNumber,
          city: address.city || 'Ingolstadt',
          tariffName: selectedTariff.name,
          tariffPrice: `${(isFiberBasic && contractDuration === 12 ? selectedTariff.monthlyPrice12 : selectedTariff.monthlyPrice).toFixed(2).replace('.', ',')} €`,
          tariffDownload: `${selectedTariff.downloadSpeed} Mbit/s`,
          tariffUpload: `${selectedTariff.uploadSpeed} Mbit/s`,
          contractDuration: `${isFiberBasic ? contractDuration : 24} Monate`,
          routerName: selectedRouter?.name || 'Kein Router',
          routerPrice: `${getRouterPrice().toFixed(2).replace('.', ',')} €`,
          tvName: tvSelection.type === 'comin' ? 'COM-IN TV' : tvSelection.package?.name || 'Kein TV',
          tvPrice: '0,00 €',
          monthlyTotal: `${getTotalMonthly().toFixed(2).replace('.', ',')} €`,
          oneTimeTotal: `${getTotalOneTime().toFixed(2).replace('.', ',')} €`,
          setupFee: `${getSetupFee().toFixed(2).replace('.', ',')} €`,
          orderNumber: getOrderNumber() || `COM-${insertedOrder.id.substring(0, 8).toUpperCase()}`,
          vzfTimestamp: format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de }),
        };

        // Generate VZF HTML for email attachment (fallback)
        const { renderVZFFromTemplate } = await import('@/utils/renderVZFTemplate');
        const vzfHtmlForEmail = await renderVZFFromTemplate(vzfData, renderData);

        // Build vzfData for PDF generation in edge function
        const vzfDataForPdf = {
          tariffName: selectedTariff.name,
          tariffPrice: isFiberBasic && contractDuration === 12 
            ? selectedTariff.monthlyPrice12 || selectedTariff.monthlyPrice 
            : selectedTariff.monthlyPrice,
          monthlyTotal: getTotalMonthly(),
          oneTimeTotal: getTotalOneTime(),
          setupFee: getSetupFee(),
          contractDuration: isFiberBasic ? contractDuration : 24,
          street: address.street,
          houseNumber: address.houseNumber,
          city: address.city || 'Ingolstadt',
          selectedOptions: [
            ...(selectedRouter && selectedRouter.id !== 'router-none' ? [{
              name: selectedRouter.name,
              monthlyPrice: getRouterPrice()
            }] : []),
            ...(tvSelection.type !== 'none' ? [{
              name: tvSelection.type === 'comin' ? 'COM-IN TV' : (tvSelection.package?.name || 'TV'),
              monthlyPrice: tvSelection.package?.monthlyPrice || 0
            }] : []),
            ...(phoneSelection.enabled && !isFiberBasic ? [{
              name: `Telefon (${phoneSelection.lines} Leitung${phoneSelection.lines > 1 ? 'en' : ''})`,
              monthlyPrice: phoneSelection.lines * 2.95
            }] : []),
            ...(expressActivation ? [{
              name: 'Express-Anschaltung',
              oneTimePrice: 200
            }] : [])
          ]
        };

        // Call edge function to send email with PDF
        await supabase.functions.invoke('send-order-email', {
          body: {
            orderId: insertedOrder.id,
            customerEmail: customerData.email,
            customerName: `${customerData.firstName} ${customerData.lastName}`,
            customerFirstName: customerData.firstName,
            customerLastName: customerData.lastName,
            customerPhone: customerData.phone,
            salutation: customerData.salutation === 'herr' ? 'Herr' : 'Frau',
            vzfHtml: vzfHtmlForEmail,
            vzfData: vzfDataForPdf
          }
        });
        
        console.log('Confirmation email sent successfully');
      } catch (emailError) {
        console.error('Email sending failed (order still successful):', emailError);
        // Don't fail the order if email fails
      }

      setOrderComplete(true);
      toast({
        title: "Bestellung erfolgreich!",
        description: "Vielen Dank für Ihre Bestellung bei COM-IN.",
      });
    } catch (err) {
      console.error('Order error:', err);
      toast({
        title: "Fehler bei der Bestellung",
        description: "Bitte versuchen Sie es erneut.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="max-w-2xl mx-auto animate-scale-in">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
            <PartyPopper className="w-12 h-12 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-primary mb-2">Bestellung abgeschlossen!</h2>
          <p className="text-muted-foreground">
            Vielen Dank für Ihre Bestellung, {customerData?.firstName}! 
            Sie erhalten in Kürze eine Bestätigungs-E-Mail an {customerData?.email}.
          </p>
        </div>
        
        <div className="space-y-4">
          {/* Bestellnummer */}
          <div className="bg-card rounded-xl shadow-soft p-5 text-center">
            <p className="text-sm text-muted-foreground">Bestellnummer</p>
            <p className="text-2xl font-mono font-bold text-primary">{getOrderNumber() || 'Wird generiert...'}</p>
          </div>

          {/* Anschlussadresse */}
          <div className="bg-card rounded-xl shadow-soft p-5">
            <div className="flex items-start gap-4">
              <MapPin className="w-5 h-5 text-accent mt-0.5" />
              <div>
                <h4 className="font-bold text-primary">Anschlussadresse</h4>
                <p className="text-muted-foreground">{address?.street} {address?.houseNumber}, {address?.city}</p>
                {apartmentData && <p className="text-muted-foreground text-sm">{apartmentData.floor}. OG, Wohnung {apartmentData.apartment}</p>}
              </div>
            </div>
          </div>

          {/* Kundendaten */}
          <div className="bg-card rounded-xl shadow-soft p-5">
            <div className="flex items-start gap-4">
              <User className="w-5 h-5 text-accent mt-0.5" />
              <div>
                <h4 className="font-bold text-primary">Kundendaten</h4>
                <p className="text-muted-foreground">{customerData?.salutation === 'herr' ? 'Herr' : 'Frau'} {customerData?.firstName} {customerData?.lastName}</p>
                <p className="text-muted-foreground">{customerData?.email} • {customerData?.phone}</p>
              </div>
            </div>
          </div>

          {/* Wunschtermin */}
          <div className="bg-card rounded-xl shadow-soft p-5">
            <div className="flex items-start gap-4">
              <Calendar className="w-5 h-5 text-accent mt-0.5" />
              <div>
                <h4 className="font-bold text-primary">Wunschtermin</h4>
                <p className="text-muted-foreground">{preferredDateType === 'asap' ? 'Schnellstmöglich' : preferredDate}</p>
                {expressActivation && <p className="text-accent font-medium">Express-Anschaltung (3 Werktage)</p>}
              </div>
            </div>
          </div>

          {/* Produkt */}
          <div className="bg-card rounded-xl shadow-soft p-5">
            <div className="flex items-start gap-4">
              <Globe className="w-5 h-5 text-accent mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-primary">{selectedTariff?.name}</h4>
                <p className="text-muted-foreground">{selectedTariff?.speed}</p>
                {selectedRouter && selectedRouter.id !== 'router-none' && (
                  <p className="text-muted-foreground text-sm">+ {selectedRouter.name}</p>
                )}
                {tvSelection.type !== 'none' && (
                  <p className="text-muted-foreground text-sm">+ {tvSelection.type === 'comin' ? 'COM-IN TV' : tvSelection.package?.name}</p>
                )}
                {phoneSelection.enabled && !isFiberBasic && (
                  <p className="text-muted-foreground text-sm">+ Telefon ({phoneSelection.lines} Leitung(en))</p>
                )}
              </div>
            </div>
          </div>

          {/* Rabatte */}
          {(appliedPromoCode || (referralData.type === 'referral' && referralData.referralValidated)) && (
            <div className="bg-success/5 rounded-xl p-5 border border-success/20">
              <div className="flex items-start gap-4">
                <Gift className="w-5 h-5 text-success mt-0.5" />
                <div>
                  {appliedPromoCode && <p className="text-success font-medium">Aktionscode: {appliedPromoCode.code}</p>}
                  {referralData.type === 'referral' && referralData.referralValidated && (
                    <p className="text-success">Kunden werben Kunden: 50€ Prämie (Werber: {referralData.referrerCustomerId})</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Kosten */}
          <div className="bg-accent/5 rounded-xl p-5 border border-accent/20">
            <div className="flex justify-between items-center">
              <span className="font-bold text-primary">Monatliche Kosten</span>
              <span className="text-2xl font-bold text-accent">{getTotalMonthly().toFixed(2).replace('.', ',')} €</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-muted-foreground">Einmalige Kosten</span>
              <span className="text-muted-foreground">{getTotalOneTime().toFixed(2).replace('.', ',')} €</span>
            </div>
            {getReferralBonus() > 0 && (
              <div className="flex justify-between items-center mt-2 text-success">
                <span>davon Kunden werben Kunden Prämie</span>
                <span>-{getReferralBonus().toFixed(2).replace('.', ',')} €</span>
              </div>
            )}
          </div>

          {/* VZF Download */}
          <div className="bg-card rounded-xl shadow-soft p-5">
            <Button onClick={handleDownloadVZF} variant="outline" className="w-full">
              <Download className="w-4 h-4" />
              Vertragszusammenfassung erneut herunterladen
            </Button>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Wir werden uns in den nächsten Tagen bezüglich des Installationstermins bei Ihnen melden.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
          <FileText className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-bold text-primary">Zusammenfassung</h2>
        <p className="text-muted-foreground mt-1">
          Prüfen Sie Ihre Angaben und schließen Sie die Bestellung ab
        </p>
      </div>

      <div className="space-y-4">
        {/* Adresse */}
        <div className="bg-card rounded-xl shadow-soft p-5">
          <div className="flex items-start gap-4">
            <MapPin className="w-5 h-5 text-accent mt-0.5" />
            <div>
              <h4 className="font-bold text-primary">Anschlussadresse</h4>
              <p className="text-muted-foreground mt-1">
                {address?.street} {address?.houseNumber}, {address?.city}
              </p>
              {apartmentData && (
                <p className="text-muted-foreground text-sm">
                  {apartmentData.floor}. OG, Wohnung {apartmentData.apartment}
                </p>
              )}
              <span className={cn(
                "inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full",
                address?.connectionType === 'ftth' ? "bg-success/10 text-success" : "bg-accent/10 text-accent"
              )}>
                {address?.connectionType === 'ftth' ? 'FTTH - Glasfaser bis in die Wohnung' : 'FTTB - Glasfaser bis zum Gebäude'}
              </span>
            </div>
          </div>
        </div>

        {/* Kundendaten */}
        <div className="bg-card rounded-xl shadow-soft p-5">
          <div className="flex items-start gap-4">
            <User className="w-5 h-5 text-accent mt-0.5" />
            <div>
              <h4 className="font-bold text-primary">Kundendaten</h4>
              <div className="text-muted-foreground mt-1 space-y-0.5">
                <p>{customerData?.salutation === 'herr' ? 'Herr' : customerData?.salutation === 'frau' ? 'Frau' : ''} {customerData?.firstName} {customerData?.lastName}</p>
                <p>{customerData?.email}</p>
                <p>{customerData?.phone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bankdaten */}
        <div className="bg-card rounded-xl shadow-soft p-5">
          <div className="flex items-start gap-4">
            <CreditCard className="w-5 h-5 text-accent mt-0.5" />
            <div>
              <h4 className="font-bold text-primary">Bankverbindung</h4>
              <div className="text-muted-foreground mt-1 space-y-0.5">
                <p>{bankData?.accountHolder}</p>
                <p className="font-mono text-sm">{bankData?.iban}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Wunschtermin */}
        <div className="bg-card rounded-xl shadow-soft p-5">
          <div className="flex items-start gap-4">
            <Calendar className="w-5 h-5 text-accent mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-primary">Wunschtermin</h4>
              <p className="text-muted-foreground mt-1">
                {preferredDateType === 'asap' ? 'Schnellstmöglich' : preferredDate}
              </p>
              {expressActivation && (
                <div className="flex items-center gap-2 mt-2 text-accent">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-medium">Express-Anschaltung (3 Werktage)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wechselservice */}
        {cancelPreviousProvider && providerCancellationData && (
          <div className="bg-card rounded-xl shadow-soft p-5">
            <div className="flex items-start gap-4">
              <ArrowRightLeft className="w-5 h-5 text-accent mt-0.5" />
              <div>
                <h4 className="font-bold text-primary">Wechselservice</h4>
                <div className="text-muted-foreground mt-1 space-y-0.5">
                  <p>Bisheriger Anbieter: {providerCancellationData.providerName}</p>
                  <p>Telefonnummer: {providerCancellationData.customerNumber}</p>
                  <p>Übergang: {providerCancellationData.portToNewConnection 
                    ? 'Nahtlos (Portierung)' 
                    : providerCancellationData.preferredDate === 'asap' 
                      ? 'Schnellstmöglich' 
                      : `Zum ${providerCancellationData.specificDate}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tarif */}
        <div className="bg-card rounded-xl shadow-soft p-5">
          <div className="flex items-start gap-4">
            <Globe className="w-5 h-5 text-accent mt-0.5" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-primary">{selectedTariff?.name}</h4>
                  <p className="text-muted-foreground mt-1">{selectedTariff?.speed} • {isFiberBasic ? contractDuration : 24} Monate Laufzeit</p>
                  {isFiberBasic && (
                    <p className="text-xs text-success mt-1">✓ Telefonie-Flat ins dt. Festnetz inklusive</p>
                  )}
                </div>
                <p className="font-bold text-accent text-lg">
                  {(isFiberBasic && contractDuration === 12 ? selectedTariff?.monthlyPrice12 : selectedTariff?.monthlyPrice)?.toFixed(2).replace('.', ',')} €/Monat
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Router */}
        {selectedRouter && selectedRouter.id !== 'router-none' && (
          <div className="bg-card rounded-xl shadow-soft p-5">
            <div className="flex items-start gap-4">
              <Router className="w-5 h-5 text-accent mt-0.5" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-primary">{selectedRouter.name}</h4>
                    <p className="text-muted-foreground mt-1 text-sm">{selectedRouter.description}</p>
                    {routerDiscount > 0 && (
                      <p className="text-success text-sm mt-1">-{routerDiscount.toFixed(2).replace('.', ',')} € Rabatt</p>
                    )}
                  </div>
                  <p className="font-bold text-accent">{getRouterPrice().toFixed(2).replace('.', ',')} €/Monat</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TV */}
        {tvSelection.type !== 'none' && (
          <div className="bg-card rounded-xl shadow-soft p-5">
            <div className="flex items-start gap-4">
              <Tv className="w-5 h-5 text-accent mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-primary">TV-Paket</h4>
                <div className="mt-2 space-y-1 text-sm">
                  {tvSelection.type === 'comin' && (
                    <div className="flex justify-between">
                      <span>COM-IN TV</span>
                      <span>10,00 €/Monat</span>
                    </div>
                  )}
                  {tvSelection.type === 'waipu' && tvSelection.package && (
                    <div className="flex justify-between">
                      <span>{tvSelection.package.name}</span>
                      <span>{tvSelection.package.monthlyPrice.toFixed(2).replace('.', ',')} €/Monat</span>
                    </div>
                  )}
                  {tvSelection.hdAddon && (
                    <div className="flex justify-between">
                      <span>{tvSelection.hdAddon.name}</span>
                      <span>{tvSelection.hdAddon.monthlyPrice.toFixed(2).replace('.', ',')} €/Monat</span>
                    </div>
                  )}
                  {tvSelection.hardware.map(hw => (
                    <div key={hw.id} className="flex justify-between text-muted-foreground">
                      <span>{hw.name}</span>
                      <span>{hw.monthlyPrice > 0 ? `${hw.monthlyPrice.toFixed(2).replace('.', ',')} €/Monat` : `${hw.oneTimePrice.toFixed(2).replace('.', ',')} € einm.`}</span>
                    </div>
                  ))}
                  {tvSelection.waipuStick && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>waipu.tv 4K Stick</span>
                      <span>{(tvSelection.waipuStickPrice ?? 59.99).toFixed(2).replace('.', ',')} € einm.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Telefon */}
        {phoneSelection.enabled && !isFiberBasic && (
          <div className="bg-card rounded-xl shadow-soft p-5">
            <div className="flex items-start gap-4">
              <Phone className="w-5 h-5 text-accent mt-0.5" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-primary">Telefon-Flat Festnetz</h4>
                    <p className="text-muted-foreground mt-1 text-sm">{phoneSelection.lines} Leitung(en)</p>
                    {phoneSelection.portingRequired && phoneSelection.portingData && (
                      <p className="text-muted-foreground text-sm">
                        Rufnummernportierung: {phoneSelection.portingData.numberOfNumbers} Nummer(n) von {phoneSelection.portingData.previousProvider}
                      </p>
                    )}
                  </div>
                  <p className="font-bold text-accent">{(phoneSelection.lines * 2.95).toFixed(2).replace('.', ',')} €/Monat</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Promo Code / Referral */}
        {(appliedPromoCode || (referralData.type === 'referral' && referralData.referralValidated)) && (
          <div className="bg-success/5 rounded-xl p-5 border border-success/20">
            <div className="flex items-start gap-4">
              {appliedPromoCode ? <Tag className="w-5 h-5 text-success mt-0.5" /> : <Gift className="w-5 h-5 text-success mt-0.5" />}
              <div>
                {appliedPromoCode && (
                  <div>
                    <h4 className="font-bold text-success">Aktionscode: {appliedPromoCode.code}</h4>
                    <p className="text-success/80 text-sm mt-1">{appliedPromoCode.description}</p>
                  </div>
                )}
                {referralData.type === 'referral' && referralData.referralValidated && (
                  <div className={appliedPromoCode ? 'mt-3' : ''}>
                    <h4 className="font-bold text-success">Kunden werben Kunden</h4>
                    <p className="text-success/80 text-sm mt-1">50€ Prämie für Sie und den Werber (Kd-Nr: {referralData.referrerCustomerId})</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Kosten */}
        <div className="bg-accent/5 rounded-xl p-5 border border-accent/20">
          <h4 className="font-bold text-primary mb-3">Kostenübersicht</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Monatliche Kosten</span>
              <span className="font-bold text-xl text-accent">{getTotalMonthly().toFixed(2).replace('.', ',')} €</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Einmalige Kosten</span>
              <span>{getTotalOneTime().toFixed(2).replace('.', ',')} €</span>
            </div>
            {getReferralBonus() > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>Kunden werben Kunden Prämie</span>
                <span>-{getReferralBonus().toFixed(2).replace('.', ',')} €</span>
              </div>
            )}
            {isSetupFeeWaived() && (
              <p className="text-success text-sm">✓ Anschlussgebühr entfällt durch Aktionscode</p>
            )}
            {expressActivation && (
              <p className="text-accent text-sm">✓ Express-Anschaltung: +200,00 € einmalig</p>
            )}
          </div>
        </div>

        {/* Consent Checkboxes */}
        <ConsentCheckboxes
          data={consentData}
          onChange={setConsentData}
          errors={!consentData.agb && vzfConfirmed ? { agb: 'Bitte akzeptieren Sie die AGB, um fortzufahren.' } : undefined}
        />

        {/* VZF Download */}
        <div className={cn(
          "bg-card rounded-xl shadow-card p-6 border-2 border-dashed",
          !vzfDownloaded ? "border-accent/30" : vzfConfirmed ? "border-success/30" : "border-warning/30"
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              vzfDownloaded ? "bg-success/10" : "bg-accent/10"
            )}>
              {vzfDownloaded ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <FileText className="w-5 h-5 text-accent" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-primary">Vertragszusammenfassung (VZF)</h4>
              <p className="text-muted-foreground text-sm mt-1">
                Bitte laden Sie die Vertragszusammenfassung herunter und lesen Sie diese sorgfältig durch.
              </p>
              
              {/* Warning if VZF needs to be re-downloaded after changes */}
              {!vzfDownloaded && (
                <div className="flex items-center gap-2 mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                  <p className="text-sm text-warning">
                    Sie müssen die VZF herunterladen, bevor Sie die Bestellung abschließen können.
                  </p>
                </div>
              )}
              
              <Button 
                onClick={handleDownloadVZF}
                variant={vzfDownloaded ? "outline" : "orange"}
                className="mt-4"
              >
                <Download className="w-4 h-4" />
                {vzfDownloaded ? 'Erneut herunterladen' : 'VZF herunterladen'}
              </Button>
              
              {vzfDownloaded && (
                <div className="flex items-center gap-3 mt-4">
                  <Checkbox 
                    id="vzf-confirm" 
                    checked={vzfConfirmed}
                    onCheckedChange={(checked) => setVzfConfirmed(checked === true)}
                  />
                  <label htmlFor="vzf-confirm" className="text-sm cursor-pointer">
                    Ich habe die Vertragszusammenfassung heruntergeladen und zur Kenntnis genommen.
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <Button 
            variant="outline" 
            onClick={() => setStep(3)}
            className="flex-1 h-12 rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>
          <Button 
            onClick={handleOrder}
            disabled={!vzfConfirmed || !consentData.agb || isSubmitting}
            className="flex-1 h-12"
            variant="orange"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Bestellung wird gesendet...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Jetzt kostenpflichtig bestellen
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
