import { supabase } from '@/integrations/supabase/client';

export type ConnectionType = 'ftth' | 'limited' | 'not-connected';
export type BuildingType = 'efh' | 'mfh' | 'wowi';

// Determine building type based on residential units (WE)
export function getBuildingType(residentialUnits: number | null): BuildingType {
  if (!residentialUnits || residentialUnits <= 1) return 'efh';
  if (residentialUnits === 2) return 'mfh';
  return 'wowi'; // 3+ units
}

export interface AddressData {
  street: string;
  houseNumber: string;
  city: string;
  postalCode?: string;
  ausbauart: string;
  connectionType: ConnectionType;
  kabelTvAvailable: boolean;
  buildingId?: string;
  residentialUnits?: number; // WE - Wohneinheiten
  buildingType?: BuildingType; // Derived from residentialUnits: efh=1, mfh=2, wowi=3+
  kmuOnly?: boolean; // True if building only has KMU tariffs (no PK)
}

// Determine connection type based on ausbau_art from database
export function getConnectionType(ausbauart: string | null): ConnectionType {
  if (!ausbauart) return 'not-connected';
  
  const normalized = ausbauart.toLowerCase().trim();
  
  // FTTH = All tariffs available
  if (normalized === 'ftth') {
    return 'ftth';
  }
  
  // FTTH Limited (Aktivtechnik) = FTTH but max 500 Mbit/s (einfach 600/1000 not available)
  if (normalized === 'ftth_limited') {
    return 'ftth'; // Still FTTH, speed limit handled elsewhere
  }
  
  // FTTB = Limited (only FiberBasic 100)
  if (normalized === 'fttb') {
    return 'limited';
  }
  
  // Everything else = Not connected
  return 'not-connected';
}

// Result type for checking building tariff availability
export interface BuildingAvailabilityResult {
  exists: boolean;
  pkAvailable: boolean;
  kmuAvailable: boolean;
  addressData: AddressData | null;
}

// Check if building exists and what tariffs are available
export async function checkBuildingAvailability(
  street: string,
  houseNumber: string,
  city: string
): Promise<BuildingAvailabilityResult> {
  try {
    // First, resolve the building via the secure RPC (respects RLS)
    const { data, error } = await supabase.rpc('check_address_availability', {
      p_street: street,
      p_house_number: houseNumber,
      p_city: city,
    });

    if (error) {
      console.error('Error checking building availability (RPC):', error);
      return { exists: false, pkAvailable: false, kmuAvailable: false, addressData: null };
    }

    if (!data || data.length === 0) {
      return { exists: false, pkAvailable: false, kmuAvailable: false, addressData: null };
    }

    const result = data[0] as {
      street: string;
      house_number: string;
      city: string;
      postal_code: string | null;
      ausbau_art: string | null;
      ausbau_status: string | null;
      kabel_tv_available: boolean | null;
      residential_units: number | null;
      building_id: string | null;
    };

    const addressData: AddressData = {
      street: result.street,
      houseNumber: result.house_number,
      city: result.city,
      postalCode: result.postal_code || undefined,
      ausbauart: result.ausbau_art || '',
      connectionType: getConnectionType(result.ausbau_art),
      kabelTvAvailable: result.kabel_tv_available || false,
      buildingId: result.building_id || undefined,
      residentialUnits: result.residential_units || 1,
      buildingType: getBuildingType(result.residential_units),
    };

    // If we for some reason don't have a building_id, we can't determine PK/KMU products
    if (!result.building_id) {
      return { exists: true, pkAvailable: false, kmuAvailable: false, addressData };
    }

    // Load all products assigned to this building
    const { data: productBuildingRows, error: mappingError } = await supabase
      .from('product_buildings')
      .select('product_id')
      .eq('building_id', result.building_id);

    if (mappingError) {
      console.error('Error loading product_buildings:', mappingError);
      // If we can't load product_buildings, default to all products available based on infrastructure
      return { exists: true, pkAvailable: true, kmuAvailable: true, addressData };
    }

    const productIds = (productBuildingRows || []).map((row: { product_id: string }) => row.product_id);

    // If NO products are explicitly assigned, then ALL products matching infrastructure are available
    // This is the fallback behavior - building restrictions are opt-in
    if (productIds.length === 0) {
      // No explicit restrictions = all products available based on infrastructure type
      return { exists: true, pkAvailable: true, kmuAvailable: true, addressData };
    }

    // Fetch products to see which customer types are available
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, customer_type')
      .in('id', productIds)
      .eq('is_active', true);

    if (productsError) {
      console.error('Error loading products for availability:', productsError);
      return { exists: true, pkAvailable: true, kmuAvailable: true, addressData };
    }

    const pkAvailable = (products || []).some((p: { customer_type: string }) => p.customer_type === 'pk');
    const kmuAvailable = (products || []).some((p: { customer_type: string }) => p.customer_type === 'kmu');
    
    // Mark as KMU-only if only KMU products available (no PK)
    const kmuOnly = kmuAvailable && !pkAvailable;
    addressData.kmuOnly = kmuOnly;

    return {
      exists: true,
      pkAvailable,
      kmuAvailable,
      addressData,
    };
  } catch (error) {
    console.error('Error checking building availability:', error);
    return { exists: false, pkAvailable: false, kmuAvailable: false, addressData: null };
  }
}

// Check address against database for a specific customer type using building availability
export async function checkAddress(
  street: string,
  houseNumber: string,
  city: string,
  customerType: 'pk' | 'kmu' = 'pk',
): Promise<AddressData | null> {
  try {
    const availability = await checkBuildingAvailability(street, houseNumber, city);

    if (!availability.exists || !availability.addressData) {
      return null;
    }

    if (customerType === 'pk' && !availability.pkAvailable) {
      return null;
    }

    if (customerType === 'kmu' && !availability.kmuAvailable) {
      return null;
    }

    return availability.addressData;
  } catch (error) {
    console.error('Error checking address:', error);
    return null;
  }
}

// Search cities for autocomplete using Supabase RPC function
export async function searchCities(query: string): Promise<string[]> {
  if (query.length < 2) return [];
  
  try {
    const { data, error } = await supabase.rpc('search_cities', {
      p_query: query
    });

    if (error) {
      console.error('Error searching cities:', error);
      return [];
    }

    return data?.map((row: { city: string }) => row.city) || [];
  } catch (error) {
    console.error('Error searching cities:', error);
    return [];
  }
}

// Get streets for autocomplete using Supabase RPC function
export async function searchStreets(query: string, city: string): Promise<string[]> {
  if (query.length < 3) return [];
  
  try {
    const { data, error } = await supabase.rpc('search_streets', {
      p_query: query,
      p_city: city
    });

    if (error) {
      console.error('Error searching streets:', error);
      return [];
    }

    return data?.map((row: { street: string }) => row.street) || [];
  } catch (error) {
    console.error('Error searching streets:', error);
    return [];
  }
}

// Get house numbers for a specific street using Supabase RPC function
export async function getHouseNumbers(street: string, city: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('get_house_numbers', {
      p_street: street,
      p_city: city
    });

    if (error) {
      console.error('Error getting house numbers:', error);
      return [];
    }

    // Sort house numbers naturally (1, 2, 3, 10, 11... not 1, 10, 11, 2, 3...)
    const houseNumbers = data?.map((row: { house_number: string }) => row.house_number) || [];
    return houseNumbers.sort((a: string, b: string) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });
  } catch (error) {
    console.error('Error getting house numbers:', error);
    return [];
  }
}
