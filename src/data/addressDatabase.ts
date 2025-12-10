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
  if (normalized === 'ftth') {
    return 'ftth';
  }
  
  // Limited connection types = Only FiberBasic 100
  const limitedTypes = [
    'mfh, gfast',
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
    const response = await fetch('/data/addresses.csv');
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
