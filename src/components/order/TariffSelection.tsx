import { useOrder } from '@/context/OrderContext';
import { useOrderPromotions } from '@/hooks/useOrderPromotions';
import { useBuildingProducts, DatabaseProduct } from '@/hooks/useBuildingProducts';
import { useProductOptions, type ProductOptionMapping } from '@/hooks/useProductOptions';
import { 
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
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Loader2,
  Wrench,
  ExternalLink,
  HardHat,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { PhoneBookOptions } from '@/components/order/PhoneBookOptions';
import { ContactForm } from '@/components/order/ContactForm';
import { ImageGalleryDialog } from '@/components/order/ImageGalleryDialog';

interface ReferralData {
  type: 'none' | 'internet' | 'social-media' | 'referral' | 'promo-code';
  referrerCustomerId?: string;
  referralValidated?: boolean;
  referralError?: string;
  promoCode?: string;
}

// Convert database product to TariffOption format
// IMPORTANT: id is now the product UUID from the database, not the slug
function dbProductToTariffOption(product: DatabaseProduct): TariffOption & { 
  contractMonths: number; 
  externalLinkUrl?: string; 
  externalLinkLabel?: string; 
} {
  const speedNum = product.download_speed || 0;
  
  // Use display_name if set, otherwise fall back to old logic
  let displayName: string;
  if (product.display_name) {
    displayName = product.display_name;
  } else {
    // Legacy fallback: use speed number for "einfach" products
    const isEinfachProduct = product.name.toLowerCase().startsWith('einfach');
    displayName = isEinfachProduct ? speedNum.toString() : product.name;
  }
  
  return {
    id: product.id, // Use UUID instead of slug for reliable option lookups
    name: product.name,
    displayName,
    speed: speedNum > 0 ? `${speedNum} Mbit/s` : '',
    downloadSpeed: product.download_speed || 0,
    uploadSpeed: product.upload_speed || 0,
    monthlyPrice: product.monthly_price,
    monthlyPrice12: product.monthly_price * 1.4, // Approximate 12-month pricing
    setupFee: product.setup_fee,
    description: product.includes_phone ? 'Internet + Telefon-Flatrate' : product.description || 'Internet-Flatrate',
    features: speedNum > 0 ? [
      `${product.download_speed} Mbit/s Download`,
      `${product.upload_speed} Mbit/s Upload`,
      'Flatrate',
      'IPv4 & IPv6',
      ...(product.includes_phone ? ['Telefonie-Flat ins dt. Festnetz'] : [])
    ] : [product.description || 'Spezialtarif'],
    includesPhone: product.includes_phone,
    contractMonths: product.contract_months || 24,
    externalLinkUrl: product.external_link_url || undefined,
    externalLinkLabel: product.external_link_label || undefined,
  };
}

// Map database router options to TariffAddon format
const NO_ROUTER_ADDON: TariffAddon = {
  id: 'router-none',
  name: 'Kein Router',
  description: 'Ich habe bereits einen eigenen Router',
  monthlyPrice: 0,
  discountedPrice: 0,
  oneTimePrice: 0,
  category: 'router',
};

function dbRouterOptionToAddon(mapping: ProductOptionMapping): TariffAddon {
  const { option } = mapping;

  return {
    id: `router-${option.slug}`,
    databaseId: option.id, // Store UUID for promotion matching
    name: option.name,
    description: option.description || '',
    monthlyPrice: option.monthly_price ?? 0,
    oneTimePrice: option.one_time_price ?? 0,
    category: 'router',
  };
}

// Convert database option to TariffAddon for service/installation options
function dbOptionToTariffAddon(option: any): TariffAddon {
  return {
    id: option.id,
    databaseId: option.id,
    name: option.name,
    description: option.description || '',
    monthlyPrice: option.monthly_price ?? 0,
    oneTimePrice: option.one_time_price ?? 0,
    category: option.category,
  };
}

interface TariffSelectionProps {
  customerType?: 'pk' | 'kmu';
}

export function TariffSelection({ customerType = 'pk' }: TariffSelectionProps) {
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
    selectedAddons,
    toggleAddon,
    contractDuration,
    setContractDuration,
    referralData,
    setReferralData,
    validateReferralCustomerId,
    appliedPromoCode,
    promoCodeError,
    applyPromoCode,
    clearPromoCode,
    setStep 
  } = useOrder();

  // Use promotions from database
  const { 
    totalRouterDiscount, 
    hasRouterDiscount,
    getPromotedRouterPrice 
  } = useOrderPromotions();

  // Fetch products from database based on building AND customer type
  const buildingId = (address as any)?.buildingId;
  const ausbauart = (address as any)?.ausbauart;
  const { products: dbProducts, loading: productsLoading, hasManualAssignment } = useBuildingProducts(buildingId, ausbauart, customerType);

  // Fetch options assigned to the selected product
  // Pass buildingId to filter building-restricted options
  const { 
    hasOptionsAssigned,
    routerOptions,
    phoneOptions: dbPhoneOptions,
    tvCominOptions,
    tvWaipuOptions,
    tvHardwareOptions,
    serviceOptions,
    installationOptions,
  } = useProductOptions(selectedTariff?.id || null, buildingId, customerType);

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [showFiberBasic, setShowFiberBasic] = useState(false);
  const [showLimitedContactForm, setShowLimitedContactForm] = useState(false);

  // Convert database products to TariffOption format
  const databaseTariffs = dbProducts.map(dbProductToTariffOption);

  // Determine which tariffs to show
  // hide_for_ftth filtering applies ALWAYS for FTTH connections, regardless of manual assignment
  const isFtthConnection = connectionType === 'ftth';
  
  const baseTariffs = databaseTariffs.filter(t => {
    const dbProduct = dbProducts.find(p => p.id === t.id);
    // Hide products for FTTH connections when hide_for_ftth is true
    return !(isFtthConnection && dbProduct?.hide_for_ftth);
  });
  
  const hiddenTariffs = databaseTariffs.filter(t => {
    const dbProduct = dbProducts.find(p => p.id === t.id);
    return isFtthConnection && dbProduct?.hide_for_ftth;
  });

  const tariffs = showFiberBasic ? [...baseTariffs, ...hiddenTariffs] : baseTariffs;
  
  const isLimited = connectionType === 'limited';
  const isFtth = connectionType === 'ftth';
  
  // Get the selected product from database to check its properties
  const selectedDbProduct = selectedTariff ? dbProducts.find(p => p.id === selectedTariff.id) : null;
  
  // Check if selected product includes phone (via includes_phone flag)
  const productIncludesPhone = selectedDbProduct?.includes_phone === true;
  
  // Check if it's a FiberBasic product (by slug) for legacy compatibility
  const isFiberBasic = selectedDbProduct?.slug?.toLowerCase().includes('fiber-basic') || false;
  
  // Check if it's an "einfach" tariff (by slug or name)
  const isEinfachTariff = selectedDbProduct?.slug?.toLowerCase().startsWith('einfach') || 
                          selectedDbProduct?.name?.toLowerCase().startsWith('einfach') || false;
  
  const hasKabelTv = address?.kabelTvAvailable === true;

  // Determine option availability based on product_option_mappings
  // ALL options must come from the database - no legacy fallback
  const hasRouterDbOptions = routerOptions.length > 0;
  const hasTvDbOptions = tvCominOptions.length > 0 || tvWaipuOptions.length > 0;
  const hasPhoneDbOptions = dbPhoneOptions.length > 0;

  // Build available routers list: ONLY from database options, filtered by connection type
  let availableRouters: TariffAddon[] = [];

  if (hasRouterDbOptions && connectionType && connectionType !== 'not-connected') {
    // FTTH and ftth_limited both use FTTH routers
    const isFtthConnection = connectionType === 'ftth' || connectionType === 'limited';

    const dbRouters = routerOptions
      .filter(({ option }) => {
        // Filter routers by infrastructure flags from database
        // Router must have the matching flag set to true
        if (isFtthConnection) return option.is_ftth === true;
        return option.is_fttb === true;
      })
      .map(dbRouterOptionToAddon);

    if (dbRouters.length > 0) {
      availableRouters = [NO_ROUTER_ADDON, ...dbRouters];
    }
  }

  // Show options ONLY if they are assigned in the database
  const showRouterOptions = availableRouters.length > 0;
  const showTvOptions = hasTvDbOptions;
  const showPhoneOptions = hasPhoneDbOptions;

  // Reset router when connection type changes
  useEffect(() => {
    if (selectedRouter && selectedRouter.id !== 'router-none') {
      const routerStillAvailable = availableRouters.some(r => r.id === selectedRouter.id);
      if (!routerStillAvailable) {
        setSelectedRouter(null);
      }
    }
  }, [connectionType, availableRouters, selectedRouter, setSelectedRouter]);

  const handleContinue = () => {
    if (selectedTariff) {
      setStep(3);
    }
  };

  const handleRouterChange = (routerId: string) => {
    const router = availableRouters.find(r => r.id === routerId) || null;
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
      // Use first COM-IN TV option from database
      const firstCominOption = tvCominOptions[0];
      setTvSelection({
        type: 'comin',
        package: firstCominOption ? {
          id: firstCominOption.option.slug,
          name: firstCominOption.option.name,
          description: firstCominOption.option.description || '',
          monthlyPrice: firstCominOption.option.monthly_price ?? 0,
          oneTimePrice: firstCominOption.option.one_time_price ?? 0,
          category: 'tv',
        } : null,
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
    const mapping = tvWaipuOptions.find(m => m.option.slug === packageId);
    if (mapping) {
      setTvSelection({
        ...tvSelection,
        package: {
          id: mapping.option.slug,
          name: mapping.option.name,
          description: mapping.option.description || '',
          monthlyPrice: mapping.option.monthly_price ?? 0,
          oneTimePrice: mapping.option.one_time_price ?? 0,
          category: 'tv',
        },
      });
    }
  };

  const handleHdAddonChange = (addonId: string) => {
    if (addonId === 'none') {
      setTvSelection({
        ...tvSelection,
        hdAddon: null,
        hardware: [],
      });
    } else {
      // Find HD addon from database TV COM-IN options (Basis HD, Family HD have parent comin-tv)
      const addonMapping = tvCominOptions.find(m => m.option.slug === addonId);
      // Find smartcard from hardware options
      const smartcardMapping = tvHardwareOptions.find(m => m.option.slug.includes('smartcard'));
      
      setTvSelection({
        ...tvSelection,
        hdAddon: addonMapping ? {
          id: addonMapping.option.slug,
          name: addonMapping.option.name,
          description: addonMapping.option.description || '',
          monthlyPrice: addonMapping.option.monthly_price ?? 0,
          oneTimePrice: addonMapping.option.one_time_price ?? 0,
          category: 'tv-addon',
        } : null,
        hardware: smartcardMapping ? [{
          id: smartcardMapping.option.slug,
          name: smartcardMapping.option.name,
          description: smartcardMapping.option.description || '',
          monthlyPrice: smartcardMapping.option.monthly_price ?? 0,
          oneTimePrice: smartcardMapping.option.one_time_price ?? 0,
          category: 'tv-hardware',
        }] : [],
      });
    }
  };

  const handleHardwareChange = (hardwareId: string) => {
    const smartcardMapping = tvHardwareOptions.find(m => m.option.slug.includes('smartcard'));
    const hardwareMapping = tvHardwareOptions.find(m => m.option.slug === hardwareId);
    
    if (hardwareMapping) {
      const smartcard = smartcardMapping ? {
        id: smartcardMapping.option.slug,
        name: smartcardMapping.option.name,
        description: smartcardMapping.option.description || '',
        monthlyPrice: smartcardMapping.option.monthly_price ?? 0,
        oneTimePrice: smartcardMapping.option.one_time_price ?? 0,
        category: 'tv-hardware' as const,
      } : null;
      
      const hardware = {
        id: hardwareMapping.option.slug,
        name: hardwareMapping.option.name,
        description: hardwareMapping.option.description || '',
        monthlyPrice: hardwareMapping.option.monthly_price ?? 0,
        oneTimePrice: hardwareMapping.option.one_time_price ?? 0,
        category: 'tv-hardware' as const,
      };
      
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

  const handleValidateReferral = () => {
    if (referralInput.trim()) {
      validateReferralCustomerId(referralInput.trim());
    }
  };

  const routerDiscount = totalRouterDiscount;

  return (
    <div className="space-y-10 animate-slide-up">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">
          {hasManualAssignment 
            ? 'Verfügbare Produkte an Ihrer Adresse'
            : isLimited 
              ? 'Verfügbarer Tarif' 
              : 'einfach Internet - unsere neuen Internet Produkte'}
        </h2>
        <p className="text-muted-foreground">
          {hasManualAssignment
            ? 'Folgende Produkte sind speziell für Ihre Adresse verfügbar'
            : isLimited 
              ? 'An Ihrer Adresse ist folgender Tarif verfügbar' 
              : 'Wählen Sie das passende Produkt für Ihre Bedürfnisse'}
        </p>
      </div>

      {/* Loading State */}
      {productsLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Tarif-Karten */}
      {!productsLoading && tariffs.length > 0 && (
        <div className={cn(
          "grid gap-5 justify-center",
          tariffs.length === 1 && "max-w-md mx-auto grid-cols-1",
          tariffs.length === 2 && "md:grid-cols-2 max-w-2xl mx-auto",
          tariffs.length === 3 && "md:grid-cols-3 max-w-4xl mx-auto",
          tariffs.length >= 4 && "md:grid-cols-2 lg:grid-cols-4"
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
      )}

      {/* No products available */}
      {!productsLoading && tariffs.length === 0 && (
        <div className="bg-muted border border-border rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">Keine Produkte verfügbar</h3>
          <p className="text-muted-foreground">
            An Ihrer Adresse sind derzeit keine Produkte verfügbar. Bitte kontaktieren Sie uns.
          </p>
        </div>
      )}

      {/* "Weitere Produkte" Button - nur wenn es versteckte Produkte bei FTTH gibt */}
      {!productsLoading && hiddenTariffs.length > 0 && !showFiberBasic && isFtth && (
        <div className="text-center">
          <button
            onClick={() => setShowFiberBasic(true)}
            className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
          >
            <ChevronDown className="w-4 h-4" />
            Weitere Produkte anzeigen
          </button>
        </div>
      )}

      {/* Hinweis bei eingeschränkter Verfügbarkeit */}
      {isLimited && (
        <div className="space-y-4">
          <div className="bg-accent/10 border border-accent/20 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <Phone className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1">
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
                    href="mailto:kontakt@comin-glasfaser.de" 
                    className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
                  >
                    <Mail className="w-4 h-4" />
                    kontakt@comin-glasfaser.de
                  </a>
                  <button 
                    onClick={() => setShowLimitedContactForm(!showLimitedContactForm)}
                    className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
                  >
                    <Mail className="w-4 h-4" />
                    {showLimitedContactForm ? 'Formular schließen' : 'Kontaktformular öffnen'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {showLimitedContactForm && address && (
            <ContactForm 
              reason="limited-tariff" 
              address={{ 
                street: address.street, 
                houseNumber: address.houseNumber, 
                city: address.city || 'Falkensee' 
              }} 
            />
          )}
        </div>
      )}

      {/* Vertragslaufzeit wird durch das gewählte Produkt bestimmt (contract_months) */}

      {/* Zusatzoptionen */}
      {selectedTariff && (
        <div className="space-y-6 animate-fade-in">
          <h3 className="font-bold text-lg text-primary">Zusatzoptionen</h3>
          
          {/* Router Dropdown - only show if product has router options or no options assigned (legacy) */}
          {showRouterOptions && (
            <div className="bg-card rounded-xl p-5 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Router className="w-5 h-5 text-accent" />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Router auswählen</p>
                {routerDiscount > 0 && (
                  <span className="bg-success/10 text-success text-xs px-2 py-0.5 rounded-full font-medium">
                    {routerDiscount}€ Rabatt
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
                  {availableRouters.map((router) => {
                    // Calculate display price based on promotion discount
                    const hasDiscount = routerDiscount > 0 && router.monthlyPrice > 0;
                    const displayPrice = hasDiscount 
                      ? Math.max(0, router.monthlyPrice - routerDiscount)
                      : router.monthlyPrice;
                    
                    return (
                      <SelectItem key={router.id} value={router.id}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{router.name}</span>
                          {router.monthlyPrice > 0 && (
                            <span className="text-accent ml-2">
                              {hasDiscount && (
                                <span className="line-through text-muted-foreground mr-1">
                                  {router.monthlyPrice.toFixed(2).replace('.', ',')} €
                                </span>
                              )}
                              {displayPrice > 0 
                                ? `${displayPrice.toFixed(2).replace('.', ',')} €/Monat`
                                : '0,00 €/Monat'
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
                <div className="mt-3 flex items-start gap-4">
                  {/* Router image gallery - find from routerOptions mapping */}
                  {(() => {
                    const selectedSlug = selectedRouter.id.replace('router-', '');
                    const routerMapping = routerOptions.find(m => m.option.slug === selectedSlug);
                    // Use image_urls array if available, otherwise fall back to single image_url
                    const imageUrls = routerMapping?.option.image_urls?.length 
                      ? routerMapping.option.image_urls 
                      : routerMapping?.option.image_url 
                        ? [routerMapping.option.image_url] 
                        : [];
                    
                    if (imageUrls.length > 0) {
                      return (
                        <ImageGalleryDialog 
                          images={imageUrls} 
                          alt={selectedRouter.name} 
                        />
                      );
                    }
                    return null;
                  })()}
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{selectedRouter.description}</p>
                    {routerDiscount > 0 && (
                      <p className="text-sm text-success mt-1 font-medium">
                        Sie sparen {routerDiscount.toFixed(2).replace('.', ',')} €/Monat
                      </p>
                    )}
                  </div>
                </div>
              )}
              {/* Router availability hint - only show if there are actual routers (not just "Kein Router") */}
              {availableRouters.filter(r => r.id !== 'router-none').length > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  Verfügbar: {availableRouters.filter(r => r.id !== 'router-none').map(r => r.name).join(' oder ')}
                </p>
              )}
            </div>
          )}

          {/* TV Options - Only show if product has TV options or no options assigned */}
          {showTvOptions && selectedTariff && (
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
                
                {/* COM-IN TV - nur bei FTTH UND Kabel TV verfügbar, und wenn COM-IN TV Optionen zugewiesen sind */}
                {isFtth && hasKabelTv && tvCominOptions.length > 0 && (
                  <div className={cn(
                    "p-3 rounded-lg border transition-all",
                    tvSelection.type === 'comin' ? "border-accent bg-accent/5" : "border-border"
                  )}>
                    {(() => {
                      // Find the base COM-IN TV option (no parent or parent not containing 'comin-tv')
                      const baseOption = tvCominOptions.find(m => 
                        !m.option.parent_option_slug?.includes('comin-tv')
                      );
                      return (
                        <>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="comin" id="tv-comin" />
                            <Label htmlFor="tv-comin" className="flex-1 cursor-pointer">
                              <div className="flex justify-between items-center">
                                <span>{baseOption?.option.name || 'COM-IN TV'}</span>
                                <span className="text-accent font-medium">
                                  {(baseOption?.option.monthly_price ?? 0).toFixed(2).replace('.', ',')} €/Monat
                                </span>
                              </div>
                            </Label>
                          </div>
                          {/* Info text displayed below from database */}
                          {(baseOption?.option.info_text || baseOption?.option.description) && (
                            <p className="text-sm text-muted-foreground mt-1 ml-7">
                              {baseOption.option.info_text || baseOption.option.description}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  
                    {tvSelection.type === 'comin' && (
                      <div className="mt-4 ml-6 space-y-4">
                        {/* HD Addon - from database (Basis HD, Family HD are in tv_comin category with parent comin-tv) */}
                        {tvCominOptions.filter(m => m.option.parent_option_slug?.includes('comin-tv')).length > 0 && (
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
                                {tvCominOptions
                                  .filter(m => m.option.parent_option_slug?.includes('comin-tv'))
                                  .map((mapping) => (
                                    <SelectItem key={mapping.option.slug} value={mapping.option.slug}>
                                      <div className="flex justify-between items-center w-full gap-4">
                                        <span>{mapping.option.name}</span>
                                        <span className="text-accent">
                                          {mapping.option.monthly_price ? `+${mapping.option.monthly_price.toFixed(2).replace('.', ',')} €/Monat` : ''}
                                          {mapping.option.one_time_price ? `${mapping.option.one_time_price.toFixed(2).replace('.', ',')} € einmalig` : ''}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            {/* Info text and external link for selected HD package */}
                            {tvSelection.hdAddon && (() => {
                              const selectedHd = tvCominOptions.find(m => m.option.slug === tvSelection.hdAddon?.id);
                              if (!selectedHd) return null;
                              return (
                                <div className="mt-2 space-y-1">
                                  {(selectedHd.option.info_text || selectedHd.option.description) && (
                                    <p className="text-sm text-muted-foreground">
                                      {selectedHd.option.info_text || selectedHd.option.description}
                                    </p>
                                  )}
                                  {selectedHd.option.external_link_url && (
                                    <a 
                                      href={selectedHd.option.external_link_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                      {selectedHd.option.external_link_label || 'Mehr Info'}
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        
                        {/* Hardware selection - only if HD package selected */}
                        {tvSelection.hdAddon && (
                          <div>
                            <Label className="text-sm text-muted-foreground">Hardware (erforderlich)</Label>
                            {(() => {
                              const smartcard = tvHardwareOptions.find(m => m.option.slug.includes('smartcard'));
                              return smartcard && (
                                <p className="text-xs text-muted-foreground mb-2">
                                  {smartcard.option.name}: {(smartcard.option.one_time_price ?? 0).toFixed(2).replace('.', ',')} € einmalig
                                </p>
                              );
                            })()}
                            <RadioGroup 
                              value={tvSelection.hardware.find(h => !h.id.includes('smartcard'))?.id || ''}
                              onValueChange={handleHardwareChange}
                              className="space-y-2 mt-2"
                            >
                              {tvHardwareOptions
                                .filter(m => {
                                  // Filter hardware options that have selected HD addon in their parent_option_slug
                                  const selectedHdSlug = tvSelection.hdAddon?.id;
                                  if (!selectedHdSlug) return false;
                                  if (m.option.slug.includes('smartcard')) return false;
                                  // Check if parent_option_slug includes the selected HD addon
                                  return m.option.parent_option_slug?.some(parent => 
                                    parent.toLowerCase().includes(selectedHdSlug.toLowerCase()) ||
                                    selectedHdSlug.toLowerCase().includes(parent.toLowerCase())
                                  );
                                })
                                .map((mapping) => (
                                  <div key={mapping.option.slug} className="space-y-1">
                                    <div className="flex items-center space-x-3 p-2 rounded border border-border">
                                      <RadioGroupItem value={mapping.option.slug} id={mapping.option.slug} />
                                      {mapping.option.image_url && (
                                        <img 
                                          src={mapping.option.image_url} 
                                          alt={mapping.option.name}
                                          className="w-10 h-10 object-contain rounded"
                                        />
                                      )}
                                      <Label htmlFor={mapping.option.slug} className="flex-1 cursor-pointer text-sm">
                                        <div className="flex justify-between">
                                          <span>{mapping.option.name}</span>
                                          <span className="text-accent">
                                            {mapping.option.monthly_price ? `${mapping.option.monthly_price.toFixed(2).replace('.', ',')} €/Monat` : ''}
                                            {mapping.option.one_time_price ? `${mapping.option.one_time_price.toFixed(2).replace('.', ',')} € einmalig` : ''}
                                          </span>
                                        </div>
                                      </Label>
                                    </div>
                                    {mapping.option.info_text && (
                                      <p className="text-xs text-muted-foreground ml-2">
                                        {mapping.option.info_text}
                                      </p>
                                    )}
                                  </div>
                                ))}
                            </RadioGroup>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* FTTB hint for COM-IN TV */}
                {!isFtth && tvCominOptions.length > 0 && (
                  <div className="p-3 rounded-lg border border-border bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      COM-IN TV (Kabel TV) ist an Ihrem Standort leider nicht verfügbar. 
                      Wählen Sie alternativ waipu.tv Streaming.
                    </p>
                  </div>
                )}
                
                {/* waipu.tv - from database */}
                {tvWaipuOptions.length > 0 && (
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
                              {tvWaipuOptions.map((mapping) => (
                                <SelectItem key={mapping.option.slug} value={mapping.option.slug}>
                                  <div className="flex justify-between items-center w-full gap-4">
                                    <span>{mapping.option.name}</span>
                                    <span className="text-accent">{(mapping.option.monthly_price ?? 0).toFixed(2).replace('.', ',')} €/Monat</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {/* Info text and external link displayed below dropdown */}
                          {tvSelection.package && (() => {
                            const selectedMapping = tvWaipuOptions.find(m => m.option.slug === tvSelection.package?.id);
                            if (!selectedMapping) return null;
                            return (
                              <div className="mt-2 space-y-1">
                                {selectedMapping.option.info_text && (
                                  <p className="text-sm text-muted-foreground">
                                    {selectedMapping.option.info_text}
                                  </p>
                                )}
                                {selectedMapping.option.external_link_url && (
                                  <a 
                                    href={selectedMapping.option.external_link_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    {selectedMapping.option.external_link_label || 'Mehr Info'}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        
                        {/* waipu.tv 4K Stick - from database, only show if a waipu package is selected */}
                        {tvSelection.package && tvHardwareOptions
                          .filter(m => {
                            // Check if this hardware requires a waipu parent AND if a matching parent is selected
                            const waipuParents = m.option.parent_option_slug?.filter(p => p.includes('waipu')) || [];
                            if (waipuParents.length === 0) return false;
                            // Check if the selected package's slug matches one of the required parents
                            return waipuParents.includes(tvSelection.package?.id || '');
                          })
                          .map((stickMapping) => (
                            <div key={stickMapping.option.slug} className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <Checkbox 
                                  id={stickMapping.option.slug}
                                  checked={tvSelection.waipuStick}
                                  onCheckedChange={(checked) => setTvSelection({
                                    ...tvSelection,
                                    waipuStick: checked === true,
                                    waipuStickPrice: checked === true ? (stickMapping.option.one_time_price ?? 59.99) : undefined
                                  })}
                                />
                                {/* Image thumbnail with gallery */}
                                {(stickMapping.option.image_urls?.length > 0 || stickMapping.option.image_url) && (
                                  <ImageGalleryDialog
                                    images={stickMapping.option.image_urls?.length > 0 
                                      ? stickMapping.option.image_urls 
                                      : [stickMapping.option.image_url!]}
                                    alt={stickMapping.option.name}
                                    triggerClassName="w-12 h-12 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                                  />
                                )}
                                <Label htmlFor={stickMapping.option.slug} className="cursor-pointer flex-1">
                                  <div className="flex justify-between items-center gap-4">
                                    <span>{stickMapping.option.name}</span>
                                    <span className="text-accent">{(stickMapping.option.one_time_price ?? 0).toFixed(2).replace('.', ',')} € einmalig</span>
                                  </div>
                                </Label>
                              </div>
                              {/* Info text below */}
                              {stickMapping.option.info_text && (
                                <p className="text-sm text-muted-foreground ml-8">
                                  {stickMapping.option.info_text}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </RadioGroup>
            </div>
          )}

          {/* Telefon - Show if product has phone options assigned in database */}
          {showPhoneOptions && dbPhoneOptions.length > 0 && (
            <div className="bg-card rounded-xl p-5 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="w-5 h-5 text-accent" />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Telefonie</p>
              </div>
              
              <div className="space-y-4">
                {/* Phone option selection as RadioGroup */}
                <RadioGroup 
                  value={phoneSelection.enabled && phoneSelection.selectedOptionId ? phoneSelection.selectedOptionId : 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setPhoneSelection({
                        ...phoneSelection,
                        enabled: false,
                        selectedOptionId: null,
                        selectedOptionName: null,
                        selectedOptionPrice: 0,
                        lines: 1,
                      });
                    } else {
                      // Find the selected option to get its name and price
                      const selectedMapping = dbPhoneOptions.find(m => m.option.id === value);
                      setPhoneSelection({
                        ...phoneSelection,
                        enabled: true,
                        selectedOptionId: value,
                        selectedOptionName: selectedMapping?.option.name || null,
                        selectedOptionPrice: selectedMapping?.option.monthly_price ?? 0,
                        lines: phoneSelection.lines || 1,
                      });
                    }
                  }}
                  className="space-y-2"
                >
                  {/* No phone option */}
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="none" id="phone-none" />
                    <Label htmlFor="phone-none" className="cursor-pointer flex-1">
                      <span>Keine Telefonie</span>
                    </Label>
                  </div>
                  
                  {/* All available phone options */}
                  {dbPhoneOptions.map((mapping) => {
                    const phoneOption = mapping.option;
                    const phonePrice = phoneOption.monthly_price ?? 0;
                    const phoneInfoText = phoneOption.info_text;
                    
                    return (
                      <div key={mapping.option_id} className="flex items-center space-x-3">
                        <RadioGroupItem value={phoneOption.id} id={`phone-${phoneOption.id}`} />
                        <Label htmlFor={`phone-${phoneOption.id}`} className="cursor-pointer flex-1">
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-2">
                              {phoneOption.name}
                              {phoneInfoText && <InfoTooltip text={phoneInfoText} />}
                            </span>
                            <span className="text-accent">{phonePrice.toFixed(2).replace('.', ',')} €/Monat je Leitung</span>
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
                
                {phoneSelection.enabled && phoneSelection.selectedOptionId && (
                  <div className="ml-6 space-y-4">
                    {/* Get selected phone option price */}
                    {(() => {
                      const selectedPhoneMapping = dbPhoneOptions.find(m => m.option.id === phoneSelection.selectedOptionId);
                      const phonePrice = selectedPhoneMapping?.option.monthly_price ?? 0;
                      
                      return (
                        <>
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
                              = {(phoneSelection.lines * phonePrice).toFixed(2).replace('.', ',')} €/Monat
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
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phone included hint - show when product includes phone */}
          {productIncludesPhone && (
            <div className="bg-success/10 border border-success/20 rounded-xl p-4">
              <p className="text-sm text-success font-medium">
                ✓ Telefon-Flat ins deutsche Festnetz ist bereits inklusive
              </p>
            </div>
          )}

          {/* Phone Book Options - Show when phone is included in product OR phone option is enabled */}
          {(phoneSelection.enabled || productIncludesPhone) && (
            <PhoneBookOptions
              data={phoneSelection}
              onChange={setPhoneSelection}
            />
          )}

          {/* Service-Leistungen - Options with category 'service' */}
          {serviceOptions.length > 0 && (
            <div className="bg-card rounded-xl p-5 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="w-5 h-5 text-accent" />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Persönlicher Service bei COM-IN</p>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                {serviceOptions.map(({ option }) => {
                  const isSelected = selectedAddons.some(a => a.id === option.id);
                  const hasPrice = (option.one_time_price ?? 0) > 0 || (option.monthly_price ?? 0) > 0;
                  
                  return (
                    <div 
                      key={option.id} 
                      className={cn(
                        "relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden bg-gradient-to-br from-background to-muted/30",
                        isSelected 
                          ? "border-accent shadow-lg shadow-accent/20" 
                          : "border-border hover:border-accent/50 hover:shadow-md"
                      )}
                      onClick={() => toggleAddon(dbOptionToTariffAddon(option))}
                    >
                      {/* Selection indicator */}
                      <div className={cn(
                        "absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected 
                          ? "bg-accent border-accent" 
                          : "border-muted-foreground/30"
                      )}>
                        {isSelected && <Check className="w-4 h-4 text-accent-foreground" />}
                      </div>
                      
                      <div className="p-4">
                        {/* Image if available */}
                        {option.image_url && (
                          <div className="mb-3 rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center p-2">
                            <img src={option.image_url} alt={option.name} className="max-h-20 object-contain" />
                          </div>
                        )}
                        
                        {/* Title */}
                        <div className="flex items-start gap-2 mb-2 pr-8">
                          <h4 className="font-semibold text-foreground">{option.name}</h4>
                          {option.info_text && <InfoTooltip text={option.info_text} />}
                        </div>
                        
                        {/* Description */}
                        {option.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-4 whitespace-pre-line">{option.description}</p>
                        )}
                        
                        {/* External link */}
                        {option.external_link_url && (
                          <a 
                            href={option.external_link_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm inline-flex items-center gap-1 mb-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {option.external_link_label || 'Mehr erfahren'}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        
                        {/* Price */}
                        {hasPrice && (
                          <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border/50">
                            <span className="inline-flex items-center gap-1 bg-accent text-accent-foreground font-semibold px-3 py-1.5 rounded-lg text-sm">
                              {(option.one_time_price ?? 0) > 0 && `${option.one_time_price?.toFixed(2).replace('.', ',')} €`}
                              {(option.monthly_price ?? 0) > 0 && `${option.monthly_price?.toFixed(2).replace('.', ',')} €/Monat`}
                            </span>
                            {(option.one_time_price ?? 0) > 0 && (
                              <span className="text-xs text-muted-foreground">einmalig</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Installations-Service - Options with category 'installation' */}
          {installationOptions.length > 0 && (
            <div className="bg-card rounded-xl p-5 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Home className="w-5 h-5 text-accent" />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Glasfaserinstallation für zu Hause</p>
              </div>
              
              <div className="space-y-4">
                {installationOptions.map(({ option }) => {
                  const isSelected = selectedAddons.some(a => a.id === option.id);
                  const hasPrice = (option.one_time_price ?? 0) > 0 || (option.monthly_price ?? 0) > 0;
                  const isIncluded = (option.one_time_price ?? 0) === 0 && (option.monthly_price ?? 0) === 0;
                  
                  return (
                    <div 
                      key={option.id} 
                      className={cn(
                        "relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden",
                        isSelected 
                          ? "border-accent bg-accent/5 shadow-lg shadow-accent/20" 
                          : "border-border hover:border-accent/50 hover:shadow-md bg-background"
                      )}
                      onClick={() => toggleAddon(dbOptionToTariffAddon(option))}
                    >
                      {/* Selection indicator */}
                      <div className={cn(
                        "absolute top-4 right-4 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all z-10",
                        isSelected 
                          ? "bg-accent border-accent" 
                          : "border-muted-foreground/30 bg-background"
                      )}>
                        {isSelected && <Check className="w-5 h-5 text-accent-foreground" />}
                      </div>
                      
                      <div className="flex flex-col md:flex-row gap-4 p-5">
                        {/* Image if available */}
                        {option.image_url && (
                          <div className="flex-shrink-0 w-full md:w-48 h-32 rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center">
                            <img src={option.image_url} alt={option.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        
                        <div className="flex-1 pr-10">
                          {/* Title */}
                          <div className="flex items-start gap-2 mb-2">
                            <h4 className="font-bold text-lg text-foreground">{option.name}</h4>
                            {option.info_text && <InfoTooltip text={option.info_text} />}
                          </div>
                          
                          {/* Description */}
                          {option.description && (
                            <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line">{option.description}</p>
                          )}
                          
                          {/* External link */}
                          {option.external_link_url && (
                            <a 
                              href={option.external_link_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm inline-flex items-center gap-1 mb-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {option.external_link_label || 'Mehr erfahren'}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          
                          {/* Price */}
                          <div className="flex items-center gap-2 mt-3">
                            <span className={cn(
                              "inline-flex items-center gap-1 font-semibold px-4 py-2 rounded-lg text-sm",
                              isIncluded 
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-accent text-accent-foreground"
                            )}>
                              {isIncluded ? 'inklusive' : (
                                <>
                                  {(option.one_time_price ?? 0) > 0 && `${option.one_time_price?.toFixed(2).replace('.', ',')} €`}
                                  {(option.monthly_price ?? 0) > 0 && `${option.monthly_price?.toFixed(2).replace('.', ',')} €/Monat`}
                                </>
                              )}
                            </span>
                            {(option.one_time_price ?? 0) > 0 && (
                              <span className="text-sm text-muted-foreground">einmalig</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
                if (v !== 'referral') {
                  setReferralInput('');
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
                      <Label className="text-sm">Kundennummer des Werbers *</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Unsere Kundennummern beginnen mit "KD" oder "50000"
                      </p>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="z.B. KD123456"
                          value={referralInput}
                          onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                          className="flex-1"
                        />
                        <Button onClick={handleValidateReferral} variant="outline">
                          Prüfen
                        </Button>
                      </div>
                      
                      {referralData.referralValidated && (
                        <div className="flex items-center gap-2 text-success text-sm mt-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Kundennummer gültig! 🎉 50€ Prämie für beide!</span>
                        </div>
                      )}
                      
                      {referralData.referralError && (
                        <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                          <XCircle className="w-4 h-4" />
                          <span>{referralData.referralError}</span>
                        </div>
                      )}
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
  tariff: TariffOption & { contractMonths?: number; externalLinkUrl?: string; externalLinkLabel?: string }; 
  isSelected: boolean; 
  onSelect: () => void;
}) {
  const contractMonths = tariff.contractMonths || 24;
  
  // Split display_name into text part (letters) and number part
  // e.g. "einfach 150" -> textPart: "einfach", numberPart: "150"
  // e.g. "FiberBasic 100" -> textPart: "FiberBasic", numberPart: "100"
  // e.g. "Lebenshilfe Tarif" -> textPart: "Lebenshilfe Tarif", numberPart: null
  const displayName = tariff.displayName || tariff.name;
  const match = displayName.match(/^(.+?)\s+(\d+)$/);
  const textPart = match ? match[1] : null;
  const numberPart = match ? match[2] : null;
  const hasTextAndNumber = textPart && numberPart;
  
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
        {hasTextAndNumber ? (
          <>
            <p className="text-accent-foreground font-medium text-lg">{textPart}</p>
            <p className="text-accent-foreground font-bold text-4xl">{numberPart}</p>
          </>
        ) : (
          <p className="text-accent-foreground font-bold text-2xl">{displayName}</p>
        )}
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

        {/* Preis + Laufzeit */}
        <div className="text-center mb-4">
          <span className="text-accent font-bold text-xl">{tariff.monthlyPrice.toFixed(2).replace('.', ',')} €</span>
          <span className="text-muted-foreground text-sm"> / Monat</span>
          <div className="text-xs text-muted-foreground mt-1">
            {contractMonths} Monate
          </div>
        </div>

        {/* Produkthinweise Link */}
        {tariff.externalLinkUrl && (
          <div className="text-center mb-4">
            <a
              href={tariff.externalLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(tariff.externalLinkUrl, '_blank', 'noopener,noreferrer');
              }}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              {tariff.externalLinkLabel || 'Produkthinweise'}
            </a>
          </div>
        )}

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
