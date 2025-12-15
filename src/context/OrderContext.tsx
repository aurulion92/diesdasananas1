import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ConnectionType, AddressData } from '@/data/addressDatabase';
import { TariffOption, TariffAddon, promoCodes, PromoCode, validCustomerNumbers } from '@/data/tariffs';

interface CustomerData {
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
}

interface BankData {
  accountHolder: string;
  iban: string;
  bic?: string;
}

// Abweichende Rechnungsadresse
interface AlternateBillingAddress {
  enabled: boolean;
  salutation: string;
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
}

// Abweichender Beitragszahler
interface AlternatePaymentPerson {
  enabled: boolean;
  salutation: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  phone: string;
}

interface PhonePortingData {
  numberOfNumbers: number;
  phoneNumbers: string[];
  previousProvider: string;
  // Extended porting fields
  connectionHolder: string; // Anschlussinhaber
  connectionAddress: string; // Anschlussadresse
  portingType: 'cancel_and_port' | 'port_only'; // Kündigung + Portierung ODER nur Portierung (bereits gekündigt)
  // Abweichende Daten
  hasDifferentHolder: boolean; // Abweichender Anschlussinhaber?
  hasDifferentAddress: boolean; // Abweichende Anschlussadresse?
}

interface ApartmentData {
  floor: string;
  apartment: string;
}

interface ProviderCancellationData {
  providerName: string;
  customerNumber: string; // Phone number for cancellation (Telefonnummer zum Kündigen)
  connectionHolder: string; // Anschlussinhaber
  connectionAddress: string; // Anschlussadresse
  portToNewConnection: boolean; // Seamless transition
  preferredDate: 'asap' | 'specific' | null;
  specificDate: string | null;
}

interface ReferralData {
  type: 'none' | 'internet' | 'social-media' | 'referral' | 'promo-code';
  referrerCustomerId?: string;
  referralValidated?: boolean;
  referralError?: string;
  promoCode?: string;
}

interface TvSelection {
  type: 'none' | 'comin' | 'waipu';
  package: TariffAddon | null;
  hdAddon: TariffAddon | null; // Basis HD or Family HD for COM-IN TV
  hardware: TariffAddon[]; // Smartcard + Receiver/CI Module
  waipuStick: boolean;
  waipuStickPrice?: number; // Price from database for waipu 4K Stick
}

interface PhoneSelection {
  enabled: boolean;
  selectedOptionId: string | null; // ID of the selected phone option from database
  selectedOptionName: string | null; // Name of the selected phone option
  selectedOptionPrice: number; // Monthly price per line of selected option
  lines: number; // Number of phone lines
  portingRequired: boolean;
  portingData: PhonePortingData | null;
  // Phone book options
  evn: boolean;
  phoneBookEntryType: 'none' | 'standard' | 'custom';
  phoneBookPrinted: boolean;
  phoneBookPhoneInfo: boolean;
  phoneBookInternet: boolean;
  phoneBookCustomName: string;
  phoneBookCustomAddress: string;
  phoneBookShowAddress: boolean;
}

interface ConsentData {
  advertising: boolean | null; // null = not yet selected
  agb: boolean;
  datenschutz: boolean;
  widerruf: boolean;
  sepaMandat: boolean;
}

interface ExpressOption {
  id: string;
  slug: string;
  name: string;
  description: string;
  oneTimePrice: number;
  infoText?: string;
}

export type CustomerType = 'pk' | 'kmu';

interface OrderState {
  step: number;
  customerType: CustomerType;
  address: AddressData | null;
  connectionType: ConnectionType | null;
  apartmentData: ApartmentData | null;
  selectedTariff: TariffOption | null;
  selectedRouter: TariffAddon | null;
  tvSelection: TvSelection;
  phoneSelection: PhoneSelection;
  selectedAddons: TariffAddon[];
  contractDuration: 12 | 24;
  customerData: CustomerData | null;
  bankData: BankData | null;
  preferredDate: string | null;
  preferredDateType: 'asap' | 'specific' | null;
  cancelPreviousProvider: boolean;
  providerCancellationData: ProviderCancellationData | null;
  expressActivation: boolean;
  expressOption: ExpressOption | null;
  referralData: ReferralData;
  appliedPromoCode: PromoCode | null;
  promoCodeError: string | null;
  vzfDownloaded: boolean;
  vzfConfirmed: boolean;
  consentData: ConsentData;
  generatedOrderNumber: string | null;
  // Abweichende Rechnungsadresse & Beitragszahler
  alternateBillingAddress: AlternateBillingAddress;
  alternatePaymentPerson: AlternatePaymentPerson;
}

interface OrderContextType extends OrderState {
  setStep: (step: number) => void;
  setCustomerType: (type: CustomerType) => void;
  setAddress: (address: AddressData) => void;
  setConnectionType: (type: ConnectionType) => void;
  setApartmentData: (data: ApartmentData | null) => void;
  setSelectedTariff: (tariff: TariffOption) => void;
  setSelectedRouter: (router: TariffAddon | null) => void;
  setTvSelection: (selection: TvSelection) => void;
  setPhoneSelection: (selection: PhoneSelection) => void;
  toggleAddon: (addon: TariffAddon) => void;
  setContractDuration: (duration: 12 | 24) => void;
  setCustomerData: (data: CustomerData) => void;
  setBankData: (data: BankData) => void;
  setPreferredDate: (date: string | null) => void;
  setPreferredDateType: (type: 'asap' | 'specific' | null) => void;
  setCancelPreviousProvider: (cancel: boolean) => void;
  setProviderCancellationData: (data: ProviderCancellationData | null) => void;
  setExpressActivation: (express: boolean, option?: ExpressOption | null) => void;
  setReferralData: (data: ReferralData) => void;
  validateReferralCustomerId: (customerId: string) => boolean;
  applyPromoCode: (code: string) => boolean;
  clearPromoCode: () => void;
  setVzfDownloaded: (downloaded: boolean) => void;
  setVzfConfirmed: (confirmed: boolean) => void;
  setConsentData: (data: ConsentData) => void;
  setAlternateBillingAddress: (data: AlternateBillingAddress) => void;
  setAlternatePaymentPerson: (data: AlternatePaymentPerson) => void;
  generateOrderNumber: () => string;
  getOrderNumber: () => string | null;
  getTotalMonthly: () => number;
  getTotalOneTime: () => number;
  getRouterPrice: () => number;
  getRouterDiscount: () => number;
  getSetupFee: () => number;
  isSetupFeeWaived: () => boolean;
  getReferralBonus: () => number;
  resetOrder: () => void;
  canNavigateToStep: (step: number) => boolean;
  isMFH: () => boolean;
  hasPhoneBooked: () => boolean;
}

const initialTvSelection: TvSelection = {
  type: 'none',
  package: null,
  hdAddon: null,
  hardware: [],
  waipuStick: false,
};

const initialPhoneSelection: PhoneSelection = {
  enabled: false,
  selectedOptionId: null,
  selectedOptionName: null,
  selectedOptionPrice: 0,
  lines: 1,
  portingRequired: false,
  portingData: null,
  evn: false,
  phoneBookEntryType: 'none',
  phoneBookPrinted: false,
  phoneBookPhoneInfo: false,
  phoneBookInternet: false,
  phoneBookCustomName: '',
  phoneBookCustomAddress: '',
  phoneBookShowAddress: true,
};

const initialConsentData: ConsentData = {
  advertising: null,
  agb: false,
  datenschutz: false,
  widerruf: false,
  sepaMandat: false,
};

const initialReferralData: ReferralData = {
  type: 'none',
};

const initialAlternateBillingAddress: AlternateBillingAddress = {
  enabled: false,
  salutation: '',
  firstName: '',
  lastName: '',
  company: '',
  street: '',
  houseNumber: '',
  postalCode: '',
  city: '',
};

const initialAlternatePaymentPerson: AlternatePaymentPerson = {
  enabled: false,
  salutation: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  email: '',
  phone: '',
};

const initialState: OrderState = {
  step: 1,
  customerType: 'pk',
  address: null,
  connectionType: null,
  apartmentData: null,
  selectedTariff: null,
  selectedRouter: null,
  tvSelection: initialTvSelection,
  phoneSelection: initialPhoneSelection,
  selectedAddons: [],
  contractDuration: 24,
  customerData: null,
  bankData: null,
  preferredDate: null,
  preferredDateType: null,
  cancelPreviousProvider: false,
  providerCancellationData: null,
  expressActivation: false,
  expressOption: null,
  referralData: initialReferralData,
  appliedPromoCode: null,
  promoCodeError: null,
  vzfDownloaded: false,
  vzfConfirmed: false,
  consentData: initialConsentData,
  generatedOrderNumber: null,
  alternateBillingAddress: initialAlternateBillingAddress,
  alternatePaymentPerson: initialAlternatePaymentPerson,
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

interface OrderProviderProps {
  children: ReactNode;
  initialCustomerType?: CustomerType;
}

export const OrderProvider = ({ children, initialCustomerType = 'pk' }: OrderProviderProps) => {
  const [state, setState] = useState<OrderState>({
    ...initialState,
    customerType: initialCustomerType,
  });

  const resetTariffSelections = () => ({
    selectedTariff: null,
    selectedRouter: null,
    tvSelection: initialTvSelection,
    phoneSelection: initialPhoneSelection,
    selectedAddons: [],
    contractDuration: 24 as const,
    expressActivation: false,
    referralData: initialReferralData,
    appliedPromoCode: null,
    promoCodeError: null,
    vzfDownloaded: false,
    vzfConfirmed: false,
  });

  const setStep = (step: number) => setState(prev => {
    // When navigating back to step 1 or 2, reset tariff-related selections
    // but keep personal data (customerData, bankData, preferredDate, apartmentData)
    if (step < prev.step && step <= 2) {
      return { 
        ...prev, 
        step,
        ...resetTariffSelections(),
      };
    }
    return { ...prev, step };
  });

  const setCustomerType = (customerType: CustomerType) =>
    setState(prev => ({ ...prev, customerType }));
  
  const setAddress = (address: AddressData) => {
    setState(prev => ({ 
      ...prev, 
      address,
      connectionType: address.connectionType,
      // Reset router when address changes (different routers for FTTH/FTTB)
      selectedRouter: null,
      // Clear promo code if address changes and code is no longer valid
      appliedPromoCode: prev.appliedPromoCode && 
        !prev.appliedPromoCode.validAddresses.some(a => 
          address.street.toLowerCase().includes(a.toLowerCase())
        ) ? null : prev.appliedPromoCode,
      promoCodeError: null,
    }));
  };
  
  const setConnectionType = (connectionType: ConnectionType) => 
    setState(prev => ({ ...prev, connectionType }));

  const setApartmentData = (apartmentData: ApartmentData | null) =>
    setState(prev => ({ ...prev, apartmentData }));
  
  // Helper function to reset VZF status and order number when order changes
  const resetVzfStatus = (prevState: OrderState): Partial<OrderState> => ({
    vzfDownloaded: false,
    vzfConfirmed: false,
    generatedOrderNumber: null,
  });

  const setSelectedTariff = (selectedTariff: TariffOption) => {
    setState(prev => {
      // Reset phone selection if tariff includes phone (FiberBasic)
      const phoneSelection = selectedTariff.includesPhone 
        ? initialPhoneSelection 
        : prev.phoneSelection;
      
      // Reset contract duration if not FiberBasic (only FiberBasic supports 12 months)
      const contractDuration = selectedTariff.id !== 'fiber-basic-100' ? 24 : prev.contractDuration;
      
      // Reset VZF if tariff changes
      return { ...prev, selectedTariff, phoneSelection, contractDuration, ...resetVzfStatus(prev) };
    });
  };

  const setSelectedRouter = (selectedRouter: TariffAddon | null) =>
    setState(prev => ({ ...prev, selectedRouter, ...resetVzfStatus(prev) }));

  const setTvSelection = (tvSelection: TvSelection) =>
    setState(prev => ({ ...prev, tvSelection, ...resetVzfStatus(prev) }));

  const setPhoneSelection = (phoneSelection: PhoneSelection) =>
    setState(prev => ({ ...prev, phoneSelection, ...resetVzfStatus(prev) }));
  
  const toggleAddon = (addon: TariffAddon) => {
    setState(prev => {
      const exists = prev.selectedAddons.find(a => a.id === addon.id);
      if (exists) {
        return { ...prev, selectedAddons: prev.selectedAddons.filter(a => a.id !== addon.id) };
      }
      return { ...prev, selectedAddons: [...prev.selectedAddons, addon] };
    });
  };
  
  const setContractDuration = (contractDuration: 12 | 24) => 
    setState(prev => ({ ...prev, contractDuration, ...resetVzfStatus(prev) }));
  
  const setCustomerData = (customerData: CustomerData) => 
    setState(prev => ({ ...prev, customerData }));

  const setBankData = (bankData: BankData) =>
    setState(prev => ({ ...prev, bankData }));

  const setPreferredDate = (preferredDate: string | null) =>
    setState(prev => ({ ...prev, preferredDate }));

  const setPreferredDateType = (preferredDateType: 'asap' | 'specific' | null) =>
    setState(prev => ({ ...prev, preferredDateType }));

  const setCancelPreviousProvider = (cancelPreviousProvider: boolean) =>
    setState(prev => ({ 
      ...prev, 
      cancelPreviousProvider,
      providerCancellationData: cancelPreviousProvider ? {
        providerName: '',
        customerNumber: '',
        connectionHolder: '',
        connectionAddress: '',
        portToNewConnection: true,
        preferredDate: null,
        specificDate: null,
      } : null,
    }));

  const setProviderCancellationData = (providerCancellationData: ProviderCancellationData | null) =>
    setState(prev => ({ ...prev, providerCancellationData }));

  const setExpressActivation = (expressActivation: boolean, expressOption?: ExpressOption | null) =>
    setState(prev => ({ 
      ...prev, 
      expressActivation, 
      expressOption: expressOption !== undefined ? expressOption : prev.expressOption,
      ...resetVzfStatus(prev) 
    }));

  const setReferralData = (referralData: ReferralData) =>
    setState(prev => ({ ...prev, referralData }));
  
  const setAlternateBillingAddress = (alternateBillingAddress: AlternateBillingAddress) =>
    setState(prev => ({ ...prev, alternateBillingAddress }));
  
  const setAlternatePaymentPerson = (alternatePaymentPerson: AlternatePaymentPerson) =>
    setState(prev => ({ ...prev, alternatePaymentPerson }));

  const validateReferralCustomerId = (customerId: string): boolean => {
    const normalizedId = customerId.toUpperCase().trim();
    const isValid = validCustomerNumbers.includes(normalizedId);
    
    setState(prev => ({
      ...prev,
      referralData: {
        ...prev.referralData,
        referrerCustomerId: customerId,
        referralValidated: isValid,
        referralError: isValid ? undefined : 'Kundennummer nicht gefunden',
      }
    }));
    
    return isValid;
  };

  const applyPromoCode = (code: string): boolean => {
    const normalizedCode = code.toUpperCase().trim();
    const promoCode = promoCodes.find(p => p.code === normalizedCode);
    
    if (!promoCode) {
      setState(prev => ({ 
        ...prev, 
        appliedPromoCode: null, 
        promoCodeError: 'Ungültiger Aktionscode' 
      }));
      return false;
    }
    
    // Check if code is valid for current address
    if (state.address) {
      const isValidForAddress = promoCode.validAddresses.some(a => 
        state.address!.street.toLowerCase().includes(a.toLowerCase())
      );
      
      if (!isValidForAddress) {
        setState(prev => ({ 
          ...prev, 
          appliedPromoCode: null, 
          promoCodeError: 'Dieser Aktionscode gilt nicht für dieses Objekt' 
        }));
        return false;
      }
    }
    
    setState(prev => ({ 
      ...prev, 
      appliedPromoCode: promoCode, 
      promoCodeError: null 
    }));
    return true;
  };

  const clearPromoCode = () => {
    setState(prev => ({ ...prev, appliedPromoCode: null, promoCodeError: null }));
  };
  
  const setVzfDownloaded = (vzfDownloaded: boolean) => 
    setState(prev => ({ ...prev, vzfDownloaded }));
  
  const setVzfConfirmed = (vzfConfirmed: boolean) => 
    setState(prev => ({ ...prev, vzfConfirmed }));

  // Generate a new order number (called when VZF is created)
  const generateOrderNumber = (): string => {
    const newOrderNumber = `COM-${Date.now().toString(36).toUpperCase()}`;
    setState(prev => ({ ...prev, generatedOrderNumber: newOrderNumber }));
    return newOrderNumber;
  };

  // Get the current order number (null if not generated yet)
  const getOrderNumber = (): string | null => {
    return state.generatedOrderNumber;
  };

  const isMFH = (): boolean => {
    // MFH detection based on address data - can be extended later
    return false; // Will be updated when we have building type info
  };

  const setConsentData = (consentData: ConsentData) =>
    setState(prev => ({ ...prev, consentData }));

  const hasPhoneBooked = (): boolean => {
    // Phone is booked if:
    // 1. Tariff includes phone, OR
    // 2. Phone selection is enabled (legacy), OR
    // 3. A phone option is in selectedAddons (database options with category 'phone')
    const hasPhoneAddon = state.selectedAddons.some(addon => addon.category === 'phone');
    return state.selectedTariff?.includesPhone === true || state.phoneSelection.enabled || hasPhoneAddon;
  };

  // Check if einfach tariff discount applies (4€ on routers)
  const hasEinfachTariffDiscount = (): boolean => {
    if (!state.selectedTariff) return false;
    return state.selectedTariff.id.startsWith('einfach-');
  };

  // Get the promo code router discount amount
  const getPromoCodeRouterDiscount = (): number => {
    if (!state.appliedPromoCode) return 0;
    return state.appliedPromoCode.routerDiscount || 0;
  };

  const getRouterPrice = (): number => {
    if (!state.selectedRouter || state.selectedRouter.id === 'router-none') return 0;
    
    let price = state.selectedRouter.monthlyPrice;
    
    // Apply einfach tariff discount first (uses discountedPrice if available)
    if (hasEinfachTariffDiscount() && state.selectedRouter.discountedPrice !== undefined) {
      price = state.selectedRouter.discountedPrice;
    }
    
    // Apply promo code discount on top (but don't go below 0)
    const promoDiscount = getPromoCodeRouterDiscount();
    if (promoDiscount > 0) {
      price = Math.max(0, price - promoDiscount);
    }
    
    return price;
  };

  const getRouterDiscount = (): number => {
    if (!state.selectedRouter || state.selectedRouter.id === 'router-none') return 0;
    
    const originalPrice = state.selectedRouter.monthlyPrice;
    const finalPrice = getRouterPrice();
    
    return originalPrice - finalPrice;
  };

  const isSetupFeeWaived = (): boolean => {
    return state.appliedPromoCode?.setupFeeWaived === true;
  };

  const getSetupFee = (): number => {
    if (isSetupFeeWaived()) return 0;
    // Value comes directly from database product, no fallback
    return state.selectedTariff?.setupFee ?? 0;
  };

  const getTotalMonthly = () => {
    let total = 0;
    
    // Tariff price (12 or 24 months)
    if (state.selectedTariff) {
      total += state.contractDuration === 12 
        ? state.selectedTariff.monthlyPrice12 
        : state.selectedTariff.monthlyPrice;
    }
    
    // Router with possible discount - USE getRouterPrice() which already includes discount
    total += getRouterPrice();
    
    // TV costs
    if (state.tvSelection.type === 'comin') {
      // COM-IN TV base cost
      total += 10.00;
    }
    if (state.tvSelection.package && state.tvSelection.type === 'waipu') {
      total += state.tvSelection.package.monthlyPrice;
    }
    if (state.tvSelection.hdAddon) {
      total += state.tvSelection.hdAddon.monthlyPrice;
    }
    state.tvSelection.hardware.forEach(hw => {
      total += hw.monthlyPrice;
    });
    
    // Phone costs - use selectedOptionPrice from database instead of hardcoded value
    if (state.phoneSelection.enabled && !state.selectedTariff?.includesPhone) {
      total += state.phoneSelection.lines * state.phoneSelection.selectedOptionPrice;
    }
    
    // Other addons (with quantity support)
    state.selectedAddons.forEach(addon => {
      const quantity = addon.quantity || 1;
      total += addon.monthlyPrice * quantity;
    });
    
    return total;
  };

  const getReferralBonus = (): number => {
    if (state.referralData.type === 'referral' && state.referralData.referralValidated) {
      return 50;
    }
    return 0;
  };

  const getTotalOneTime = () => {
    let total = getSetupFee();
    
    // Router one-time cost
    if (state.selectedRouter) {
      total += state.selectedRouter.oneTimePrice;
    }
    
    // TV hardware one-time costs
    state.tvSelection.hardware.forEach(hw => {
      total += hw.oneTimePrice;
    });
    
    // WAIPU stick
    if (state.tvSelection.waipuStick) {
      total += state.tvSelection.waipuStickPrice ?? 59.99;
    }
    
    // Express activation - use option price if available
    if (state.expressActivation) {
      total += state.expressOption?.oneTimePrice || 200.00;
    }
    
    // Other addons (with quantity support)
    state.selectedAddons.forEach(addon => {
      const quantity = addon.quantity || 1;
      total += addon.oneTimePrice * quantity;
    });
    
    // Subtract referral bonus
    total -= getReferralBonus();
    
    return Math.max(0, total); // Never go below 0
  };

  const canNavigateToStep = (step: number): boolean => {
    if (step === 1) return true;
    if (step === 2) return !!state.address && state.connectionType !== 'not-connected';
    if (step === 3) return !!state.selectedTariff;
    if (step === 4) return !!state.customerData && !!state.bankData;
    return false;
  };

  const resetOrder = () => setState(initialState);

  return (
    <OrderContext.Provider value={{
      ...state,
      setStep,
      setCustomerType,
      setAddress,
      setConnectionType,
      setApartmentData,
      setSelectedTariff,
      setSelectedRouter,
      setTvSelection,
      setPhoneSelection,
      toggleAddon,
      setContractDuration,
      setCustomerData,
      setBankData,
      setPreferredDate,
      setPreferredDateType,
      setCancelPreviousProvider,
      setProviderCancellationData,
      setExpressActivation,
      setReferralData,
      validateReferralCustomerId,
      applyPromoCode,
      clearPromoCode,
      setVzfDownloaded,
      setVzfConfirmed,
      generateOrderNumber,
      getOrderNumber,
      getTotalMonthly,
      getTotalOneTime,
      getRouterPrice,
      getRouterDiscount,
      getSetupFee,
      isSetupFeeWaived,
      getReferralBonus,
      resetOrder,
      canNavigateToStep,
      isMFH,
      setConsentData,
      setAlternateBillingAddress,
      setAlternatePaymentPerson,
      hasPhoneBooked,
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}
