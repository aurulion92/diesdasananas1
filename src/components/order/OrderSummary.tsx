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
  Wifi, 
  User, 
  Package,
  PartyPopper
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export function OrderSummary() {
  const { 
    address, 
    selectedTariff, 
    selectedAddons, 
    contractDuration,
    customerData,
    vzfDownloaded,
    vzfConfirmed,
    setVzfDownloaded,
    setVzfConfirmed,
    getTotalMonthly,
    getTotalOneTime,
    setStep 
  } = useOrder();

  const [orderComplete, setOrderComplete] = useState(false);

  const handleDownloadVZF = () => {
    // Simuliere VZF Download
    const vzfContent = `
VERTRAGSZUSAMMENFASSUNG (VZF)
==============================

Kunde: ${customerData?.salutation === 'herr' ? 'Herr' : customerData?.salutation === 'frau' ? 'Frau' : ''} ${customerData?.firstName} ${customerData?.lastName}
Adresse: ${address?.street} ${address?.houseNumber}, ${address?.postalCode} ${address?.city}

Gewählter Tarif: ${selectedTariff?.name}
Geschwindigkeit: ${selectedTariff?.speed}
Monatliche Kosten: ${selectedTariff?.monthlyPrice.toFixed(2)} €

Zusatzoptionen:
${selectedAddons.map(a => `- ${a.name}: ${a.monthlyPrice > 0 ? a.monthlyPrice.toFixed(2) + ' €/Monat' : 'inklusive'}`).join('\n')}

Vertragslaufzeit: ${contractDuration} Monate

GESAMTKOSTEN:
- Monatlich: ${getTotalMonthly().toFixed(2)} €
- Einmalig: ${getTotalOneTime().toFixed(2)} €

Datum: ${new Date().toLocaleDateString('de-DE')}
    `;

    const blob = new Blob([vzfContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Vertragszusammenfassung_VZF.txt';
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
      description: "Vielen Dank für Ihre Bestellung. Sie erhalten in Kürze eine Bestätigung per E-Mail.",
    });
  };

  if (orderComplete) {
    return (
      <div className="max-w-xl mx-auto text-center animate-scale-in">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
          <PartyPopper className="w-12 h-12 text-success" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Bestellung abgeschlossen!</h2>
        <p className="text-muted-foreground mb-8">
          Vielen Dank für Ihre Bestellung, {customerData?.firstName}! 
          Sie erhalten in Kürze eine Bestätigungs-E-Mail an {customerData?.email}.
        </p>
        
        <div className="bg-card rounded-xl shadow-card p-6 text-left space-y-4">
          <h3 className="font-semibold">Ihre Bestelldetails</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bestellnummer:</span>
              <span className="font-mono">ORD-{Date.now().toString(36).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tarif:</span>
              <span>{selectedTariff?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monatliche Kosten:</span>
              <span className="font-bold">{getTotalMonthly().toFixed(2)} €</span>
            </div>
          </div>
          
          <div className="pt-4 border-t">
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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Bestellübersicht</h2>
          <p className="text-sm text-muted-foreground">
            Prüfen Sie Ihre Angaben und schließen Sie die Bestellung ab
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Adresse */}
        <div className="bg-card rounded-xl shadow-soft p-5">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-semibold">Anschlussadresse</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {address?.street} {address?.houseNumber}, {address?.postalCode} {address?.city}
              </p>
              <span className={cn(
                "inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full",
                address?.connectionType === 'ftth' ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
              )}>
                {address?.connectionType === 'ftth' ? 'FTTH - Glasfaser bis in die Wohnung' : 'FTTB - Glasfaser bis zum Gebäude'}
              </span>
            </div>
          </div>
        </div>

        {/* Kundendaten */}
        <div className="bg-card rounded-xl shadow-soft p-5">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-semibold">Kundendaten</h4>
              <div className="text-sm text-muted-foreground mt-1 space-y-1">
                <p>{customerData?.salutation === 'herr' ? 'Herr' : customerData?.salutation === 'frau' ? 'Frau' : ''} {customerData?.firstName} {customerData?.lastName}</p>
                <p>{customerData?.email}</p>
                <p>{customerData?.phone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tarif */}
        <div className="bg-card rounded-xl shadow-soft p-5">
          <div className="flex items-start gap-3">
            <Wifi className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{selectedTariff?.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{selectedTariff?.speed} • {contractDuration} Monate Laufzeit</p>
                </div>
                <p className="font-bold">{selectedTariff?.monthlyPrice.toFixed(2)} €/Monat</p>
              </div>
            </div>
          </div>
        </div>

        {/* Addons */}
        {selectedAddons.length > 0 && (
          <div className="bg-card rounded-xl shadow-soft p-5">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold">Zusatzoptionen</h4>
                <div className="mt-2 space-y-2">
                  {selectedAddons.map(addon => (
                    <div key={addon.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{addon.name}</span>
                      <span>{addon.monthlyPrice > 0 ? `${addon.monthlyPrice.toFixed(2)} €/Monat` : 'inklusive'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Kosten Zusammenfassung */}
        <div className="bg-primary/5 rounded-xl p-5 border border-primary/20">
          <h4 className="font-semibold mb-3">Kostenübersicht</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Monatliche Kosten</span>
              <span className="font-bold text-lg">{getTotalMonthly().toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Einmalige Kosten</span>
              <span>{getTotalOneTime().toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {/* VZF Download */}
        <div className="bg-card rounded-xl shadow-card p-6 border-2 border-dashed border-primary/30">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
              vzfDownloaded ? "bg-success/10" : "bg-primary/10"
            )}>
              {vzfDownloaded ? (
                <CheckCircle2 className="w-6 h-6 text-success" />
              ) : (
                <FileText className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">Vertragszusammenfassung (VZF)</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Vor Vertragsabschluss müssen Sie die Vertragszusammenfassung herunterladen und bestätigen.
              </p>
              
              <Button 
                onClick={handleDownloadVZF}
                variant={vzfDownloaded ? "secondary" : "default"}
                className="mt-4"
              >
                <Download className="w-4 h-4" />
                {vzfDownloaded ? 'Erneut herunterladen' : 'VZF herunterladen'}
              </Button>

              {vzfDownloaded && (
                <div className="flex items-center gap-2 mt-4">
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
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => setStep(3)}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>
          <Button 
            onClick={handleOrder}
            disabled={!vzfDownloaded || !vzfConfirmed}
            className="flex-1"
            variant="hero"
          >
            <CheckCircle2 className="w-4 h-4" />
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
