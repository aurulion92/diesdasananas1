export type ConnectionType = 'ftth' | 'fttb' | 'none';

export interface AddressData {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  connectionType: ConnectionType;
}

// Mock-Datenbank mit Adressen und Ausbauart
export const mockAddresses: AddressData[] = [
  // FTTH Adressen (Glasfaser bis ins Haus)
  { street: "Hauptstraße", houseNumber: "1", postalCode: "10115", city: "Berlin", connectionType: "ftth" },
  { street: "Hauptstraße", houseNumber: "2", postalCode: "10115", city: "Berlin", connectionType: "ftth" },
  { street: "Hauptstraße", houseNumber: "3", postalCode: "10115", city: "Berlin", connectionType: "ftth" },
  { street: "Musterweg", houseNumber: "10", postalCode: "80331", city: "München", connectionType: "ftth" },
  { street: "Musterweg", houseNumber: "12", postalCode: "80331", city: "München", connectionType: "ftth" },
  { street: "Bahnhofstraße", houseNumber: "5", postalCode: "20095", city: "Hamburg", connectionType: "ftth" },
  { street: "Bahnhofstraße", houseNumber: "7", postalCode: "20095", city: "Hamburg", connectionType: "ftth" },
  { street: "Lindenallee", houseNumber: "22", postalCode: "50667", city: "Köln", connectionType: "ftth" },
  
  // FTTB Adressen (Glasfaser bis zum Gebäude)
  { street: "Parkstraße", houseNumber: "15", postalCode: "10115", city: "Berlin", connectionType: "fttb" },
  { street: "Parkstraße", houseNumber: "17", postalCode: "10115", city: "Berlin", connectionType: "fttb" },
  { street: "Schillerplatz", houseNumber: "3", postalCode: "80331", city: "München", connectionType: "fttb" },
  { street: "Schillerplatz", houseNumber: "5", postalCode: "80331", city: "München", connectionType: "fttb" },
  { street: "Gartenweg", houseNumber: "8", postalCode: "20095", city: "Hamburg", connectionType: "fttb" },
  { street: "Rosenstraße", houseNumber: "11", postalCode: "50667", city: "Köln", connectionType: "fttb" },
  
  // Nicht angeschlossen
  { street: "Waldweg", houseNumber: "99", postalCode: "12345", city: "Musterdorf", connectionType: "none" },
];

export function checkAddress(street: string, houseNumber: string, postalCode: string): AddressData | null {
  const normalizedStreet = street.toLowerCase().trim();
  const normalizedHouseNumber = houseNumber.trim();
  const normalizedPostalCode = postalCode.trim();
  
  const found = mockAddresses.find(addr => 
    addr.street.toLowerCase() === normalizedStreet &&
    addr.houseNumber === normalizedHouseNumber &&
    addr.postalCode === normalizedPostalCode
  );
  
  return found || null;
}
