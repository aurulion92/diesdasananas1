import { useState } from 'react';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, FileText, Home, User, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GNVCheck() {
  const { 
    address, 
    gnvData, 
    setGnvData, 
    setStep 
  } = useOrder();

  const [isOwner, setIsOwner] = useState<boolean | null>(gnvData?.isOwner ?? null);
  const [ownerData, setOwnerData] = useState({
    salutation: gnvData?.ownerData?.salutation || '',
    firstName: gnvData?.ownerData?.firstName || '',
    lastName: gnvData?.ownerData?.lastName || '',
    street: gnvData?.ownerData?.street || '',
    houseNumber: gnvData?.ownerData?.houseNumber || '',
    postalCode: gnvData?.ownerData?.postalCode || '',
    city: gnvData?.ownerData?.city || '',
    email: gnvData?.ownerData?.email || '',
    phone: gnvData?.ownerData?.phone || '',
  });
  const [residentialUnits, setResidentialUnits] = useState(
    gnvData?.residentialUnits || address?.residentialUnits || 1
  );

  const handleContinue = () => {
    if (isOwner === null) return;
    
    setGnvData({
      required: true,
      isOwner,
      ownerData: isOwner ? undefined : ownerData,
      residentialUnits,
    });
    
    setStep(2); // Continue to tariff selection
  };

  const canContinue = isOwner !== null && (
    isOwner || 
    (ownerData.firstName && ownerData.lastName && ownerData.street && 
     ownerData.houseNumber && ownerData.postalCode && ownerData.city &&
     ownerData.email && ownerData.phone)
  );

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-accent/10 rounded-full">
          <FileText className="w-10 h-10 text-accent" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
          Grundstücksnutzungsvereinbarung (GNV)
        </h1>
        <p className="text-muted-foreground">
          Für die Fertigstellung des Glasfaser-Hausanschlusses an dieser Adresse wird eine GNV benötigt.
        </p>
      </div>

      {/* Info Card */}
      <Card className="mb-6 border-accent/30 bg-accent/5">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <AlertTriangle className="w-6 h-6 text-accent flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p>
                Zu diesem Objekt (<strong>{address?.street} {address?.houseNumber}, {address?.city}</strong>) 
                fehlt aktuell eine Grundstücksnutzungsvereinbarung (GNV).
              </p>
              <p className="text-muted-foreground">
                Die GNV wird als Vertragsbestandteil mit Ihrer Bestellung versendet.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Owner Question */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="w-5 h-5" />
            Sind Sie der Eigentümer des Grundstücks?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={isOwner === null ? '' : isOwner ? 'yes' : 'no'}
            onValueChange={(value) => setIsOwner(value === 'yes')}
            className="space-y-3"
          >
            <div className={cn(
              "flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer",
              isOwner === true ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
            )}>
              <RadioGroupItem value="yes" id="owner-yes" />
              <Label htmlFor="owner-yes" className="flex-1 cursor-pointer">
                <span className="font-medium">Ja, ich bin der Eigentümer</span>
              </Label>
            </div>
            <div className={cn(
              "flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer",
              isOwner === false ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
            )}>
              <RadioGroupItem value="no" id="owner-no" />
              <Label htmlFor="owner-no" className="flex-1 cursor-pointer">
                <span className="font-medium">Nein, ich bin Mieter</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Cost Notice - Only for Owner */}
      {isOwner === true && (
        <Card className="mb-6 border-success/30 bg-success/5">
          <CardContent className="pt-6">
            <div className="space-y-3 text-sm">
              <p className="font-medium text-success">
                ✓ Die Anschlussvorbereitungen erfolgen kostenlos.
              </p>
              <p className="text-foreground">
                <strong>Hinweis:</strong> Für die Fertigstellung des Hausanschlusses fallen einmalig <strong>490,00 €</strong> an.
              </p>
              <p className="text-muted-foreground text-xs">
                Dieser Betrag wird nach erfolgreicher Fertigstellung in Rechnung gestellt.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Owner Data Form - Only if NOT owner */}
      {isOwner === false && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Eigentümerdaten
            </CardTitle>
            <CardDescription>
              Bitte geben Sie die Kontaktdaten des Grundstückseigentümers an.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner-salutation">Anrede</Label>
                <select
                  id="owner-salutation"
                  value={ownerData.salutation}
                  onChange={(e) => setOwnerData({...ownerData, salutation: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Bitte wählen</option>
                  <option value="Herr">Herr</option>
                  <option value="Frau">Frau</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-firstname">Vorname *</Label>
                <Input
                  id="owner-firstname"
                  value={ownerData.firstName}
                  onChange={(e) => setOwnerData({...ownerData, firstName: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-lastname">Nachname *</Label>
                <Input
                  id="owner-lastname"
                  value={ownerData.lastName}
                  onChange={(e) => setOwnerData({...ownerData, lastName: e.target.value})}
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="owner-street">Straße *</Label>
                <Input
                  id="owner-street"
                  value={ownerData.street}
                  onChange={(e) => setOwnerData({...ownerData, street: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-housenumber">Hausnummer *</Label>
                <Input
                  id="owner-housenumber"
                  value={ownerData.houseNumber}
                  onChange={(e) => setOwnerData({...ownerData, houseNumber: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner-postal">PLZ *</Label>
                <Input
                  id="owner-postal"
                  value={ownerData.postalCode}
                  onChange={(e) => setOwnerData({...ownerData, postalCode: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-city">Ort *</Label>
                <Input
                  id="owner-city"
                  value={ownerData.city}
                  onChange={(e) => setOwnerData({...ownerData, city: e.target.value})}
                  required
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner-email">E-Mail *</Label>
                <Input
                  id="owner-email"
                  type="email"
                  value={ownerData.email}
                  onChange={(e) => setOwnerData({...ownerData, email: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-phone">Telefon *</Label>
                <Input
                  id="owner-phone"
                  type="tel"
                  value={ownerData.phone}
                  onChange={(e) => setOwnerData({...ownerData, phone: e.target.value})}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Residential Units */}
      {isOwner !== null && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Wohneinheiten
            </CardTitle>
            <CardDescription>
              Wie viele Wohneinheiten hat das Gebäude?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min="1"
                max="100"
                value={residentialUnits}
                onChange={(e) => setResidentialUnits(parseInt(e.target.value) || 1)}
                className="w-24"
              />
              <span className="text-muted-foreground">Wohneinheit(en)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!canContinue}
          className="px-12"
        >
          Weiter zur Tarifauswahl
        </Button>
      </div>
    </div>
  );
}