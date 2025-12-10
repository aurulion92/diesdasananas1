import React, { createContext, useContext, useState, ReactNode } from 'react';
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

interface PhonePortingData {
  numberOfNumbers: number;
  phoneNumbers: string[];
  previousProvider: string;
}

interface ApartmentData {
  floor: string;
  apartment: string;
}

interface ProviderCancellationData {
  providerName: string;
  customerNumber: string; // Customer number at previous provider for cancellation
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
}

interface PhoneSelection {
  enabled: boolean;
  lines: number; // Number of phone lines (each 2.95€)
  portingRequired: boolean;
  portingData: PhonePortingData | null;
}

interface OrderState {
  step: number;
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
  referralData: ReferralData;
  appliedPromoCode: PromoCode | null;
  promoCodeError: string | null;
  vzfDownloaded: boolean;
  vzfConfirmed: boolean;
}

interface OrderContextType extends OrderState {
  setStep: (step: number) => void;
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
  setExpressActivation: (express: boolean) => void;
  setReferralData: (data: ReferralData) => void;
  validateReferralCustomerId: (customerId: string) => boolean;
  applyPromoCode: (code: string) => boolean;
  clearPromoCode: () => void;
  setVzfDownloaded: (downloaded: boolean) => void;
  setVzfConfirmed: (confirmed: boolean) => void;
  getTotalMonthly: () => number;
  getTotalOneTime: () => number;
  getRouterPrice: () => number;
  getRouterDiscount: () => number;
  getSetupFee: () => number;
  isSetupFeeWaived: () => boolean;
  resetOrder: () => void;
  canNavigateToStep: (step: number) => boolean;
  isMFH: () => boolean;
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
  lines: 1,
  portingRequired: false,
  portingData: null,
};

const initialReferralData: ReferralData = {
  type: 'none',
};

const initialState: OrderState = {
  step: 1,
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
  referralData: initialReferralData,
  appliedPromoCode: null,
  promoCodeError: null,
  vzfDownloaded: false,
  vzfConfirmed: false,
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<OrderState>(initialState);

  const setStep = (step: number) => setState(prev => ({ ...prev, step }));
  
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
  
  const setSelectedTariff = (selectedTariff: TariffOption) => {
    setState(prev => {
      // Reset phone selection if tariff includes phone (FiberBasic)
      const phoneSelection = selectedTariff.includesPhone 
        ? initialPhoneSelection 
        : prev.phoneSelection;
      
      // Reset contract duration if not FiberBasic (only FiberBasic supports 12 months)
      const contractDuration = selectedTariff.id !== 'fiber-basic-100' ? 24 : prev.contractDuration;
      
      return { ...prev, selectedTariff, phoneSelection, contractDuration };
    });
  };

  const setSelectedRouter = (selectedRouter: TariffAddon | null) =>
    setState(prev => ({ ...prev, selectedRouter }));

  const setTvSelection = (tvSelection: TvSelection) =>
    setState(prev => ({ ...prev, tvSelection }));

  const setPhoneSelection = (phoneSelection: PhoneSelection) =>
    setState(prev => ({ ...prev, phoneSelection }));
  
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
    setState(prev => ({ ...prev, contractDuration }));
  
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
        portToNewConnection: true,
        preferredDate: null,
        specificDate: null,
      } : null,
    }));

  const setProviderCancellationData = (providerCancellationData: ProviderCancellationData | null) =>
    setState(prev => ({ ...prev, providerCancellationData }));

  const setExpressActivation = (expressActivation: boolean) =>
    setState(prev => ({ ...prev, expressActivation }));

  const setReferralData = (referralData: ReferralData) =>
    setState(prev => ({ ...prev, referralData }));

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

  const isMFH = (): boolean => {
    return state.address?.houseType?.toUpperCase() === 'MFH';
  };

  // Check if router discount applies (einfach tariffs OR promo code)
  const hasRouterDiscount = (): boolean => {
    if (!state.selectedTariff) return false;
    
    // Check if it's an "einfach" tariff (not FiberBasic)
    const isEinfachTariff = state.selectedTariff.id.startsWith('einfach-');
    
    // Check if promo code gives router discount
    const hasPromoDiscount = state.appliedPromoCode?.routerDiscount && state.appliedPromoCode.routerDiscount > 0;
    
    // Discount applies if EITHER condition is met (not stacking)
    return isEinfachTariff || !!hasPromoDiscount;
  };

  const getRouterPrice = (): number => {
    if (!state.selectedRouter || state.selectedRouter.id === 'router-none') return 0;
    
    if (hasRouterDiscount() && state.selectedRouter.discountedPrice !== undefined) {
      return state.selectedRouter.discountedPrice;
    }
    
    return state.selectedRouter.monthlyPrice;
  };

  const getRouterDiscount = (): number => {
    if (!state.selectedRouter || state.selectedRouter.id === 'router-none') return 0;
    
    if (hasRouterDiscount() && state.selectedRouter.discountedPrice !== undefined) {
      return state.selectedRouter.monthlyPrice - state.selectedRouter.discountedPrice;
    }
    
    return 0;
  };

  const isSetupFeeWaived = (): boolean => {
    return state.appliedPromoCode?.setupFeeWaived === true;
  };

  const getSetupFee = (): number => {
    if (isSetupFeeWaived()) return 0;
    return state.selectedTariff?.setupFee || 99;
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
    
    // Phone costs (only for non-FiberBasic tariffs)
    if (state.phoneSelection.enabled && !state.selectedTariff?.includesPhone) {
      total += state.phoneSelection.lines * 2.95; // 2.95€ per line
    }
    
    // Other addons
    state.selectedAddons.forEach(addon => {
      total += addon.monthlyPrice;
    });
    
    return total;
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
      total += 40.00;
    }
    
    // Express activation
    if (state.expressActivation) {
      total += 200.00;
    }
    
    // Other addons
    state.selectedAddons.forEach(addon => {
      total += addon.oneTimePrice;
    });
    
    return total;
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
      getTotalMonthly,
      getTotalOneTime,
      getRouterPrice,
      getRouterDiscount,
      getSetupFee,
      isSetupFeeWaived,
      resetOrder,
      canNavigateToStep,
      isMFH,
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
