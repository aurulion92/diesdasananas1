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

// FTTH Tarife - "einfach Internet" Produkte von COM-IN
export const ftthTariffs: TariffOption[] = [
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

// FTTB Tarife (geringere Geschwindigkeiten)
export const fttbTariffs: TariffOption[] = [
  {
    id: "einfach-50",
    name: "einfach 50",
    displayName: "50",
    speed: "50 Mbit/s",
    downloadSpeed: 50,
    uploadSpeed: 10,
    monthlyPrice: 29.00,
    setupFee: 0,
    description: "Internet-Flatrate",
    features: ["50 Mbit/s Download", "10 Mbit/s Upload", "Flatrate", "IPv4 & IPv6"],
  },
  {
    id: "einfach-100",
    name: "einfach 100",
    displayName: "100",
    speed: "100 Mbit/s",
    downloadSpeed: 100,
    uploadSpeed: 40,
    monthlyPrice: 35.00,
    setupFee: 0,
    description: "Internet-Flatrate",
    features: ["100 Mbit/s Download", "40 Mbit/s Upload", "Flatrate", "IPv4 & IPv6"],
    recommended: true,
  },
  {
    id: "einfach-200",
    name: "einfach 200",
    displayName: "200",
    speed: "200 Mbit/s",
    downloadSpeed: 200,
    uploadSpeed: 50,
    monthlyPrice: 42.00,
    setupFee: 0,
    description: "Internet-Flatrate",
    features: ["200 Mbit/s Download", "50 Mbit/s Upload", "Flatrate", "IPv4 & IPv6"],
  },
];

export const tariffAddons: TariffAddon[] = [
  {
    id: "router-basic",
    name: "WLAN Router",
    description: "Hochwertiger WLAN Router für optimale Abdeckung",
    monthlyPrice: 0,
    oneTimePrice: 0,
    category: "router",
  },
  {
    id: "router-pro",
    name: "WLAN Mesh Router",
    description: "WiFi 6 Router mit Mesh-Funktion für große Wohnungen",
    monthlyPrice: 4.99,
    oneTimePrice: 0,
    category: "router",
  },
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
    description: "100+ HD Sender + Premium Inhalte",
    monthlyPrice: 14.99,
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
