export interface TariffOption {
  id: string;
  name: string;
  displayName: string;
  speed: string;
  downloadSpeed: number;
  uploadSpeed: number;
  monthlyPrice: number;
  setupFee: number;
  description: string;
  features: string[];
  recommended?: boolean;
}

export interface TariffAddon {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  oneTimePrice: number;
  category: 'router' | 'phone' | 'tv' | 'security';
}

// FTTH Tarife - "einfach Internet" Produkte von COM-IN (alle Tarife)
export const ftthTariffs: TariffOption[] = [
  {
    id: "fiber-basic-100",
    name: "FiberBasic 100",
    displayName: "100",
    speed: "100 Mbit/s",
    downloadSpeed: 100,
    uploadSpeed: 50,
    monthlyPrice: 34.90,
    setupFee: 0,
    description: "Internet-Flatrate",
    features: ["100 Mbit/s Download", "50 Mbit/s Upload", "Flatrate", "IPv4 & IPv6"],
  },
  {
    id: "einfach-150",
    name: "einfach 150",
    displayName: "150",
    speed: "150 Mbit/s",
    downloadSpeed: 150,
    uploadSpeed: 75,
    monthlyPrice: 35.00,
    setupFee: 0,
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
    setupFee: 0,
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
    setupFee: 0,
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
    setupFee: 0,
    description: "Internet-Flatrate",
    features: ["1000 Mbit/s Download", "500 Mbit/s Upload", "Flatrate", "IPv4 & IPv6", "Premium Speed"],
  },
];

// Limited connection tariff - nur FiberBasic 100
export const limitedTariffs: TariffOption[] = [
  {
    id: "fiber-basic-100",
    name: "FiberBasic 100",
    displayName: "100",
    speed: "100 Mbit/s",
    downloadSpeed: 100,
    uploadSpeed: 50,
    monthlyPrice: 34.90,
    setupFee: 0,
    description: "Internet-Flatrate",
    features: ["100 Mbit/s Download", "50 Mbit/s Upload", "Flatrate", "IPv4 & IPv6"],
  },
];

// Legacy FTTB tariffs (kept for compatibility but may not be used)
export const fttbTariffs: TariffOption[] = limitedTariffs;

// Router-Optionen von COM-IN
export const routerOptions: TariffAddon[] = [
  {
    id: "router-none",
    name: "Kein Router",
    description: "Ich habe bereits einen eigenen Router",
    monthlyPrice: 0,
    oneTimePrice: 0,
    category: "router",
  },
  {
    id: "router-fritzbox-5690-pro",
    name: "FRITZ!Box 5690 Pro",
    description: "Premium WiFi 7 Router mit Glasfaser-Anschluss",
    monthlyPrice: 9.99,
    oneTimePrice: 0,
    category: "router",
  },
  {
    id: "router-fritzbox-5690",
    name: "FRITZ!Box 5690",
    description: "WiFi 7 Router mit Glasfaser-Anschluss",
    monthlyPrice: 7.99,
    oneTimePrice: 0,
    category: "router",
  },
  {
    id: "router-fritzbox-7690",
    name: "FRITZ!Box 7690",
    description: "WiFi 7 Router für DSL/VDSL",
    monthlyPrice: 6.99,
    oneTimePrice: 0,
    category: "router",
  },
];

// TV-Pakete von COM-IN
export const tvOptions: TariffAddon[] = [
  {
    id: "tv-none",
    name: "Kein TV",
    description: "Ohne TV-Paket bestellen",
    monthlyPrice: 0,
    oneTimePrice: 0,
    category: "tv",
  },
  {
    id: "tv-comin",
    name: "COM-IN TV",
    description: "Grundpaket mit über 100 Sendern",
    monthlyPrice: 5.99,
    oneTimePrice: 0,
    category: "tv",
  },
  {
    id: "tv-comin-basishd",
    name: "COM-IN TV inkl. BasisHD",
    description: "Mit HD-Qualität für die wichtigsten Sender",
    monthlyPrice: 8.99,
    oneTimePrice: 0,
    category: "tv",
  },
  {
    id: "tv-comin-familyhd",
    name: "COM-IN TV inkl. BasisHD und FamilyHD",
    description: "HD für die ganze Familie + Kindersender",
    monthlyPrice: 12.99,
    oneTimePrice: 0,
    category: "tv",
  },
  {
    id: "tv-waipu-perfect-plus",
    name: "waipu.tv Perfect Plus",
    description: "Streaming TV mit über 250 Sendern",
    monthlyPrice: 12.99,
    oneTimePrice: 0,
    category: "tv",
  },
  {
    id: "tv-waipu-comfort",
    name: "waipu.tv Comfort",
    description: "Streaming TV mit über 180 Sendern",
    monthlyPrice: 6.99,
    oneTimePrice: 0,
    category: "tv",
  },
];

// Telefon-Optionen
export const phoneOptions: TariffAddon[] = [
  {
    id: "phone-flat",
    name: "Telefon-Flat Festnetz",
    description: "Unbegrenzt ins deutsche Festnetz telefonieren",
    monthlyPrice: 2.95,
    oneTimePrice: 0,
    category: "phone",
  },
  {
    id: "phone-allnet",
    name: "Telefon-Flat Allnet",
    description: "Unbegrenzt in alle deutschen Fest- und Mobilfunknetze",
    monthlyPrice: 4.95,
    oneTimePrice: 0,
    category: "phone",
  },
];

// Kombinierte Addon-Liste für Kompatibilität
export const tariffAddons: TariffAddon[] = [
  ...routerOptions,
  ...phoneOptions,
  ...tvOptions,
];
