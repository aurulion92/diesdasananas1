import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ConnectionType, AddressData } from '@/data/addressDatabase';
import { TariffOption, TariffAddon } from '@/data/tariffs';

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

interface OrderState {
  step: number;
  address: AddressData | null;
  connectionType: ConnectionType | null;
  selectedTariff: TariffOption | null;
  selectedRouter: TariffAddon | null;
  selectedTv: TariffAddon | null;
  selectedAddons: TariffAddon[];
  contractDuration: 12 | 24;
  customerData: CustomerData | null;
  bankData: BankData | null;
  preferredDate: string | null;
  preferredDateType: 'asap' | 'specific' | null;
  vzfDownloaded: boolean;
  vzfConfirmed: boolean;
}

interface OrderContextType extends OrderState {
  setStep: (step: number) => void;
  setAddress: (address: AddressData) => void;
  setConnectionType: (type: ConnectionType) => void;
  setSelectedTariff: (tariff: TariffOption) => void;
  setSelectedRouter: (router: TariffAddon | null) => void;
  setSelectedTv: (tv: TariffAddon | null) => void;
  toggleAddon: (addon: TariffAddon) => void;
  setContractDuration: (duration: 12 | 24) => void;
  setCustomerData: (data: CustomerData) => void;
  setBankData: (data: BankData) => void;
  setPreferredDate: (date: string | null) => void;
  setPreferredDateType: (type: 'asap' | 'specific' | null) => void;
  setVzfDownloaded: (downloaded: boolean) => void;
  setVzfConfirmed: (confirmed: boolean) => void;
  getTotalMonthly: () => number;
  getTotalOneTime: () => number;
  resetOrder: () => void;
  canNavigateToStep: (step: number) => boolean;
}

const initialState: OrderState = {
  step: 1,
  address: null,
  connectionType: null,
  selectedTariff: null,
  selectedRouter: null,
  selectedTv: null,
  selectedAddons: [],
  contractDuration: 24,
  customerData: null,
  bankData: null,
  preferredDate: null,
  preferredDateType: null,
  vzfDownloaded: false,
  vzfConfirmed: false,
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OrderState>(initialState);

  const setStep = (step: number) => setState(prev => ({ ...prev, step }));
  
  const setAddress = (address: AddressData) => setState(prev => ({ 
    ...prev, 
    address,
    connectionType: address.connectionType 
  }));
  
  const setConnectionType = (connectionType: ConnectionType) => 
    setState(prev => ({ ...prev, connectionType }));
  
  const setSelectedTariff = (selectedTariff: TariffOption) => 
    setState(prev => ({ ...prev, selectedTariff }));

  const setSelectedRouter = (selectedRouter: TariffAddon | null) =>
    setState(prev => ({ ...prev, selectedRouter }));

  const setSelectedTv = (selectedTv: TariffAddon | null) =>
    setState(prev => ({ ...prev, selectedTv }));
  
  const toggleAddon = (addon: TariffAddon) => {
    setState(prev => {
      const exists = prev.selectedAddons.find(a => a.id === addon.id);
      if (exists) {
        return { ...prev, selectedAddons: prev.selectedAddons.filter(a => a.id !== addon.id) };
      }
      // Remove other addons of same category if it's router or tv
      if (addon.category === 'router' || addon.category === 'tv') {
        const filtered = prev.selectedAddons.filter(a => a.category !== addon.category);
        return { ...prev, selectedAddons: [...filtered, addon] };
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
  
  const setVzfDownloaded = (vzfDownloaded: boolean) => 
    setState(prev => ({ ...prev, vzfDownloaded }));
  
  const setVzfConfirmed = (vzfConfirmed: boolean) => 
    setState(prev => ({ ...prev, vzfConfirmed }));

  const getTotalMonthly = () => {
    let total = state.selectedTariff?.monthlyPrice || 0;
    if (state.selectedRouter && state.selectedRouter.monthlyPrice > 0) {
      total += state.selectedRouter.monthlyPrice;
    }
    if (state.selectedTv && state.selectedTv.monthlyPrice > 0) {
      total += state.selectedTv.monthlyPrice;
    }
    state.selectedAddons.forEach(addon => {
      total += addon.monthlyPrice;
    });
    // Add 5€ for 12 month contract
    if (state.contractDuration === 12) {
      total += 5;
    }
    return total;
  };

  const getTotalOneTime = () => {
    let total = state.selectedTariff?.setupFee || 0;
    if (state.selectedRouter) {
      total += state.selectedRouter.oneTimePrice;
    }
    if (state.selectedTv) {
      total += state.selectedTv.oneTimePrice;
    }
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
      setSelectedTariff,
      setSelectedRouter,
      setSelectedTv,
      toggleAddon,
      setContractDuration,
      setCustomerData,
      setBankData,
      setPreferredDate,
      setPreferredDateType,
      setVzfDownloaded,
      setVzfConfirmed,
      getTotalMonthly,
      getTotalOneTime,
      resetOrder,
      canNavigateToStep,
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}
