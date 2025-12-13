import { supabase } from '@/integrations/supabase/client';

export type ConnectionType = 'ftth' | 'limited' | 'not-connected';

export interface AddressData {
  street: string;
  houseNumber: string;
  city: string;
  ausbauart: string;
  connectionType: ConnectionType;
  kabelTvAvailable: boolean;
  buildingId?: string;
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

// Check address against Supabase database - get full building info including ID
export async function checkAddress(
  street: string, 
  houseNumber: string, 
  city: string
): Promise<AddressData | null> {
  try {
    // First try to get from buildings table directly to get the building ID
    const { data: buildingData, error: buildingError } = await supabase
      .from('buildings')
      .select('id, street, house_number, city, ausbau_art, ausbau_status, kabel_tv_available')
      .ilike('street', street)
      .ilike('house_number', houseNumber)
      .ilike('city', city)
      .eq('ausbau_status', 'abgeschlossen')
      .limit(1)
      .single();

    if (!buildingError && buildingData) {
      return {
        street: buildingData.street,
        houseNumber: buildingData.house_number,
        city: buildingData.city,
        ausbauart: buildingData.ausbau_art || '',
        connectionType: getConnectionType(buildingData.ausbau_art),
        kabelTvAvailable: buildingData.kabel_tv_available || false,
        buildingId: buildingData.id
      };
    }

    // Fallback to RPC if direct query fails
    const { data, error } = await supabase.rpc('check_address_availability', {
      p_street: street,
      p_house_number: houseNumber,
      p_city: city
    });

    if (error) {
      console.error('Error checking address:', error);
      return null;
    }

    if (data && data.length > 0) {
      const result = data[0];
      return {
        street: result.street,
        houseNumber: result.house_number,
        city: result.city,
        ausbauart: result.ausbau_art || '',
        connectionType: getConnectionType(result.ausbau_art),
        kabelTvAvailable: result.kabel_tv_available || false
      };
    }

    return null;
  } catch (error) {
    console.error('Error checking address:', error);
    return null;
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
