import { useOrder } from '@/context/OrderContext';
import { ftthTariffs, limitedTariffs, tariffAddons, TariffOption, TariffAddon } from '@/data/tariffs';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, ArrowDown, ArrowUp, Globe, Rocket, Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContactForm } from './ContactForm';

export function TariffSelection() {
  const { 
    connectionType, 
    address,
    selectedTariff, 
    setSelectedTariff, 
    selectedAddons,
    toggleAddon,
    contractDuration,
    setContractDuration,
    setStep 
  } = useOrder();

  // Determine which tariffs to show based on connection type
  const tariffs = connectionType === 'ftth' ? ftthTariffs : limitedTariffs;
  const isLimited = connectionType === 'limited';

  const groupedAddons = {
    router: tariffAddons.filter(a => a.category === 'router'),
    phone: tariffAddons.filter(a => a.category === 'phone'),
    tv: tariffAddons.filter(a => a.category === 'tv'),
    security: tariffAddons.filter(a => a.category === 'security'),
  };

  const handleContinue = () => {
    if (selectedTariff) {
      setStep(3);
    }
  };

  return (
    <div className="space-y-10 animate-slide-up">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">
          {isLimited ? 'Verfügbarer Tarif' : 'einfach Internet - unsere neuen Internet Produkte'}
        </h2>
        <p className="text-muted-foreground">
          {isLimited 
            ? 'An Ihrer Adresse ist folgender Tarif verfügbar' 
            : 'Wählen Sie das passende Produkt für Ihre Bedürfnisse'}
        </p>
      </div>

      {/* Tarif-Karten */}
      <div className={cn(
        "grid gap-5",
        isLimited ? "max-w-md mx-auto" : "md:grid-cols-2 lg:grid-cols-4"
      )}>
        {tariffs.map((tariff) => (
          <TariffCard
            key={tariff.id}
            tariff={tariff}
            isSelected={selectedTariff?.id === tariff.id}
            onSelect={() => setSelectedTariff(tariff)}
          />
        ))}
      </div>

      {/* Hinweis bei eingeschränkter Verfügbarkeit */}
      {isLimited && (
        <div className="bg-accent/10 border border-accent/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <Phone className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-accent mb-2">Passender Tarif nicht dabei?</h4>
              <p className="text-muted-foreground text-sm mb-4">
                Kontaktieren Sie uns für weitere Optionen. Wir prüfen gerne, welche Möglichkeiten an Ihrer Adresse bestehen.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="tel:+49841885110" 
                  className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
                >
                  <Phone className="w-4 h-4" />
                  +49 841 88511-0
                </a>
                <a 
                  href="mailto:info@comin.de" 
                  className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
                >
                  <Mail className="w-4 h-4" />
                  info@comin.de
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Telefon-Flat Hinweis */}
      <div className="bg-accent rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-accent-foreground font-semibold text-center md:text-left">
          <strong>Telefon-Flat</strong> in deutsche Fest- und Mobilfunknetze zubuchbar
        </p>
        <div className="bg-card text-foreground px-6 py-2 rounded-full font-medium">
          je Leitung 2,95€ / Monat
        </div>
      </div>

      {/* Vertragslaufzeit */}
      {selectedTariff && (
        <div className="animate-fade-in">
          <h3 className="font-bold text-lg text-primary mb-4">Vertragslaufzeit</h3>
          <div className="flex gap-4">
            <button
              onClick={() => setContractDuration(24)}
              className={cn(
                "flex-1 p-5 rounded-xl border-2 transition-all",
                contractDuration === 24
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-accent/50"
              )}
            >
              <div className="font-bold text-lg">24 Monate</div>
              <div className="text-sm text-muted-foreground">Bestpreis</div>
            </button>
            <button
              onClick={() => setContractDuration(12)}
              className={cn(
                "flex-1 p-5 rounded-xl border-2 transition-all",
                contractDuration === 12
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-accent/50"
              )}
            >
              <div className="font-bold text-lg">12 Monate</div>
              <div className="text-sm text-muted-foreground">+5€/Monat</div>
            </button>
          </div>
        </div>
      )}

      {/* Zusatzoptionen */}
      {selectedTariff && (
        <div className="space-y-6 animate-fade-in">
          <h3 className="font-bold text-lg text-primary">Zusatzoptionen</h3>
          
          {/* Router */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Router</p>
            <div className="grid gap-3 md:grid-cols-2">
              {groupedAddons.router.map((addon) => (
                <AddonCard
                  key={addon.id}
                  addon={addon}
                  isSelected={selectedAddons.some(a => a.id === addon.id)}
                  onToggle={() => toggleAddon(addon)}
                />
              ))}
            </div>
          </div>

          {/* Telefon */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Telefonie</p>
            <div className="grid gap-3 md:grid-cols-2">
              {groupedAddons.phone.map((addon) => (
                <AddonCard
                  key={addon.id}
                  addon={addon}
                  isSelected={selectedAddons.some(a => a.id === addon.id)}
                  onToggle={() => toggleAddon(addon)}
                />
              ))}
            </div>
          </div>

          {/* TV */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">TV-Optionen</p>
            <div className="grid gap-3 md:grid-cols-2">
              {groupedAddons.tv.map((addon) => (
                <AddonCard
                  key={addon.id}
                  addon={addon}
                  isSelected={selectedAddons.some(a => a.id === addon.id)}
                  onToggle={() => toggleAddon(addon)}
                />
              ))}
            </div>
          </div>

          {/* Security */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Sicherheit</p>
            <div className="grid gap-3 md:grid-cols-2">
              {groupedAddons.security.map((addon) => (
                <AddonCard
                  key={addon.id}
                  addon={addon}
                  isSelected={selectedAddons.some(a => a.id === addon.id)}
                  onToggle={() => toggleAddon(addon)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Weiter Button */}
      {selectedTariff && (
        <div className="flex justify-end pt-4">
          <Button onClick={handleContinue} size="lg" variant="orange" className="px-10">
            Weiter zu Ihren Daten
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function TariffCard({ 
  tariff, 
  isSelected, 
  onSelect 
}: { 
  tariff: TariffOption; 
  isSelected: boolean; 
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative rounded-2xl text-left transition-all duration-200 overflow-hidden",
        isSelected
          ? "ring-4 ring-accent shadow-glow"
          : "hover:shadow-card",
        "bg-card shadow-soft"
      )}
    >
      {/* Orange Header */}
      <div className="bg-accent p-5 text-center">
        <Globe className="w-6 h-6 text-accent-foreground mx-auto mb-2" />
        <p className="text-accent-foreground font-medium text-lg">
          {tariff.name.includes('FiberBasic') ? 'FiberBasic' : 'einfach'}
        </p>
        <p className="text-accent-foreground font-bold text-4xl">{tariff.displayName}</p>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Geschwindigkeit */}
        <div className="flex items-center justify-center gap-4 mb-4 text-sm">
          <span className="flex items-center gap-1">
            <ArrowDown className="w-4 h-4 text-accent" />
            <strong>{tariff.downloadSpeed}</strong> <span className="text-muted-foreground">Mbit/s</span>
          </span>
          <span className="flex items-center gap-1">
            <ArrowUp className="w-4 h-4 text-success" />
            <strong>{tariff.uploadSpeed}</strong> <span className="text-muted-foreground">Mbit/s</span>
          </span>
        </div>

        {/* Flatrate Badge */}
        <div className="bg-muted rounded-lg py-2 px-4 text-center mb-4">
          <span className="text-sm font-medium">{tariff.description}</span>
        </div>

        {/* Preis */}
        <div className="text-center mb-4">
          <span className="text-accent font-bold text-xl">{tariff.monthlyPrice.toFixed(2).replace('.', ',')} €</span>
          <span className="text-muted-foreground text-sm"> / Monat</span>
        </div>

        {/* Button */}
        <Button 
          variant={isSelected ? "orange" : "default"}
          className="w-full"
        >
          <Rocket className="w-4 h-4" />
          {isSelected ? 'Ausgewählt' : 'Jetzt anfragen!'}
        </Button>
      </div>
    </button>
  );
}

function AddonCard({ 
  addon, 
  isSelected, 
  onToggle 
}: { 
  addon: TariffAddon; 
  isSelected: boolean; 
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "p-4 rounded-xl border-2 text-left transition-all",
        isSelected
          ? "border-accent bg-accent/5"
          : "border-border hover:border-accent/50 bg-card"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h5 className="font-semibold">{addon.name}</h5>
          <p className="text-xs text-muted-foreground mt-0.5">{addon.description}</p>
        </div>
        <div className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 mt-0.5",
          isSelected
            ? "border-accent bg-accent text-accent-foreground"
            : "border-muted-foreground"
        )}>
          {isSelected && <Check className="w-3 h-3" />}
        </div>
      </div>
      <div className="mt-3 text-sm font-bold text-accent">
        {addon.monthlyPrice > 0 ? `+${addon.monthlyPrice.toFixed(2).replace('.', ',')} €/Monat` : 'Inklusive'}
      </div>
    </button>
  );
}
