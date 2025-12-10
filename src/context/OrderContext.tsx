import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ConnectionType, AddressData } from '@/data/mockAddresses';
import { TariffOption, TariffAddon } from '@/data/tariffs';

interface CustomerData {
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
}

interface OrderState {
  step: number;
  address: AddressData | null;
  connectionType: ConnectionType | null;
  selectedTariff: TariffOption | null;
  selectedAddons: TariffAddon[];
  contractDuration: 12 | 24;
  customerData: CustomerData | null;
  vzfDownloaded: boolean;
  vzfConfirmed: boolean;
}

interface OrderContextType extends OrderState {
  setStep: (step: number) => void;
  setAddress: (address: AddressData) => void;
  setConnectionType: (type: ConnectionType) => void;
  setSelectedTariff: (tariff: TariffOption) => void;
  toggleAddon: (addon: TariffAddon) => void;
  setContractDuration: (duration: 12 | 24) => void;
  setCustomerData: (data: CustomerData) => void;
  setVzfDownloaded: (downloaded: boolean) => void;
  setVzfConfirmed: (confirmed: boolean) => void;
  getTotalMonthly: () => number;
  getTotalOneTime: () => number;
  resetOrder: () => void;
}

const initialState: OrderState = {
  step: 1,
  address: null,
  connectionType: null,
  selectedTariff: null,
  selectedAddons: [],
  contractDuration: 24,
  customerData: null,
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
  
  const toggleAddon = (addon: TariffAddon) => {
    setState(prev => {
      const exists = prev.selectedAddons.find(a => a.id === addon.id);
      if (exists) {
        return { ...prev, selectedAddons: prev.selectedAddons.filter(a => a.id !== addon.id) };
      }
      // Remove other addons of same category if it's router
      if (addon.category === 'router') {
        const filtered = prev.selectedAddons.filter(a => a.category !== 'router');
        return { ...prev, selectedAddons: [...filtered, addon] };
      }
      return { ...prev, selectedAddons: [...prev.selectedAddons, addon] };
    });
  };
  
  const setContractDuration = (contractDuration: 12 | 24) => 
    setState(prev => ({ ...prev, contractDuration }));
  
  const setCustomerData = (customerData: CustomerData) => 
    setState(prev => ({ ...prev, customerData }));
  
  const setVzfDownloaded = (vzfDownloaded: boolean) => 
    setState(prev => ({ ...prev, vzfDownloaded }));
  
  const setVzfConfirmed = (vzfConfirmed: boolean) => 
    setState(prev => ({ ...prev, vzfConfirmed }));

  const getTotalMonthly = () => {
    let total = state.selectedTariff?.monthlyPrice || 0;
    state.selectedAddons.forEach(addon => {
      total += addon.monthlyPrice;
    });
    return total;
  };

  const getTotalOneTime = () => {
    let total = state.selectedTariff?.setupFee || 0;
    state.selectedAddons.forEach(addon => {
      total += addon.oneTimePrice;
    });
    return total;
  };

  const resetOrder = () => setState(initialState);

  return (
    <OrderContext.Provider value={{
      ...state,
      setStep,
      setAddress,
      setConnectionType,
      setSelectedTariff,
      toggleAddon,
      setContractDuration,
      setCustomerData,
      setVzfDownloaded,
      setVzfConfirmed,
      getTotalMonthly,
      getTotalOneTime,
      resetOrder,
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
