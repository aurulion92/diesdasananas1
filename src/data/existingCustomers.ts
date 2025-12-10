// Bestandskunden-Datenbank
export interface ExistingCustomer {
  customerId: string;
  street: string;
  houseNumber: string;
  city: string;
  firstName: string;
  lastName: string;
  email: string;
  currentTariff: string;
  tariffName: string;
  contractStart: string;
  contractDuration: 'monthly' | '12' | '24'; // monthly = monatlich kündbar
  connectionType: 'ftth' | 'limited';
}

export const existingCustomers: ExistingCustomer[] = [
  {
    customerId: "KD123456",
    street: "Nürnberger Straße",
    houseNumber: "81",
    city: "Ingolstadt",
    firstName: "Max",
    lastName: "Mustermann",
    email: "max.mustermann@example.de",
    currentTariff: "fiber-basic-100",
    tariffName: "FiberBasic 100",
    contractStart: "2024-01-01",
    contractDuration: 'monthly',
    connectionType: 'ftth', // Nürnberger Straße ist FTTH
  },
];

export const findExistingCustomer = (
  customerId: string, 
  street: string, 
  houseNumber: string, 
  city: string
): ExistingCustomer | null => {
  const normalizedStreet = street.toLowerCase().trim();
  const normalizedHouseNumber = houseNumber.toLowerCase().trim();
  const normalizedCity = city.toLowerCase().trim();
  const normalizedCustomerId = customerId.toUpperCase().trim();

  return existingCustomers.find(customer => 
    customer.customerId === normalizedCustomerId &&
    customer.street.toLowerCase() === normalizedStreet &&
    customer.houseNumber.toLowerCase() === normalizedHouseNumber &&
    customer.city.toLowerCase() === normalizedCity
  ) || null;
};

export const getContractStatus = (customer: ExistingCustomer): string => {
  if (customer.contractDuration === 'monthly') {
    return 'Monatlich kündbar';
  }
  const startDate = new Date(customer.contractStart);
  const months = customer.contractDuration === '12' ? 12 : 24;
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + months);
  
  const today = new Date();
  if (today >= endDate) {
    return 'Monatlich kündbar (Mindestlaufzeit abgelaufen)';
  }
  
  return `Läuft bis ${endDate.toLocaleDateString('de-DE')}`;
};
