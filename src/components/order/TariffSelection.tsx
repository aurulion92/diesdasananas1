import { useOrder } from '@/context/OrderContext';
import { 
  ftthTariffs, 
  limitedTariffs, 
  routerOptions, 
  cominTvOptions,
  cominTvAddons,
  cominTvHardware,
  waipuTvOptions,
  waipuTvHardware,
  phoneOptions,
  TariffOption, 
  TariffAddon 
} from '@/data/tariffs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  ArrowDown, 
  ArrowUp, 
  Globe, 
  Rocket, 
  Phone, 
  Mail,
  Tv,
  Router,
  Plus,
  Minus,
  Gift,
  Tag,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ReferralData {
  type: 'none' | 'internet' | 'social-media' | 'referral' | 'promo-code';
  referrerCustomerId?: string;
  promoCode?: string;
}

export function TariffSelection() {
  const { 
    connectionType, 
    address,
    selectedTariff, 
    setSelectedTariff, 
    selectedRouter,
    setSelectedRouter,
    tvSelection,
    setTvSelection,
    phoneSelection,
    setPhoneSelection,
    contractDuration,
    setContractDuration,
    referralData,
    setReferralData,
    appliedPromoCode,
    promoCodeError,
    applyPromoCode,
    clearPromoCode,
    getRouterDiscount,
    setStep 
  } = useOrder();

  const [promoCodeInput, setPromoCodeInput] = useState('');

  // Determine which tariffs to show based on connection type
  const tariffs = connectionType === 'ftth' ? ftthTariffs : limitedTariffs;
  const isLimited = connectionType === 'limited';
  const isFtth = connectionType === 'ftth';
  const isFiberBasic = selectedTariff?.id === 'fiber-basic-100';
  const isEinfachTariff = selectedTariff?.id?.startsWith('einfach-');

  const handleContinue = () => {
    if (selectedTariff) {
      setStep(3);
    }
  };

  const handleRouterChange = (routerId: string) => {
    const router = routerOptions.find(r => r.id === routerId) || null;
    setSelectedRouter(router);
  };

  const handleTvTypeChange = (type: 'none' | 'comin' | 'waipu') => {
    if (type === 'none') {
      setTvSelection({
        type: 'none',
        package: null,
        hdAddon: null,
        hardware: [],
        waipuStick: false,
      });
    } else if (type === 'comin') {
      setTvSelection({
        type: 'comin',
        package: cominTvOptions[0],
        hdAddon: null,
        hardware: [],
        waipuStick: false,
      });
    } else if (type === 'waipu') {
      setTvSelection({
        type: 'waipu',
        package: null,
        hdAddon: null,
        hardware: [],
        waipuStick: false,
      });
    }
  };

  const handleWaipuPackageChange = (packageId: string) => {
    const pkg = waipuTvOptions.find(p => p.id === packageId) || null;
    setTvSelection({
      ...tvSelection,
      package: pkg,
    });
  };

  const handleHdAddonChange = (addonId: string) => {
    if (addonId === 'none') {
      setTvSelection({
        ...tvSelection,
        hdAddon: null,
        hardware: [],
      });
    } else {
      const addon = cominTvAddons.find(a => a.id === addonId) || null;
      // When selecting HD addon, automatically add smartcard
      const smartcard = cominTvHardware.find(h => h.id === 'tv-smartcard');
      setTvSelection({
        ...tvSelection,
        hdAddon: addon,
        hardware: smartcard ? [smartcard] : [],
      });
    }
  };

  const handleHardwareChange = (hardwareId: string) => {
    const smartcard = cominTvHardware.find(h => h.id === 'tv-smartcard');
    const hardware = cominTvHardware.find(h => h.id === hardwareId);
    
    if (hardware) {
      // Keep smartcard, replace receiver/CI module
      setTvSelection({
        ...tvSelection,
        hardware: smartcard ? [smartcard, hardware] : [hardware],
      });
    }
  };

  const handlePhoneLinesChange = (delta: number) => {
    const newLines = Math.max(1, Math.min(10, phoneSelection.lines + delta));
    setPhoneSelection({
      ...phoneSelection,
      lines: newLines,
    });
  };

  const handleApplyPromoCode = () => {
    if (promoCodeInput.trim()) {
      applyPromoCode(promoCodeInput.trim());
    }
  };

  const routerDiscount = getRouterDiscount();

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

      {/* Vertragslaufzeit - Only for FiberBasic */}
      {selectedTariff && isFiberBasic && (
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
              <div className="text-sm text-muted-foreground">34,90 €/Monat</div>
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
              <div className="text-sm text-muted-foreground">49,90 €/Monat</div>
            </button>
          </div>
        </div>
      )}

      {/* Zusatzoptionen */}
      {selectedTariff && (
        <div className="space-y-6 animate-fade-in">
          <h3 className="font-bold text-lg text-primary">Zusatzoptionen</h3>
          
          {/* Router Dropdown */}
          <div className="bg-card rounded-xl p-5 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Router className="w-5 h-5 text-accent" />
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Router auswählen</p>
              {(isEinfachTariff || appliedPromoCode?.routerDiscount) && (
                <span className="bg-success/10 text-success text-xs px-2 py-0.5 rounded-full font-medium">
                  4€ Rabatt
                </span>
              )}
            </div>
            <Select 
              value={selectedRouter?.id || 'router-none'} 
              onValueChange={handleRouterChange}
            >
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Router auswählen" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border z-50">
                {routerOptions.map((router) => {
                  const showDiscount = (isEinfachTariff || appliedPromoCode?.routerDiscount) && 
                    router.discountedPrice !== undefined && 
                    router.discountedPrice !== router.monthlyPrice;
                  const displayPrice = showDiscount ? router.discountedPrice : router.monthlyPrice;
                  
                  return (
                    <SelectItem key={router.id} value={router.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{router.name}</span>
                        {router.monthlyPrice > 0 && (
                          <span className="text-accent ml-2">
                            {showDiscount && (
                              <span className="line-through text-muted-foreground mr-1">
                                {router.monthlyPrice.toFixed(2).replace('.', ',')} €
                              </span>
                            )}
                            {displayPrice !== undefined && displayPrice > 0 
                              ? `${displayPrice.toFixed(2).replace('.', ',')} €/Monat`
                              : displayPrice === 0 ? '0,00 €/Monat' : ''
                            }
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedRouter && selectedRouter.id !== 'router-none' && (
              <p className="text-sm text-muted-foreground mt-2">{selectedRouter.description}</p>
            )}
            {routerDiscount > 0 && selectedRouter && selectedRouter.id !== 'router-none' && (
              <p className="text-sm text-success mt-2 font-medium">
                Sie sparen {routerDiscount.toFixed(2).replace('.', ',')} €/Monat
              </p>
            )}
          </div>

          {/* TV Options - Only for FTTH */}
          {isFtth && (
            <div className="bg-card rounded-xl p-5 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Tv className="w-5 h-5 text-accent" />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">TV-Paket auswählen</p>
              </div>
              
              <RadioGroup 
                value={tvSelection.type} 
                onValueChange={(v) => handleTvTypeChange(v as 'none' | 'comin' | 'waipu')}
                className="space-y-3"
              >
                <div className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border transition-all",
                  tvSelection.type === 'none' ? "border-accent bg-accent/5" : "border-border"
                )}>
                  <RadioGroupItem value="none" id="tv-none" />
                  <Label htmlFor="tv-none" className="flex-1 cursor-pointer">Kein TV</Label>
                </div>
                
                <div className={cn(
                  "p-3 rounded-lg border transition-all",
                  tvSelection.type === 'comin' ? "border-accent bg-accent/5" : "border-border"
                )}>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="comin" id="tv-comin" />
                    <Label htmlFor="tv-comin" className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <span>COM-IN TV (Kabel TV)</span>
                        <span className="text-accent font-medium">10,00 €/Monat</span>
                      </div>
                    </Label>
                  </div>
                  
                  {tvSelection.type === 'comin' && (
                    <div className="mt-4 ml-6 space-y-4">
                      {/* HD Addon */}
                      <div>
                        <Label className="text-sm text-muted-foreground">HD-Paket (optional)</Label>
                        <Select 
                          value={tvSelection.hdAddon?.id || 'none'} 
                          onValueChange={handleHdAddonChange}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="HD-Paket wählen" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border border-border z-50">
                            <SelectItem value="none">Kein HD-Paket</SelectItem>
                            {cominTvAddons.map((addon) => (
                              <SelectItem key={addon.id} value={addon.id}>
                                <div className="flex justify-between items-center w-full gap-4">
                                  <span>{addon.name}</span>
                                  <span className="text-accent">+{addon.monthlyPrice.toFixed(2).replace('.', ',')} €/Monat</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Hardware selection - only if HD package selected */}
                      {tvSelection.hdAddon && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Hardware (erforderlich)</Label>
                          <p className="text-xs text-muted-foreground mb-2">Smartcard Aktivierung: 29,90 € einmalig</p>
                          <RadioGroup 
                            value={tvSelection.hardware.find(h => h.id !== 'tv-smartcard')?.id || ''}
                            onValueChange={handleHardwareChange}
                            className="space-y-2 mt-2"
                          >
                            <div className="flex items-center space-x-3 p-2 rounded border border-border">
                              <RadioGroupItem value="tv-receiver" id="tv-receiver" />
                              <Label htmlFor="tv-receiver" className="flex-1 cursor-pointer text-sm">
                                <div className="flex justify-between">
                                  <span>Technistar 4K ISIO (1TB) Miete</span>
                                  <span className="text-accent">4,90 €/Monat</span>
                                </div>
                              </Label>
                            </div>
                            <div className="flex items-center space-x-3 p-2 rounded border border-border">
                              <RadioGroupItem value="tv-ci-module" id="tv-ci-module" />
                              <Label htmlFor="tv-ci-module" className="flex-1 cursor-pointer text-sm">
                                <div className="flex justify-between">
                                  <span>CI+ Modul (M7) Kauf</span>
                                  <span className="text-accent">79,90 € einmalig</span>
                                </div>
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className={cn(
                  "p-3 rounded-lg border transition-all",
                  tvSelection.type === 'waipu' ? "border-accent bg-accent/5" : "border-border"
                )}>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="waipu" id="tv-waipu" />
                    <Label htmlFor="tv-waipu" className="flex-1 cursor-pointer">waipu.tv (Streaming)</Label>
                  </div>
                  
                  {tvSelection.type === 'waipu' && (
                    <div className="mt-4 ml-6 space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Paket wählen</Label>
                        <Select 
                          value={tvSelection.package?.id || ''} 
                          onValueChange={handleWaipuPackageChange}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Paket wählen" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border border-border z-50">
                            {waipuTvOptions.map((pkg) => (
                              <SelectItem key={pkg.id} value={pkg.id}>
                                <div className="flex justify-between items-center w-full gap-4">
                                  <span>{pkg.name}</span>
                                  <span className="text-accent">{pkg.monthlyPrice.toFixed(2).replace('.', ',')} €/Monat</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          id="waipu-stick" 
                          checked={tvSelection.waipuStick}
                          onCheckedChange={(checked) => setTvSelection({
                            ...tvSelection,
                            waipuStick: checked === true
                          })}
                        />
                        <Label htmlFor="waipu-stick" className="cursor-pointer">
                          <div className="flex justify-between items-center gap-4">
                            <span>waipu.tv 4K Stick</span>
                            <span className="text-accent">40,00 € einmalig</span>
                          </div>
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Telefon - Only for einfach tariffs (FiberBasic includes phone) */}
          {isEinfachTariff && (
            <div className="bg-card rounded-xl p-5 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="w-5 h-5 text-accent" />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Telefonie</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="phone-enabled" 
                    checked={phoneSelection.enabled}
                    onCheckedChange={(checked) => setPhoneSelection({
                      ...phoneSelection,
                      enabled: checked === true,
                      lines: checked ? phoneSelection.lines : 1,
                    })}
                  />
                  <Label htmlFor="phone-enabled" className="cursor-pointer flex-1">
                    <div className="flex justify-between items-center">
                      <span>Telefon-Flat Festnetz</span>
                      <span className="text-accent">2,95 €/Monat je Leitung</span>
                    </div>
                  </Label>
                </div>
                
                {phoneSelection.enabled && (
                  <div className="ml-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <Label className="text-sm">Anzahl Leitungen:</Label>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePhoneLinesChange(-1)}
                          disabled={phoneSelection.lines <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-bold">{phoneSelection.lines}</span>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePhoneLinesChange(1)}
                          disabled={phoneSelection.lines >= 10}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        = {(phoneSelection.lines * 2.95).toFixed(2).replace('.', ',')} €/Monat
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id="phone-porting" 
                        checked={phoneSelection.portingRequired}
                        onCheckedChange={(checked) => setPhoneSelection({
                          ...phoneSelection,
                          portingRequired: checked === true,
                          portingData: checked ? {
                            numberOfNumbers: 1,
                            phoneNumbers: [''],
                            previousProvider: '',
                          } : null,
                        })}
                      />
                      <Label htmlFor="phone-porting" className="cursor-pointer">
                        Rufnummernportierung gewünscht
                      </Label>
                    </div>
                    
                    {phoneSelection.portingRequired && phoneSelection.portingData && (
                      <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                        <div>
                          <Label className="text-sm">Anzahl der Rufnummern</Label>
                          <Input 
                            type="number"
                            min="1"
                            max="10"
                            value={phoneSelection.portingData.numberOfNumbers}
                            onChange={(e) => {
                              const num = parseInt(e.target.value) || 1;
                              const phoneNumbers = Array(num).fill('').map((_, i) => 
                                phoneSelection.portingData?.phoneNumbers[i] || ''
                              );
                              setPhoneSelection({
                                ...phoneSelection,
                                portingData: {
                                  ...phoneSelection.portingData!,
                                  numberOfNumbers: num,
                                  phoneNumbers,
                                }
                              });
                            }}
                            className="mt-1 w-24"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-sm">Rufnummern</Label>
                          <Textarea 
                            placeholder="Eine Rufnummer pro Zeile"
                            value={phoneSelection.portingData.phoneNumbers.join('\n')}
                            onChange={(e) => setPhoneSelection({
                              ...phoneSelection,
                              portingData: {
                                ...phoneSelection.portingData!,
                                phoneNumbers: e.target.value.split('\n'),
                              }
                            })}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-sm">Bisheriger Anbieter</Label>
                          <Input 
                            placeholder="z.B. Telekom, Vodafone..."
                            value={phoneSelection.portingData.previousProvider}
                            onChange={(e) => setPhoneSelection({
                              ...phoneSelection,
                              portingData: {
                                ...phoneSelection.portingData!,
                                previousProvider: e.target.value,
                              }
                            })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FiberBasic Hinweis */}
          {isFiberBasic && (
            <div className="bg-success/10 border border-success/20 rounded-xl p-4">
              <p className="text-sm text-success font-medium">
                ✓ Telefon-Flat ins deutsche Festnetz ist bereits inklusive
              </p>
            </div>
          )}

          {/* Referral / Promo Code Section */}
          <div className="bg-card rounded-xl p-5 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-accent" />
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Wie sind Sie auf uns aufmerksam geworden?</p>
            </div>
            
            <RadioGroup 
              value={referralData.type} 
              onValueChange={(v) => {
                setReferralData({ type: v as ReferralData['type'] });
                if (v !== 'promo-code') {
                  clearPromoCode();
                  setPromoCodeInput('');
                }
              }}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-2">
                <RadioGroupItem value="none" id="ref-none" />
                <Label htmlFor="ref-none" className="cursor-pointer">Keine Angabe</Label>
              </div>
              
              <div className="flex items-center space-x-3 p-2">
                <RadioGroupItem value="internet" id="ref-internet" />
                <Label htmlFor="ref-internet" className="cursor-pointer">Internet / Webseite</Label>
              </div>
              
              <div className="flex items-center space-x-3 p-2">
                <RadioGroupItem value="social-media" id="ref-social" />
                <Label htmlFor="ref-social" className="cursor-pointer">Social Media</Label>
              </div>
              
              <div className={cn(
                "p-3 rounded-lg border transition-all",
                referralData.type === 'referral' ? "border-accent bg-accent/5" : "border-border"
              )}>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="referral" id="ref-referral" />
                  <Label htmlFor="ref-referral" className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2">
                      <span>Kunden werben Kunden</span>
                      <span className="bg-success/10 text-success text-xs px-2 py-0.5 rounded-full font-medium">
                        50€ Prämie
                      </span>
                    </div>
                  </Label>
                </div>
                
                {referralData.type === 'referral' && (
                  <div className="mt-4 ml-6 space-y-3">
                    <div className="bg-success/10 rounded-lg p-3">
                      <p className="text-sm text-success">
                        🎁 Sie erhalten <strong>50€</strong> Prämie und der Werber erhält ebenfalls <strong>50€</strong>!
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm">Kundennummer des Werbers</Label>
                      <Input 
                        placeholder="z.B. 123456"
                        value={referralData.referrerCustomerId || ''}
                        onChange={(e) => setReferralData({
                          ...referralData,
                          referrerCustomerId: e.target.value,
                        })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className={cn(
                "p-3 rounded-lg border transition-all",
                referralData.type === 'promo-code' ? "border-accent bg-accent/5" : "border-border"
              )}>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="promo-code" id="ref-promo" />
                  <Label htmlFor="ref-promo" className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span>Aktionscode</span>
                    </div>
                  </Label>
                </div>
                
                {referralData.type === 'promo-code' && (
                  <div className="mt-4 ml-6 space-y-3">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Aktionscode eingeben"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                        className="flex-1"
                      />
                      <Button onClick={handleApplyPromoCode} variant="outline">
                        Einlösen
                      </Button>
                    </div>
                    
                    {promoCodeError && (
                      <div className="flex items-center gap-2 text-destructive text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{promoCodeError}</span>
                      </div>
                    )}
                    
                    {appliedPromoCode && (
                      <div className="bg-success/10 rounded-lg p-3">
                        <p className="text-sm text-success font-medium mb-1">
                          ✓ Aktionscode "{appliedPromoCode.code}" eingelöst
                        </p>
                        <p className="text-sm text-success">
                          {appliedPromoCode.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4 pt-4">
        <Button 
          variant="outline" 
          onClick={() => setStep(1)}
          className="h-12 px-8 rounded-full"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Button>
        
        {selectedTariff && (
          <Button 
            onClick={handleContinue} 
            size="lg" 
            variant="orange" 
            className="flex-1 h-12"
          >
            Weiter zu Ihren Daten
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
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
