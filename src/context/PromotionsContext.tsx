import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PromotionDiscount {
  id: string;
  applies_to: string;
  discount_type: string;
  discount_amount: number | null;
  target_product_id: string | null;
  target_option_id: string | null;
}

export interface ActivePromotion {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_global: boolean;
  is_active: boolean;
  requires_customer_number: boolean;
  available_text: string | null;
  unavailable_text: string | null;
  start_date: string | null;
  end_date: string | null;
  discounts: PromotionDiscount[];
  building_ids: string[];
  target_product_slugs: string[];
}

interface PromotionsContextType {
  promotions: ActivePromotion[];
  loading: boolean;
  getRouterDiscountForTariff: (tariffSlug: string | null, buildingId: string | null) => number;
  isSetupFeeWaived: (tariffSlug: string | null, buildingId: string | null) => boolean;
  refetch: () => void;
}

const PromotionsContext = createContext<PromotionsContextType | undefined>(undefined);

export const PromotionsProvider = ({ children }: { children: ReactNode }) => {
  const [promotions, setPromotions] = useState<ActivePromotion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivePromotions = async () => {
    try {
      setLoading(true);
      
      // Fetch active promotions
      const { data: promotionsData, error: promotionsError } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true);

      if (promotionsError) throw promotionsError;

      const activePromotions: ActivePromotion[] = [];

      for (const promo of promotionsData || []) {
        // Check date validity
        const now = new Date();
        if (promo.start_date && new Date(promo.start_date) > now) continue;
        if (promo.end_date && new Date(promo.end_date) < now) continue;

        // Fetch discounts for this promotion
        const { data: discountsData } = await supabase
          .from('promotion_discounts')
          .select('*')
          .eq('promotion_id', promo.id);

        // Fetch building associations
        const { data: buildingsData } = await supabase
          .from('promotion_buildings')
          .select('building_id')
          .eq('promotion_id', promo.id);

        // Get target product slugs from discounts
        const targetProductSlugs: string[] = [];
        for (const discount of discountsData || []) {
          if (discount.target_product_id) {
            const { data: productData } = await supabase
              .from('products')
              .select('slug')
              .eq('id', discount.target_product_id)
              .maybeSingle();
            if (productData?.slug) {
              targetProductSlugs.push(productData.slug);
            }
          }
        }

        activePromotions.push({
          id: promo.id,
          name: promo.name,
          code: promo.code,
          description: promo.description,
          is_global: promo.is_global || false,
          is_active: promo.is_active || false,
          requires_customer_number: promo.requires_customer_number || false,
          available_text: promo.available_text,
          unavailable_text: promo.unavailable_text,
          start_date: promo.start_date,
          end_date: promo.end_date,
          discounts: (discountsData || []).map(d => ({
            id: d.id,
            applies_to: d.applies_to,
            discount_type: d.discount_type,
            discount_amount: d.discount_amount,
            target_product_id: d.target_product_id,
            target_option_id: d.target_option_id,
          })),
          building_ids: (buildingsData || []).map(b => b.building_id),
          target_product_slugs: targetProductSlugs,
        });
      }

      setPromotions(activePromotions);
      console.log('Loaded active promotions:', activePromotions);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivePromotions();
  }, []);

  // Check which promotions apply based on tariff and building
  const getApplicablePromotions = (
    tariffSlug: string | null,
    buildingId: string | null
  ): ActivePromotion[] => {
    return promotions.filter(promo => {
      // Global promotion without specific targets
      if (promo.is_global && promo.target_product_slugs.length === 0 && promo.building_ids.length === 0) {
        return true;
      }

      const hasProductTarget = promo.target_product_slugs.length > 0;
      const hasBuildingTarget = promo.building_ids.length > 0;

      // Check if tariff matches any target product slug
      // Match "einfach-150" against slugs like "einfach-150", "einfach-300", etc.
      const matchesProduct = tariffSlug && hasProductTarget && promo.target_product_slugs.some(slug => {
        // Exact match or prefix match for "einfach" tariffs
        if (tariffSlug === slug) return true;
        // Check if both start with "einfach-"
        if (tariffSlug.startsWith('einfach-') && slug.startsWith('einfach-')) return true;
        return false;
      });

      const matchesBuilding = buildingId && hasBuildingTarget && promo.building_ids.includes(buildingId);

      // Apply based on scope type:
      // - Product + Building: both must match
      // - Only Product: product must match
      // - Only Building: building must match
      // - Global (neither): always applies
      if (hasProductTarget && hasBuildingTarget) {
        return matchesProduct && matchesBuilding;
      } else if (hasProductTarget) {
        return matchesProduct;
      } else if (hasBuildingTarget) {
        return !!matchesBuilding;
      }
      
      return promo.is_global;
    });
  };

  // Get total router discount from all applicable promotions
  const getRouterDiscountForTariff = (
    tariffSlug: string | null,
    buildingId: string | null
  ): number => {
    const applicable = getApplicablePromotions(tariffSlug, buildingId);
    let totalDiscount = 0;

    for (const promo of applicable) {
      for (const discount of promo.discounts) {
        // Apply discounts targeting options (routers are options)
        if (discount.applies_to === 'option') {
          if (discount.discount_type === 'fixed' && discount.discount_amount) {
            totalDiscount += discount.discount_amount;
          }
        }
      }
    }

    console.log(`Router discount for tariff ${tariffSlug}:`, totalDiscount, 'from promotions:', applicable.map(p => p.name));
    return totalDiscount;
  };

  // Check if setup fee is waived by any applicable promotion
  const isSetupFeeWaived = (
    tariffSlug: string | null,
    buildingId: string | null
  ): boolean => {
    const applicable = getApplicablePromotions(tariffSlug, buildingId);
    
    for (const promo of applicable) {
      for (const discount of promo.discounts) {
        if (discount.applies_to === 'setup_fee' && discount.discount_type === 'waive') {
          return true;
        }
      }
    }
    
    return false;
  };

  return (
    <PromotionsContext.Provider value={{
      promotions,
      loading,
      getRouterDiscountForTariff,
      isSetupFeeWaived,
      refetch: fetchActivePromotions,
    }}>
      {children}
    </PromotionsContext.Provider>
  );
};

export const usePromotionsContext = () => {
  const context = useContext(PromotionsContext);
  if (context === undefined) {
    throw new Error('usePromotionsContext must be used within a PromotionsProvider');
  }
  return context;
};
