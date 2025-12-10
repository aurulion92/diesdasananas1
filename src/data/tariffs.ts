export interface TariffOption {
  id: string;
  name: string;
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

// FTTH Tarife (höhere Geschwindigkeiten)
export const ftthTariffs: TariffOption[] = [
  {
    id: "ftth-100",
    name: "Glasfaser 100",
    speed: "100 Mbit/s",
    downloadSpeed: 100,
    uploadSpeed: 50,
    monthlyPrice: 29.99,
    setupFee: 49.99,
    description: "Ideal für Einsteiger und kleine Haushalte",
    features: ["100 Mbit/s Download", "50 Mbit/s Upload", "Flatrate", "IPv4 & IPv6"],
  },
  {
    id: "ftth-250",
    name: "Glasfaser 250",
    speed: "250 Mbit/s",
    downloadSpeed: 250,
    uploadSpeed: 100,
    monthlyPrice: 39.99,
    setupFee: 49.99,
    description: "Perfekt für Familien mit mehreren Geräten",
    features: ["250 Mbit/s Download", "100 Mbit/s Upload", "Flatrate", "IPv4 & IPv6", "Priorität bei Support"],
    recommended: true,
  },
  {
    id: "ftth-500",
    name: "Glasfaser 500",
    speed: "500 Mbit/s",
    downloadSpeed: 500,
    uploadSpeed: 250,
    monthlyPrice: 49.99,
    setupFee: 49.99,
    description: "Für Power-User und Home-Office",
    features: ["500 Mbit/s Download", "250 Mbit/s Upload", "Flatrate", "IPv4 & IPv6", "Priorität bei Support"],
  },
  {
    id: "ftth-1000",
    name: "Glasfaser 1000",
    speed: "1 Gbit/s",
    downloadSpeed: 1000,
    uploadSpeed: 500,
    monthlyPrice: 69.99,
    setupFee: 0,
    description: "Maximum Speed - keine Kompromisse",
    features: ["1 Gbit/s Download", "500 Mbit/s Upload", "Flatrate", "IPv4 & IPv6", "Premium Support", "Gratis Installation"],
  },
];

// FTTB Tarife (geringere Geschwindigkeiten)
export const fttbTariffs: TariffOption[] = [
  {
    id: "fttb-50",
    name: "Fiber 50",
    speed: "50 Mbit/s",
    downloadSpeed: 50,
    uploadSpeed: 10,
    monthlyPrice: 24.99,
    setupFee: 49.99,
    description: "Grundversorgung für einfache Nutzung",
    features: ["50 Mbit/s Download", "10 Mbit/s Upload", "Flatrate", "IPv4 & IPv6"],
  },
  {
    id: "fttb-100",
    name: "Fiber 100",
    speed: "100 Mbit/s",
    downloadSpeed: 100,
    uploadSpeed: 40,
    monthlyPrice: 34.99,
    setupFee: 49.99,
    description: "Solide Leistung für den Alltag",
    features: ["100 Mbit/s Download", "40 Mbit/s Upload", "Flatrate", "IPv4 & IPv6"],
    recommended: true,
  },
  {
    id: "fttb-200",
    name: "Fiber 200",
    speed: "200 Mbit/s",
    downloadSpeed: 200,
    uploadSpeed: 50,
    monthlyPrice: 44.99,
    setupFee: 49.99,
    description: "Mehr Speed für anspruchsvolle Nutzer",
    features: ["200 Mbit/s Download", "50 Mbit/s Upload", "Flatrate", "IPv4 & IPv6", "Priorität bei Support"],
  },
];

export const tariffAddons: TariffAddon[] = [
  {
    id: "router-basic",
    name: "WLAN Router Basic",
    description: "Hochwertiger WLAN Router für optimale Abdeckung",
    monthlyPrice: 0,
    oneTimePrice: 0,
    category: "router",
  },
  {
    id: "router-pro",
    name: "WLAN Router Pro",
    description: "WiFi 6 Router mit Mesh-Funktion für große Wohnungen",
    monthlyPrice: 4.99,
    oneTimePrice: 0,
    category: "router",
  },
  {
    id: "phone-flat",
    name: "Telefon Flatrate",
    description: "Unbegrenzt ins deutsche Festnetz telefonieren",
    monthlyPrice: 4.99,
    oneTimePrice: 0,
    category: "phone",
  },
  {
    id: "phone-allnet",
    name: "Allnet Flat",
    description: "Unbegrenzt in alle deutschen Netze",
    monthlyPrice: 9.99,
    oneTimePrice: 0,
    category: "phone",
  },
  {
    id: "tv-basic",
    name: "TV Paket Basic",
    description: "50+ HD Sender inklusive",
    monthlyPrice: 7.99,
    oneTimePrice: 0,
    category: "tv",
  },
  {
    id: "tv-premium",
    name: "TV Paket Premium",
    description: "100+ HD Sender + Sky Sport",
    monthlyPrice: 19.99,
    oneTimePrice: 0,
    category: "tv",
  },
  {
    id: "security",
    name: "Internet Security",
    description: "Virenschutz für bis zu 5 Geräte",
    monthlyPrice: 3.99,
    oneTimePrice: 0,
    category: "security",
  },
];
