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
  Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

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
    referralData,
    appliedPromoCode,
    vzfDownloaded,
    vzfConfirmed,
    setVzfDownloaded,
    setVzfConfirmed,
    getTotalMonthly,
    getTotalOneTime,
    getRouterPrice,
    getRouterDiscount,
    getSetupFee,
    isSetupFeeWaived,
    setStep 
  } = useOrder();

  const [orderComplete, setOrderComplete] = useState(false);
  const isFiberBasic = selectedTariff?.id === 'fiber-basic-100';
  const routerDiscount = getRouterDiscount();

  const handleDownloadVZF = () => {
    const vzfContent = `
VERTRAGSZUSAMMENFASSUNG (VZF)
==============================
COM-IN - Ein Unternehmen der Stadt Ingolstadt

Kunde: ${customerData?.salutation === 'herr' ? 'Herr' : customerData?.salutation === 'frau' ? 'Frau' : ''} ${customerData?.firstName} ${customerData?.lastName}
Anschlussadresse: ${address?.street} ${address?.houseNumber}, ${address?.postalCode} ${address?.city}
${apartmentData ? `Wohnungslage: ${apartmentData.floor}. OG, Wohnung ${apartmentData.apartment}` : ''}

Gewähltes Produkt: ${selectedTariff?.name}
Geschwindigkeit: ${selectedTariff?.speed}
Vertragslaufzeit: ${isFiberBasic ? contractDuration : 24} Monate

MONATLICHE KOSTEN:
- ${selectedTariff?.name}: ${(isFiberBasic && contractDuration === 12 ? selectedTariff?.monthlyPrice12 : selectedTariff?.monthlyPrice)?.toFixed(2).replace('.', ',')} €
${selectedRouter && selectedRouter.id !== 'router-none' ? `- ${selectedRouter.name}: ${getRouterPrice().toFixed(2).replace('.', ',')} €${routerDiscount > 0 ? ` (${routerDiscount.toFixed(2).replace('.', ',')} € Rabatt)` : ''}` : ''}
${tvSelection.package ? `- ${tvSelection.package.name}: ${tvSelection.package.monthlyPrice.toFixed(2).replace('.', ',')} €` : ''}
${tvSelection.type === 'comin' && !tvSelection.package ? '- COM-IN TV: 10,00 €' : ''}
${tvSelection.hdAddon ? `- ${tvSelection.hdAddon.name}: ${tvSelection.hdAddon.monthlyPrice.toFixed(2).replace('.', ',')} €` : ''}
${tvSelection.hardware.filter(h => h.monthlyPrice > 0).map(h => `- ${h.name}: ${h.monthlyPrice.toFixed(2).replace('.', ',')} €`).join('\n')}
${phoneSelection.enabled && !isFiberBasic ? `- Telefon-Flat (${phoneSelection.lines} Leitung(en)): ${(phoneSelection.lines * 2.95).toFixed(2).replace('.', ',')} €` : ''}

EINMALIGE KOSTEN:
- Bereitstellung inkl. Einrichtung: ${getSetupFee().toFixed(2).replace('.', ',')} €${isSetupFeeWaived() ? ' (entfällt durch Aktionscode)' : ''}
${tvSelection.hardware.filter(h => h.oneTimePrice > 0).map(h => `- ${h.name}: ${h.oneTimePrice.toFixed(2).replace('.', ',')} €`).join('\n')}
${tvSelection.waipuStick ? '- waipu.tv 4K Stick: 40,00 €' : ''}

GESAMTKOSTEN:
- Monatlich: ${getTotalMonthly().toFixed(2).replace('.', ',')} €
- Einmalig: ${getTotalOneTime().toFixed(2).replace('.', ',')} €

BANKVERBINDUNG:
Kontoinhaber: ${bankData?.accountHolder}
IBAN: ${bankData?.iban}

Wunschtermin: ${preferredDateType === 'asap' ? 'Schnellstmöglich' : preferredDate}
Bisherigen Anbieter kündigen: ${cancelPreviousProvider ? 'Ja' : 'Nein'}

${appliedPromoCode ? `Aktionscode: ${appliedPromoCode.code} - ${appliedPromoCode.description}` : ''}
${referralData.type === 'referral' ? `Kunden werben Kunden - Werber-Kundennr: ${referralData.referrerCustomerId}` : ''}

Datum: ${new Date().toLocaleDateString('de-DE')}

COM-IN GmbH
Ein Unternehmen der Stadt Ingolstadt
    `;

    const blob = new Blob([vzfContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'COMIN_Vertragszusammenfassung_VZF.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setVzfDownloaded(true);
    toast({
      title: "VZF heruntergeladen",
      description: "Bitte lesen Sie das Dokument sorgfältig durch.",
    });
  };

  const handleOrder = () => {
    setOrderComplete(true);
    toast({
      title: "Bestellung erfolgreich!",
      description: "Vielen Dank für Ihre Bestellung bei COM-IN.",
    });
  };

  if (orderComplete) {
    return (
      <div className="max-w-xl mx-auto text-center animate-scale-in">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
          <PartyPopper className="w-12 h-12 text-success" />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-2">Bestellung abgeschlossen!</h2>
        <p className="text-muted-foreground mb-8">
          Vielen Dank für Ihre Bestellung, {customerData?.firstName}! 
          Sie erhalten in Kürze eine Bestätigungs-E-Mail an {customerData?.email}.
        </p>
        
        <div className="bg-card rounded-2xl shadow-card p-6 text-left space-y-4">
          <h3 className="font-bold text-primary">Ihre Bestelldetails</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bestellnummer:</span>
              <span className="font-mono font-bold">COM-{Date.now().toString(36).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Produkt:</span>
              <span className="font-medium">{selectedTariff?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monatliche Kosten:</span>
              <span className="font-bold text-accent">{getTotalMonthly().toFixed(2).replace('.', ',')} €</span>
            </div>
          </div>
          
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Wir werden uns in den nächsten Tagen bezüglich des Installationstermins bei Ihnen melden.
            </p>
          </div>
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
                {address?.street} {address?.houseNumber}, {address?.postalCode} {address?.city}
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
            <div>
              <h4 className="font-bold text-primary">Wunschtermin</h4>
              <p className="text-muted-foreground mt-1">
                {preferredDateType === 'asap' ? 'Schnellstmöglich' : preferredDate}
              </p>
              <p className="text-muted-foreground text-sm">
                Bisherigen Anbieter kündigen: {cancelPreviousProvider ? 'Ja' : 'Nein'}
              </p>
            </div>
          </div>
        </div>

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
                    <p className="text-xs text-success mt-1">✓ Telefon inklusive</p>
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
        {(tvSelection.type !== 'none' || tvSelection.package) && (
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
                  {tvSelection.package && tvSelection.type === 'waipu' && (
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
                      <span>40,00 € einm.</span>
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
        {(appliedPromoCode || referralData.type === 'referral') && (
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
                {referralData.type === 'referral' && (
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
            {isSetupFeeWaived() && (
              <p className="text-success text-sm">✓ Anschlussgebühr entfällt durch Aktionscode</p>
            )}
          </div>
        </div>

        {/* VZF Download */}
        <div className="bg-card rounded-xl shadow-card p-6 border-2 border-dashed border-accent/30">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
              vzfDownloaded ? "bg-success/10" : "bg-accent/10"
            )}>
              {vzfDownloaded ? (
                <CheckCircle2 className="w-6 h-6 text-success" />
              ) : (
                <FileText className="w-6 h-6 text-accent" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-primary">Vertragszusammenfassung (VZF)</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Vor Vertragsabschluss müssen Sie die Vertragszusammenfassung herunterladen und bestätigen.
              </p>
              
              <Button 
                onClick={handleDownloadVZF}
                variant={vzfDownloaded ? "secondary" : "orange"}
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
                    onCheckedChange={(checked) => setVzfConfirmed(checked as boolean)}
                  />
                  <label htmlFor="vzf-confirm" className="text-sm cursor-pointer">
                    Ich habe die VZF heruntergeladen und zur Kenntnis genommen
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
            disabled={!vzfDownloaded || !vzfConfirmed}
            className="flex-1 h-12"
            variant="orange"
          >
            <Rocket className="w-4 h-4" />
            Jetzt verbindlich bestellen
          </Button>
        </div>

        {(!vzfDownloaded || !vzfConfirmed) && (
          <p className="text-xs text-center text-muted-foreground">
            Bitte laden Sie zuerst die VZF herunter und bestätigen Sie diese
          </p>
        )}
      </div>
    </div>
  );
}