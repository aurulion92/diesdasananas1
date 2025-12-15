import { useOrder } from '@/context/OrderContext';
import { useOrderPromotions } from '@/hooks/useOrderPromotions';
import { ShoppingCart, MapPin, Wifi, Package, Check, Globe, Router, Tv, Phone, Tag, Gift, X, Zap, Home, Building2, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBranding } from '@/hooks/useBranding';

interface CartSidebarProps {
  customerType?: 'pk' | 'kmu';
}

export function CartSidebar({ customerType = 'pk' }: CartSidebarProps) {
  const { branding } = useBranding();
  const { 
    address, 
    selectedTariff, 
    selectedRouter,
    tvSelection,
    phoneSelection,
    selectedAddons,
    contractDuration,
    referralData,
    appliedPromoCode,
    expressActivation,
    expressOption,
    getTotalOneTime,
    isMFH,
  } = useOrder();
  
  const isKMU = customerType === 'kmu';

  // Use promotions from database
  const { 
    getPromotedRouterPrice,
    getPromotedRouterOneTimePrice,
    isSetupFeeWaivedByPromotions,
    getApplicablePromotionNames,
    getEffectiveRouterMonthlyDiscount,
    getEffectiveRouterOneTimeDiscount,
  } = useOrderPromotions();

  // Use effective discounts (capped to not exceed base price)
  const routerDiscount = getEffectiveRouterMonthlyDiscount();
  const routerOneTimeDiscount = getEffectiveRouterOneTimeDiscount();
  const routerPrice = getPromotedRouterPrice();
  const routerOneTimePrice = getPromotedRouterOneTimePrice();
  const setupFeeWaived = isSetupFeeWaivedByPromotions() || appliedPromoCode?.setupFeeWaived === true;
  const setupFee = setupFeeWaived ? 0 : (selectedTariff?.setupFee ?? 99);
  
  // Check for FiberBasic by name since id is now UUID
  const isFiberBasic = selectedTariff?.name?.toLowerCase().includes('fiberbasic') || 
                       selectedTariff?.name?.toLowerCase().includes('fiber basic') || false;
  const isEinfachTariff = selectedTariff?.name?.toLowerCase().startsWith('einfach') || false;
  const isEasyBusinessTariff = selectedTariff?.name?.toLowerCase().includes('easy business') || false;
  
  // Phone options available for einfach tariffs (PK) or easy business tariffs (KMU)
  const hasPhoneOptions = isEinfachTariff || isEasyBusinessTariff;

  // Calculate monthly total with promotion discounts
  const calculateMonthlyTotal = () => {
    let total = 0;
    
    if (selectedTariff) {
      total += contractDuration === 12 && isFiberBasic
        ? selectedTariff.monthlyPrice12 
        : selectedTariff.monthlyPrice;
    }
    
    // Router with promotion discount
    total += routerPrice;
    
    // TV costs
    if (tvSelection.type === 'comin') {
      total += 10.00;
    }
    if (tvSelection.package && tvSelection.type === 'waipu') {
      total += tvSelection.package.monthlyPrice;
    }
    if (tvSelection.hdAddon) {
      total += tvSelection.hdAddon.monthlyPrice;
    }
    tvSelection.hardware.forEach(hw => {
      total += hw.monthlyPrice;
    });
    
    // Phone costs - use price from selected phone option
    if (phoneSelection.enabled && hasPhoneOptions) {
      total += phoneSelection.lines * phoneSelection.selectedOptionPrice;
    }
    
    return total;
  };

  const totalMonthly = calculateMonthlyTotal();

  // Calculate one-time total with promotion discounts  
  const calculateOneTimeTotal = () => {
    let total = setupFee;
    
    // Router one-time price with promotion discount
    total += routerOneTimePrice;
    
    tvSelection.hardware.forEach(hw => {
      total += hw.oneTimePrice;
    });
    
    if (tvSelection.waipuStick) {
      total += tvSelection.waipuStickPrice ?? 59.99;
    }
    
    if (expressActivation && expressOption) {
      total += expressOption.oneTimePrice;
    } else if (expressActivation) {
      total += 200.00; // Fallback if no option loaded
    }
    
    // Service/Installation addons one-time prices
    selectedAddons.forEach(addon => {
      total += addon.oneTimePrice ?? 0;
    });
    
    // Referral bonus
    if (referralData.type === 'referral' && referralData.referralValidated) {
      total -= 50;
    }
    
    return Math.max(0, total);
  };

  const totalOneTime = calculateOneTimeTotal();

  return (
    <div className="bg-card rounded-2xl shadow-card p-6 sticky top-24 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-accent" />
        </div>
        <h3 className="font-bold text-lg text-primary">Ihre Auswahl</h3>
      </div>

      <div className="space-y-4">
        {/* Adresse */}
        {address && (
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
            <MapPin className="w-4 h-4 text-accent mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium">{address.street} {address.houseNumber}</p>
              <p className="text-muted-foreground">{address.city}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className={cn(
                  "inline-block px-2 py-0.5 text-xs font-semibold rounded-full",
                  address.connectionType === 'ftth' && "bg-success/10 text-success",
                  address.connectionType === 'limited' && "bg-accent/10 text-accent",
                  address.connectionType === 'not-connected' && "bg-destructive/10 text-destructive"
                )}>
                  {address.connectionType === 'ftth' ? 'Glasfaser (FTTH)' : 
                   address.connectionType === 'limited' ? 'FTTB' : 'Nicht verbunden'}
                </span>
                {address.kabelTvAvailable && (
                  <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-muted text-muted-foreground">
                    Kabel TV
                  </span>
                )}
              </div>
            </div>
            {/* Gebäudetyp Icon - Bei KMU-only Gebäude: "Gewerbeobjekt", sonst: EFH/MFH/WoWi */}
            <div className="flex flex-col items-center text-muted-foreground">
              {/* KMU-only Gebäude (kmu_tariffs_available=true, pk_tariffs_available=false) */}
              {isKMU && address.kmuOnly ? (
                <>
                  <Building2 className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-0.5">Gewerbe</span>
                </>
              ) : (address.residentialUnits || 1) === 1 ? (
                <>
                  <Home className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-0.5">EFH</span>
                </>
              ) : (address.residentialUnits || 1) === 2 ? (
                <>
                  <Building className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-0.5">MFH</span>
                </>
              ) : (
                <>
                  <Building2 className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-0.5">WoWi</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tarif */}
        {selectedTariff && (
          <div className="p-4 bg-accent/5 rounded-xl border border-accent/20">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-accent mt-0.5" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-primary">{selectedTariff.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedTariff.speed}</p>
                    {isFiberBasic && (
                      <p className="text-xs text-muted-foreground">{contractDuration} Monate Laufzeit</p>
                    )}
                  </div>
                  <p className="font-bold text-accent">
                    {contractDuration === 12 && isFiberBasic
                      ? selectedTariff.monthlyPrice12.toFixed(2).replace('.', ',')
                      : selectedTariff.monthlyPrice.toFixed(2).replace('.', ',')
                    } €
                  </p>
                </div>
                {isFiberBasic && (
                  <p className="text-xs text-success mt-1">✓ Telefonie-Flat ins dt. Festnetz inklusive</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Router */}
        {selectedRouter && selectedRouter.id !== 'router-none' && (
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Router className="w-4 h-4 text-accent" />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">{selectedRouter.name}</p>
                <div className="text-right">
                  {/* Monthly price with discount */}
                  {routerDiscount > 0 && selectedRouter.monthlyPrice > 0 && (
                    <p className="text-xs line-through text-muted-foreground">
                      {selectedRouter.monthlyPrice.toFixed(2).replace('.', ',')} €/mtl.
                    </p>
                  )}
                  {selectedRouter.monthlyPrice > 0 && (
                    <p className="text-sm font-medium text-accent">
                      {routerPrice.toFixed(2).replace('.', ',')} €/mtl.
                    </p>
                  )}
                  {/* One-time price with discount */}
                  {routerOneTimeDiscount > 0 && selectedRouter.oneTimePrice > 0 && (
                    <p className="text-xs line-through text-muted-foreground">
                      {selectedRouter.oneTimePrice.toFixed(2).replace('.', ',')} € einm.
                    </p>
                  )}
                  {selectedRouter.oneTimePrice > 0 && (
                    <p className="text-sm font-medium text-muted-foreground">
                      {routerOneTimePrice.toFixed(2).replace('.', ',')} € einm.
                    </p>
                  )}
                </div>
              </div>
              {routerDiscount > 0 && (
                <p className="text-xs text-success">-{routerDiscount.toFixed(2).replace('.', ',')} € mtl. Rabatt</p>
              )}
              {routerOneTimeDiscount > 0 && (
                <p className="text-xs text-success">-{routerOneTimeDiscount.toFixed(2).replace('.', ',')} € einm. Rabatt</p>
              )}
            </div>
          </div>
        )}

        {/* TV */}
        {tvSelection.type !== 'none' && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">TV-Paket</p>
            
            {/* COM-IN TV Base */}
            {tvSelection.type === 'comin' && (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Tv className="w-4 h-4 text-accent" />
                <div className="flex-1 flex justify-between items-center">
                  <p className="text-sm">COM-IN TV</p>
                  <p className="text-sm font-medium text-accent">10,00 €</p>
                </div>
              </div>
            )}
            
            {/* WAIPU Package */}
            {tvSelection.type === 'waipu' && tvSelection.package && (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Tv className="w-4 h-4 text-accent" />
                <div className="flex-1 flex justify-between items-center">
                  <p className="text-sm">{tvSelection.package.name}</p>
                  <p className="text-sm font-medium text-accent">
                    {tvSelection.package.monthlyPrice.toFixed(2).replace('.', ',')} €
                  </p>
                </div>
              </div>
            )}
            
            {/* HD Addon */}
            {tvSelection.hdAddon && (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg ml-4">
                <Package className="w-3 h-3 text-accent" />
                <div className="flex-1 flex justify-between items-center">
                  <p className="text-sm">{tvSelection.hdAddon.name}</p>
                  <p className="text-sm font-medium text-accent">
                    {tvSelection.hdAddon.monthlyPrice.toFixed(2).replace('.', ',')} €
                  </p>
                </div>
              </div>
            )}
            
            {/* Hardware */}
            {tvSelection.hardware.map(hw => (
              <div key={hw.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg ml-4">
                <Package className="w-3 h-3 text-accent" />
                <div className="flex-1 flex justify-between items-center">
                  <p className="text-sm">{hw.name}</p>
                  {hw.monthlyPrice > 0 ? (
                    <p className="text-sm font-medium text-accent">
                      {hw.monthlyPrice.toFixed(2).replace('.', ',')} €
                    </p>
                  ) : hw.oneTimePrice > 0 ? (
                    <p className="text-sm font-medium text-muted-foreground">
                      {hw.oneTimePrice.toFixed(2).replace('.', ',')} € einm.
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
            
            {/* WAIPU Stick */}
            {tvSelection.waipuStick && (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg ml-4">
                <Package className="w-3 h-3 text-accent" />
                <div className="flex-1 flex justify-between items-center">
                  <p className="text-sm">waipu.tv 4K Stick</p>
                  <p className="text-sm font-medium text-muted-foreground">
                    {(tvSelection.waipuStickPrice ?? 59.99).toFixed(2).replace('.', ',')} € einm.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Telefon */}
        {phoneSelection.enabled && hasPhoneOptions && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Telefonie</p>
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Phone className="w-4 h-4 text-accent" />
              <div className="flex-1 flex justify-between items-center">
                <p className="text-sm">
                  {phoneSelection.selectedOptionName || 'Telefon'} ({phoneSelection.lines} {phoneSelection.lines === 1 ? 'Leitung' : 'Leitungen'})
                </p>
                <p className="text-sm font-medium text-accent">
                  {(phoneSelection.lines * phoneSelection.selectedOptionPrice).toFixed(2).replace('.', ',')} €
                </p>
              </div>
            </div>
            {phoneSelection.portingRequired && (
              <p className="text-xs text-muted-foreground ml-7">
                + Rufnummernportierung
              </p>
            )}
          </div>
        )}

        {/* Express Activation */}
        {expressActivation && (
          <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
            <Zap className="w-4 h-4 text-accent" />
            <div className="flex-1 flex justify-between items-center">
              <p className="text-sm font-medium">{expressOption?.name || 'Express-Anschaltung'}</p>
              <p className="text-sm font-medium text-muted-foreground">
                {(expressOption?.oneTimePrice || 200).toFixed(2).replace('.', ',')} € einm.
              </p>
            </div>
          </div>
        )}

        {/* Promo Code / Referral Badge */}
        {appliedPromoCode && (
          <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg border border-success/20">
            <Tag className="w-4 h-4 text-success mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-success">Aktionscode: {appliedPromoCode.code}</p>
              <p className="text-xs text-success/80">{appliedPromoCode.description}</p>
            </div>
          </div>
        )}

        {referralData.type === 'referral' && referralData.referralValidated && (
          <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg border border-success/20">
            <Gift className="w-4 h-4 text-success mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-success">Kunden werben Kunden</p>
              <p className="text-xs text-success/80">50€ Prämie für Sie und den Werber</p>
            </div>
          </div>
        )}

        {/* Vertragslaufzeit */}
        {selectedTariff && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-success" />
            <span>{selectedTariff.contractMonths || 24} Monate Vertragslaufzeit</span>
          </div>
        )}
      </div>

      {/* Kosten Übersicht */}
      {selectedTariff && (
        <div className="mt-6 pt-6 border-t border-border">
          <div className="space-y-3">
            {/* Monthly breakdown */}
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-muted-foreground">Monatliche Kosten</p>
              
              {/* Tariff */}
              <div className="flex justify-between text-muted-foreground">
                <span>{selectedTariff.name}</span>
                <span>
                  {contractDuration === 12 && isFiberBasic
                    ? selectedTariff.monthlyPrice12.toFixed(2).replace('.', ',')
                    : selectedTariff.monthlyPrice.toFixed(2).replace('.', ',')
                  } €
                </span>
              </div>
              
              {/* Router - show ORIGINAL monthly price, discount shown separately */}
              {selectedRouter && selectedRouter.id !== 'router-none' && selectedRouter.monthlyPrice > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{selectedRouter.name} (mtl.)</span>
                  <span>{selectedRouter.monthlyPrice.toFixed(2).replace('.', ',')} €</span>
                </div>
              )}
              
              {/* Router Monthly Discount - show as separate line */}
              {routerDiscount > 0 && selectedRouter && selectedRouter.id !== 'router-none' && (
                <div className="flex justify-between text-success">
                  <span>Router-Rabatt (mtl.)</span>
                  <span>-{routerDiscount.toFixed(2).replace('.', ',')} €</span>
                </div>
              )}
              
              {/* TV */}
              {tvSelection.type === 'comin' && (
                <div className="flex justify-between text-muted-foreground">
                  <span>COM-IN TV</span>
                  <span>10,00 €</span>
                </div>
              )}
              {tvSelection.type === 'waipu' && tvSelection.package && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{tvSelection.package.name}</span>
                  <span>{tvSelection.package.monthlyPrice.toFixed(2).replace('.', ',')} €</span>
                </div>
              )}
              {tvSelection.hdAddon && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{tvSelection.hdAddon.name}</span>
                  <span>{tvSelection.hdAddon.monthlyPrice.toFixed(2).replace('.', ',')} €</span>
                </div>
              )}
              {tvSelection.hardware.filter(h => h.monthlyPrice > 0).map(hw => (
                <div key={hw.id} className="flex justify-between text-muted-foreground">
                  <span>{hw.name}</span>
                  <span>{hw.monthlyPrice.toFixed(2).replace('.', ',')} €</span>
                </div>
              ))}
              
              {/* Phone - show for both einfach (PK) and easy business (KMU) tariffs */}
              {phoneSelection.enabled && hasPhoneOptions && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{phoneSelection.selectedOptionName || 'Telefon'} ({phoneSelection.lines}x)</span>
                  <span>{(phoneSelection.lines * phoneSelection.selectedOptionPrice).toFixed(2).replace('.', ',')} €</span>
                </div>
              )}
            </div>
            
            {/* Monthly Total */}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-semibold">Gesamt monatlich</span>
              <span className="font-bold text-xl text-primary">{totalMonthly.toFixed(2).replace('.', ',')} €</span>
            </div>
            
            {/* One-time costs */}
            <div className="space-y-1 text-sm pt-3">
              <p className="font-semibold text-muted-foreground">Einmalige Kosten</p>
              
              <div className="flex justify-between text-muted-foreground">
                <span>Bereitstellung inkl. Einrichtung</span>
                {setupFeeWaived ? (
                  <span className="flex items-center gap-1">
                    <span className="line-through">99,00 €</span>
                    <span className="text-success font-medium">0,00 €</span>
                  </span>
                ) : (
                  <span>{setupFee.toFixed(2).replace('.', ',')} €</span>
                )}
              </div>
              
              {/* Router one-time price */}
              {selectedRouter && selectedRouter.id !== 'router-none' && selectedRouter.oneTimePrice > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{selectedRouter.name} (einm.)</span>
                  <span>{selectedRouter.oneTimePrice.toFixed(2).replace('.', ',')} €</span>
                </div>
              )}
              
              {/* Router One-time Discount */}
              {routerOneTimeDiscount > 0 && selectedRouter && selectedRouter.id !== 'router-none' && (
                <div className="flex justify-between text-success">
                  <span>Router-Rabatt (einm.)</span>
                  <span>-{routerOneTimeDiscount.toFixed(2).replace('.', ',')} €</span>
                </div>
              )}
              
              {/* Express activation */}
              {expressActivation && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{expressOption?.name || 'Express-Anschaltung'}</span>
                  <span>{(expressOption?.oneTimePrice || 200).toFixed(2).replace('.', ',')} €</span>
                </div>
              )}
              
              {/* TV Hardware one-time */}
              {tvSelection.hardware.filter(h => h.oneTimePrice > 0).map(hw => (
                <div key={hw.id} className="flex justify-between text-muted-foreground">
                  <span>{hw.name}</span>
                  <span>{hw.oneTimePrice.toFixed(2).replace('.', ',')} €</span>
                </div>
              ))}
              
              {tvSelection.waipuStick && (
                <div className="flex justify-between text-muted-foreground">
                  <span>waipu.tv 4K Stick</span>
                  <span>{(tvSelection.waipuStickPrice ?? 59.99).toFixed(2).replace('.', ',')} €</span>
                </div>
              )}
              
              {/* Service/Installation addons one-time */}
              {selectedAddons.filter(a => (a.oneTimePrice ?? 0) > 0).map(addon => (
                <div key={addon.id} className="flex justify-between text-muted-foreground">
                  <span>{addon.name}</span>
                  <span>{(addon.oneTimePrice ?? 0).toFixed(2).replace('.', ',')} €</span>
                </div>
              ))}
              
              {setupFeeWaived && (
                <div className="flex justify-between text-success">
                  <span>Aktionscode Ersparnis</span>
                  <span>-99,00 €</span>
                </div>
              )}
              
              {/* Referral Bonus */}
              {referralData.type === 'referral' && referralData.referralValidated && (
                <div className="flex justify-between text-success">
                  <span>Kunden werben Kunden Prämie</span>
                  <span>-50,00 €</span>
                </div>
              )}
            </div>
            
            {/* One-time Total */}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-semibold">Gesamt einmalig</span>
              <span className="font-bold text-lg">{totalOneTime.toFixed(2).replace('.', ',')} €</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-accent/5 rounded-lg border border-accent/10">
            <p className="text-xs text-center text-muted-foreground">
              {isKMU 
                ? (branding.kmu_cart_netto_label || 'Alle Preise zzgl. MwSt.')
                : 'Alle Preise inkl. MwSt.'
              }
            </p>
          </div>
        </div>
      )}

      {!selectedTariff && !address && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Wählen Sie Ihre Adresse und Ihr Produkt
        </p>
      )}
    </div>
  );
}
