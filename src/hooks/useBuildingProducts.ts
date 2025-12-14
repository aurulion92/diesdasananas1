import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DatabaseProduct {
  id: string;  // This is now the UUID from the database
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  setup_fee: number;
  download_speed: number | null;
  upload_speed: number | null;
  is_ftth: boolean;
  is_fttb: boolean;
  is_ftth_limited: boolean;
  is_active: boolean;
  display_order: number;
  contract_months: number;
  includes_phone: boolean;
  is_building_restricted: boolean;
  hide_for_ftth: boolean;
  info_text: string | null;
  external_link_url: string | null;
  external_link_label: string | null;
}

interface UseBuildingProductsResult {
  products: DatabaseProduct[];
  loading: boolean;
  hasManualAssignment: boolean;
}

/**
 * Hook to fetch products available for a specific building.
 * If the building has manual product assignments, only those products are returned.
 * Otherwise, returns all products matching the infrastructure type.
 */
export function useBuildingProducts(
  buildingId: string | null | undefined, 
  ausbauart: string | null | undefined
): UseBuildingProductsResult {
  const [products, setProducts] = useState<DatabaseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasManualAssignment, setHasManualAssignment] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      
      try {
        // First check if this building has manual product assignments
        if (buildingId) {
          const { data: assignedProducts, error: assignError } = await supabase
            .from('product_buildings')
            .select(`
              product_id,
              products:product_id (
                id, name, slug, description, monthly_price, setup_fee,
                download_speed, upload_speed, is_ftth, is_fttb, is_ftth_limited,
                is_active, display_order, contract_months, includes_phone,
                is_building_restricted, hide_for_ftth, info_text,
                external_link_url, external_link_label
              )
            `)
            .eq('building_id', buildingId);

          if (!assignError && assignedProducts && assignedProducts.length > 0) {
            // Building has manual assignments - use only these products
            // Keep hide_for_ftth value from database!
            const manualProducts = assignedProducts
              .map((ap: any) => ap.products)
              .filter((p: any) => p && p.is_active)
              .map((p: any) => ({ ...p, hide_for_ftth: p.hide_for_ftth ?? false }))
              .sort((a: DatabaseProduct, b: DatabaseProduct) => 
                (a.display_order || 0) - (b.display_order || 0)
              );

            setProducts(manualProducts);
            setHasManualAssignment(true);
            setLoading(false);
            return;
          }
        }

        // No manual assignment - fetch products based on infrastructure type
        setHasManualAssignment(false);
        
        let query = supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        // Filter by infrastructure type
        const normalizedAusbauart = ausbauart?.toLowerCase() || '';
        
        if (normalizedAusbauart === 'ftth') {
          query = query.eq('is_ftth', true);
        } else if (normalizedAusbauart === 'ftth_limited') {
          query = query.eq('is_ftth_limited', true);
        } else if (normalizedAusbauart === 'fttb') {
          query = query.eq('is_fttb', true);
        }

        // Exclude building-restricted products (they require manual assignment)
        query = query.eq('is_building_restricted', false);

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching products:', error);
          setProducts([]);
        } else {
          const productsWithHide = (data || []).map((p: any) => ({
            ...p,
            hide_for_ftth: p.hide_for_ftth || false
          }));
          setProducts(productsWithHide);
        }
      } catch (error) {
        console.error('Error in useBuildingProducts:', error);
        setProducts([]);
      }
      
      setLoading(false);
    }

    fetchProducts();
  }, [buildingId, ausbauart]);

  return { products, loading, hasManualAssignment };
}
