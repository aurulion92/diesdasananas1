export interface TariffOption {
  id: string;
  name: string;
  displayName: string;
  speed: string;
  downloadSpeed: number;
  uploadSpeed: number;
  downloadSpeedNormal?: number;
  downloadSpeedMin?: number;
  uploadSpeedNormal?: number;
  uploadSpeedMin?: number;
  monthlyPrice: number;
  monthlyPrice12: number; // Price for 12-month contract
  setupFee: number;
  description: string;
  features: string[];
  recommended?: boolean;
  includesPhone?: boolean;
  contractMonths?: number; // Contract duration in months (default 24)
}

export interface TariffAddon {
  id: string;
  databaseId?: string; // UUID from database for promotion matching
  name: string;
  description: string;
  monthlyPrice: number;
  discountedPrice?: number; // Price with discount (for routers with einfach tariffs)
  oneTimePrice: number;
  category: 'router' | 'phone' | 'tv' | 'tv-addon' | 'tv-hardware';
  connectionType?: 'ftth' | 'fttb' | 'both'; // Which connection types this addon is available for
}

// FTTH Tarife - "einfach Internet" Produkte von COM-IN (alle Tarife)
export const ftthTariffs: TariffOption[] = [
  {
    id: "einfach-150",
    name: "einfach 150",
    displayName: "150",
    speed: "150 Mbit/s",
    downloadSpeed: 150,
    uploadSpeed: 75,
    monthlyPrice: 35.00,
    monthlyPrice12: 35.00, // Not available in 12 months
    setupFee: 99,
    description: "Internet-Flatrate",
    features: ["150 Mbit/s Download", "75 Mbit/s Upload", "Flatrate", "IPv4 & IPv6"],
  },
  {
    id: "einfach-300",
    name: "einfach 300",
    displayName: "300",
    speed: "300 Mbit/s",
    downloadSpeed: 300,
    uploadSpeed: 150,
    monthlyPrice: 39.00,
    monthlyPrice12: 39.00, // Not available in 12 months
    setupFee: 99,
    description: "Internet-Flatrate",
    features: ["300 Mbit/s Download", "150 Mbit/s Upload", "Flatrate", "IPv4 & IPv6"],
    recommended: true,
  },
  {
    id: "einfach-600",
    name: "einfach 600",
    displayName: "600",
    speed: "600 Mbit/s",
    downloadSpeed: 600,
    uploadSpeed: 300,
    monthlyPrice: 47.00,
    monthlyPrice12: 47.00, // Not available in 12 months
    setupFee: 99,
    description: "Internet-Flatrate",
    features: ["600 Mbit/s Download", "300 Mbit/s Upload", "Flatrate", "IPv4 & IPv6"],
  },
  {
    id: "einfach-1000",
    name: "einfach 1000",
    displayName: "1000",
    speed: "1000 Mbit/s",
    downloadSpeed: 1000,
    uploadSpeed: 500,
    monthlyPrice: 59.00,
    monthlyPrice12: 59.00, // Not available in 12 months
    setupFee: 99,
    description: "Internet-Flatrate",
    features: ["1000 Mbit/s Download", "500 Mbit/s Upload", "Flatrate", "IPv4 & IPv6", "Premium Speed"],
  },
];

// FiberBasic 100 - für FTTB/Limited und als versteckte Option für FTTH
export const fiberBasicTariff: TariffOption = {
  id: "fiber-basic-100",
  name: "FiberBasic 100",
  displayName: "100",
  speed: "100 Mbit/s",
  downloadSpeed: 100,
  uploadSpeed: 50,
  monthlyPrice: 34.90,
  monthlyPrice12: 49.90, // 12 months only for FiberBasic
  setupFee: 99,
  description: "Internet + Telefon-Flatrate",
  features: ["100 Mbit/s Download", "50 Mbit/s Upload", "Flatrate", "IPv4 & IPv6", "Telefon inklusive"],
  includesPhone: true,
};

// Limited connection tariff - nur FiberBasic 100
export const limitedTariffs: TariffOption[] = [fiberBasicTariff];

// Legacy FTTB tariffs (kept for compatibility but may not be used)
export const fttbTariffs: TariffOption[] = limitedTariffs;

// Router-Optionen von COM-IN
// FTTH: FB5690 and FB5690 Pro (with 4€ discount for einfach tariffs)
// FTTB: Only FB7690
export const routerOptions: TariffAddon[] = [
  {
    id: "router-none",
    name: "Kein Router",
    description: "Ich habe bereits einen eigenen Router",
    monthlyPrice: 0,
    discountedPrice: 0,
    oneTimePrice: 0,
    category: "router",
    connectionType: 'both',
  },
  {
    id: "router-fritzbox-5690-pro",
    name: "FRITZ!Box 5690 Pro",
    description: "Premium WiFi 7 Router mit Glasfaser-Anschluss",
    monthlyPrice: 10.00,
    discountedPrice: 6.00, // 4€ discount with einfach tariffs
    oneTimePrice: 0,
    category: "router",
    connectionType: 'ftth', // Only for FTTH
  },
  {
    id: "router-fritzbox-5690",
    name: "FRITZ!Box 5690",
    description: "WiFi 7 Router mit Glasfaser-Anschluss",
    monthlyPrice: 4.00,
    discountedPrice: 0, // 4€ discount = 0€
    oneTimePrice: 0,
    category: "router",
    connectionType: 'ftth', // Only for FTTH
  },
  {
    id: "router-fritzbox-7690",
    name: "FRITZ!Box 7690",
    description: "WiFi 7 Router für DSL/VDSL",
    monthlyPrice: 7.00,
    discountedPrice: 7.00, // No discount on this model
    oneTimePrice: 0,
    category: "router",
    connectionType: 'fttb', // Only for FTTB
  },
];

// Get routers filtered by connection type
export const getRoutersForConnectionType = (connectionType: 'ftth' | 'limited' | 'not-connected' | null): TariffAddon[] => {
  if (!connectionType || connectionType === 'not-connected') return [];
  
  const type = connectionType === 'ftth' ? 'ftth' : 'fttb';
  return routerOptions.filter(r => 
    r.connectionType === 'both' || r.connectionType === type
  );
};

// COM-IN TV (Kabel TV) - nur bei FTTH verfügbar
export const cominTvOptions: TariffAddon[] = [
  {
    id: "tv-comin",
    name: "COM-IN TV",
    description: "Kabel TV Grundpaket",
    monthlyPrice: 10.00,
    oneTimePrice: 0,
    category: "tv",
  },
];

// COM-IN TV Add-ons (HD Pakete)
export const cominTvAddons: TariffAddon[] = [
  {
    id: "tv-basishd",
    name: "Basis HD",
    description: "HD-Qualität für die wichtigsten Sender",
    monthlyPrice: 4.90,
    oneTimePrice: 0,
    category: "tv-addon",
  },
  {
    id: "tv-familyhd",
    name: "Family HD",
    description: "HD für die ganze Familie + Kindersender",
    monthlyPrice: 19.90,
    oneTimePrice: 0,
    category: "tv-addon",
  },
];

// COM-IN TV Hardware (required when selecting HD packages)
export const cominTvHardware: TariffAddon[] = [
  {
    id: "tv-smartcard",
    name: "Smartcard Aktivierung",
    description: "Einmalige Aktivierungsgebühr",
    monthlyPrice: 0,
    oneTimePrice: 29.90,
    category: "tv-hardware",
  },
  {
    id: "tv-receiver",
    name: "Technistar 4K ISIO (1TB)",
    description: "4K Receiver mit 1TB Festplatte zur Miete",
    monthlyPrice: 4.90,
    oneTimePrice: 0,
    category: "tv-hardware",
  },
  {
    id: "tv-ci-module",
    name: "CI+ Modul (M7 fähig)",
    description: "Zum Kauf für Ihren TV",
    monthlyPrice: 0,
    oneTimePrice: 79.90,
    category: "tv-hardware",
  },
];

// WAIPU TV Options
export const waipuTvOptions: TariffAddon[] = [
  {
    id: "tv-waipu-comfort",
    name: "waipu.tv Comfort",
    description: "Streaming TV mit über 180 Sendern",
    monthlyPrice: 7.99,
    oneTimePrice: 0,
    category: "tv",
  },
  {
    id: "tv-waipu-premium",
    name: "waipu.tv Premium",
    description: "Streaming TV mit über 250 Sendern in HD",
    monthlyPrice: 13.99,
    oneTimePrice: 0,
    category: "tv",
  },
];

// WAIPU TV Hardware
export const waipuTvHardware: TariffAddon[] = [
  {
    id: "tv-waipu-stick",
    name: "waipu.tv 4K Stick",
    description: "Streaming Stick für Ihren TV",
    monthlyPrice: 0,
    oneTimePrice: 40.00,
    category: "tv-hardware",
  },
];

// Telefon-Optionen (nur für "einfach" Tarife, FiberBasic hat Telefon inklusive)
export const phoneOptions: TariffAddon[] = [
  {
    id: "phone-flat-festnetz",
    name: "Telefon-Flat Festnetz",
    description: "Unbegrenzt ins deutsche Festnetz telefonieren",
    monthlyPrice: 2.95,
    oneTimePrice: 0,
    category: "phone",
  },
];

// Promo codes
export interface PromoCode {
  code: string;
  description: string;
  validAddresses: string[]; // List of addresses where this code is valid (street names)
  routerDiscount: number; // Monthly discount on router
  setupFeeWaived: boolean; // Whether setup fee is waived
}

export const promoCodes: PromoCode[] = [
  {
    code: "GWG-TEST",
    description: "4€ Rabatt auf Router + Anschlussgebühr entfällt",
    validAddresses: ["fontanestraße", "fontanestrasse"],
    routerDiscount: 4,
    setupFeeWaived: true,
  },
];

// Valid customer numbers for referral program
// Format: "KD" + 6 digits or "50000" + digits
export const validCustomerNumbers: string[] = [
  "KD123456", // Test customer number
];

// Referral program
export interface ReferralInfo {
  newCustomerBonus: number;
  referrerBonus: number;
}

export const referralProgram: ReferralInfo = {
  newCustomerBonus: 50,
  referrerBonus: 50,
};

// Kombinierte Addon-Liste für Kompatibilität
export const tariffAddons: TariffAddon[] = [
  ...routerOptions,
  ...phoneOptions,
  ...cominTvOptions,
  ...waipuTvOptions,
];
