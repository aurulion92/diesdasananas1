import { useOrder } from '@/context/OrderContext';
import { ShoppingCart, MapPin, Wifi, Package, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CartSidebar() {
  const { 
    address, 
    selectedTariff, 
    selectedAddons, 
    contractDuration,
    getTotalMonthly, 
    getTotalOneTime 
  } = useOrder();

  const totalMonthly = getTotalMonthly();
  const totalOneTime = getTotalOneTime();

  return (
    <div className="bg-card rounded-xl shadow-card p-6 sticky top-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-bold text-lg">Ihre Auswahl</h3>
      </div>

      <div className="space-y-4">
        {/* Adresse */}
        {address && (
          <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
            <MapPin className="w-4 h-4 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">{address.street} {address.houseNumber}</p>
              <p className="text-muted-foreground">{address.postalCode} {address.city}</p>
              <span className={cn(
                "inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full",
                address.connectionType === 'ftth' && "bg-success/10 text-success",
                address.connectionType === 'fttb' && "bg-primary/10 text-primary"
              )}>
                {address.connectionType === 'ftth' ? 'FTTH' : 'FTTB'}
              </span>
            </div>
          </div>
        )}

        {/* Tarif */}
        {selectedTariff && (
          <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
            <Wifi className="w-4 h-4 text-primary mt-0.5" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{selectedTariff.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedTariff.speed}</p>
                </div>
                <p className="font-bold text-primary">{selectedTariff.monthlyPrice.toFixed(2)} €</p>
              </div>
            </div>
          </div>
        )}

        {/* Addons */}
        {selectedAddons.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Zusatzoptionen</p>
            {selectedAddons.map(addon => (
              <div key={addon.id} className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg">
                <Package className="w-3 h-3 text-primary" />
                <div className="flex-1 flex justify-between items-center">
                  <p className="text-sm">{addon.name}</p>
                  {addon.monthlyPrice > 0 && (
                    <p className="text-sm font-medium">{addon.monthlyPrice.toFixed(2)} €</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vertragslaufzeit */}
        {selectedTariff && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-success" />
            <span>{contractDuration} Monate Vertragslaufzeit</span>
          </div>
        )}
      </div>

      {/* Kosten Übersicht */}
      {selectedTariff && (
        <div className="mt-6 pt-6 border-t border-border">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monatliche Kosten</span>
              <span className="font-bold text-lg">{totalMonthly.toFixed(2)} €</span>
            </div>
            {totalOneTime > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Einmalige Kosten</span>
                <span className="font-medium">{totalOneTime.toFixed(2)} €</span>
              </div>
            )}
          </div>
          
          <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-xs text-center text-muted-foreground">
              Alle Preise inkl. MwSt.
            </p>
          </div>
        </div>
      )}

      {!selectedTariff && !address && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Wählen Sie Ihre Adresse und Ihren Tarif aus
        </p>
      )}
    </div>
  );
}
