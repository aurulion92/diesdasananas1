export type ConnectionType = 'ftth' | 'limited' | 'not-connected';

export interface AddressData {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  lot: string;
  houseType: string;
  ausbauart: string;
  connectionType: ConnectionType;
}

// Cache for parsed addresses
let addressCache: AddressData[] | null = null;

// Determine connection type based on "Ausbauart" column
export function getConnectionType(ausbauart: string): ConnectionType {
  const normalized = ausbauart.toLowerCase().trim();
  
  // FTTH = All tariffs available
  const ftthTypes = [
    'ftth',
    'mfh, ftth bis pop',
    'mfh, ftth bis aktivtechnik',
    'aktivtechnik'
  ];
  
  if (ftthTypes.some(type => normalized === type.toLowerCase() || normalized.includes(type.toLowerCase()))) {
    return 'ftth';
  }
  
  // Limited connection types = Only FiberBasic 100
  const limitedTypes = [
    'mfh, gfast',
    'fttb (g.fast)',
    'fttb',
    'mfh, fttb',
    'efh, allnet-konverter vdsl',
    'allnet-konverter,',
    'allnet-konverter',
    'efh, allnet-konverter g.hn'
  ];
  
  if (limitedTypes.some(type => normalized.includes(type.toLowerCase()))) {
    return 'limited';
  }
  
  // Everything else (including "Nicht ausgebaut") = Not connected
  return 'not-connected';
}

// Parse CSV data
export async function loadAddresses(): Promise<AddressData[]> {
  if (addressCache) {
    return addressCache;
  }

  try {
    // Add cache-busting parameter to prevent browser caching
    const response = await fetch('/data/addresses.csv?v=' + Date.now());
    const csvText = await response.text();
    
    const lines = csvText.split('\n');
    const addresses: AddressData[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(';');
      if (parts.length >= 7) {
        const ausbauart = parts[6]?.trim() || '';
        addresses.push({
          street: parts[0]?.trim() || '',
          houseNumber: parts[1]?.trim() || '',
          postalCode: parts[2]?.trim() || '',
          city: parts[3]?.trim() || '',
          lot: parts[4]?.trim() || '',
          houseType: parts[5]?.trim() || '',
          ausbauart: ausbauart,
          connectionType: getConnectionType(ausbauart),
        });
      }
    }
    
    addressCache = addresses;
    return addresses;
  } catch (error) {
    console.error('Error loading addresses:', error);
    return [];
  }
}

// Check address against database
export async function checkAddress(
  street: string, 
  houseNumber: string, 
  city: string
): Promise<AddressData | null> {
  const addresses = await loadAddresses();
  
  const normalizedStreet = street.toLowerCase().trim();
  const normalizedHouseNumber = houseNumber.toLowerCase().trim();
  const normalizedCity = city.toLowerCase().trim();
  
  const found = addresses.find(addr => 
    addr.street.toLowerCase() === normalizedStreet &&
    addr.houseNumber.toLowerCase() === normalizedHouseNumber &&
    addr.city.toLowerCase() === normalizedCity
  );
  
  return found || null;
}

// Get unique streets for autocomplete (min 3 characters)
export async function searchStreets(query: string, city: string): Promise<string[]> {
  if (query.length < 3) return [];
  
  const addresses = await loadAddresses();
  const normalizedCity = city.toLowerCase().trim();
  const normalizedQuery = query.toLowerCase().trim();
  
  const streets = new Set<string>();
  addresses
    .filter(addr => 
      addr.city.toLowerCase() === normalizedCity &&
      addr.street.toLowerCase().includes(normalizedQuery)
    )
    .forEach(addr => streets.add(addr.street));
  
  return Array.from(streets).sort().slice(0, 10);
}

// Get house numbers for a specific street
export async function getHouseNumbers(street: string, city: string): Promise<string[]> {
  const addresses = await loadAddresses();
  const normalizedStreet = street.toLowerCase().trim();
  const normalizedCity = city.toLowerCase().trim();
  
  const houseNumbers = new Set<string>();
  addresses
    .filter(addr => 
      addr.city.toLowerCase() === normalizedCity &&
      addr.street.toLowerCase() === normalizedStreet
    )
    .forEach(addr => houseNumbers.add(addr.houseNumber));
  
  // Sort house numbers naturally (1, 2, 3, 10, 11... not 1, 10, 11, 2, 3...)
  return Array.from(houseNumbers).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });
}

// Get unique streets for autocomplete (optional)
export async function getStreets(city: string): Promise<string[]> {
  const addresses = await loadAddresses();
  const normalizedCity = city.toLowerCase().trim();
  
  const streets = new Set<string>();
  addresses
    .filter(addr => addr.city.toLowerCase() === normalizedCity)
    .forEach(addr => streets.add(addr.street));
  
  return Array.from(streets).sort();
}
