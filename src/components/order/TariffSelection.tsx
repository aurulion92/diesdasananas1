import { useOrder } from '@/context/OrderContext';
import { ftthTariffs, fttbTariffs, tariffAddons, TariffOption, TariffAddon } from '@/data/tariffs';
import { Button } from '@/components/ui/button';
import { Check, Wifi, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TariffSelection() {
  const { 
    connectionType, 
    selectedTariff, 
    setSelectedTariff, 
    selectedAddons,
    toggleAddon,
    contractDuration,
    setContractDuration,
    setStep 
  } = useOrder();

  const tariffs = connectionType === 'ftth' ? ftthTariffs : fttbTariffs;
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
    <div className="space-y-8 animate-slide-up">
      {/* Tarif-Auswahl */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center">
            <Wifi className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Wählen Sie Ihren Tarif</h2>
            <p className="text-sm text-muted-foreground">
              {connectionType === 'ftth' ? 'FTTH - Glasfaser bis in Ihre Wohnung' : 'FTTB - Glasfaser bis zum Gebäude'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {tariffs.map((tariff) => (
            <TariffCard
              key={tariff.id}
              tariff={tariff}
              isSelected={selectedTariff?.id === tariff.id}
              onSelect={() => setSelectedTariff(tariff)}
            />
          ))}
        </div>
      </div>

      {/* Vertragslaufzeit */}
      {selectedTariff && (
        <div className="animate-fade-in">
          <h3 className="font-semibold mb-3">Vertragslaufzeit</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setContractDuration(24)}
              className={cn(
                "flex-1 p-4 rounded-lg border-2 transition-all",
                contractDuration === 24
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="font-bold">24 Monate</div>
              <div className="text-sm text-muted-foreground">Standard</div>
            </button>
            <button
              onClick={() => setContractDuration(12)}
              className={cn(
                "flex-1 p-4 rounded-lg border-2 transition-all",
                contractDuration === 12
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="font-bold">12 Monate</div>
              <div className="text-sm text-muted-foreground">+5€/Monat</div>
            </button>
          </div>
        </div>
      )}

      {/* Zusatzoptionen */}
      {selectedTariff && (
        <div className="space-y-6 animate-fade-in">
          <h3 className="font-semibold">Zusatzoptionen</h3>
          
          {/* Router */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">WLAN Router</p>
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
            <p className="text-sm text-muted-foreground mb-2">Telefonie</p>
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
            <p className="text-sm text-muted-foreground mb-2">TV & Entertainment</p>
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
            <p className="text-sm text-muted-foreground mb-2">Sicherheit</p>
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
          <Button onClick={handleContinue} size="lg" variant="hero">
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
        "relative p-5 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-card",
        isSelected
          ? "border-primary bg-primary/5 shadow-card"
          : "border-border bg-card hover:border-primary/50",
        tariff.recommended && "ring-2 ring-success ring-offset-2"
      )}
    >
      {tariff.recommended && (
        <div className="absolute -top-3 left-4 px-3 py-1 bg-success text-success-foreground text-xs font-bold rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Empfohlen
        </div>
      )}
      
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-bold">{tariff.name}</h4>
          <p className="text-2xl font-bold text-primary mt-1">{tariff.speed}</p>
        </div>
        <div className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
          isSelected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground"
        )}>
          {isSelected && <Check className="w-4 h-4" />}
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground mt-2">{tariff.description}</p>
      
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{tariff.monthlyPrice.toFixed(2)}</span>
          <span className="text-muted-foreground">€/Monat</span>
        </div>
        {tariff.setupFee > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            + {tariff.setupFee.toFixed(2)} € einmalig
          </p>
        )}
        {tariff.setupFee === 0 && (
          <p className="text-xs text-success font-medium mt-1">
            Keine Einrichtungsgebühr!
          </p>
        )}
      </div>

      <ul className="mt-4 space-y-1">
        {tariff.features.slice(0, 3).map((feature, idx) => (
          <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Check className="w-3 h-3 text-success" />
            {feature}
          </li>
        ))}
      </ul>
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
        "p-4 rounded-lg border-2 text-left transition-all",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h5 className="font-medium">{addon.name}</h5>
          <p className="text-xs text-muted-foreground mt-0.5">{addon.description}</p>
        </div>
        <div className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ml-2",
          isSelected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground"
        )}>
          {isSelected && <Check className="w-3 h-3" />}
        </div>
      </div>
      <div className="mt-2 text-sm font-semibold">
        {addon.monthlyPrice > 0 ? `+${addon.monthlyPrice.toFixed(2)} €/Monat` : 'Inklusive'}
      </div>
    </button>
  );
}
