import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PromotionDiscount {
  id: string;
  applies_to: string;
  discount_type: string;
  discount_amount: number | null;
  target_product_id: string | null;
  target_option_id: string | null;
  k7_product_id: string | null;
  k7_template_id: string | null;
  k7_template_type: string | null;
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
  // Resolved product/option info
  target_product_slugs: string[];
  target_option_slugs: string[];
}

export function usePromotions() {
  const [promotions, setPromotions] = useState<ActivePromotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivePromotions();
  }, []);

  const fetchActivePromotions = async () => {
    try {
      // Fetch active promotions with their discounts
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

        // Resolve product and option slugs for targeting
        const targetProductSlugs: string[] = [];
        const targetOptionSlugs: string[] = [];

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
          if (discount.target_option_id) {
            const { data: optionData } = await supabase
              .from('product_options')
              .select('slug')
              .eq('id', discount.target_option_id)
              .maybeSingle();
            if (optionData?.slug) {
              targetOptionSlugs.push(optionData.slug);
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
          discounts: discountsData || [],
          building_ids: (buildingsData || []).map(b => b.building_id),
          target_product_slugs: targetProductSlugs,
          target_option_slugs: targetOptionSlugs,
        });
      }

      setPromotions(activePromotions);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if a promotion applies based on tariff selection
  const getApplicablePromotions = (
    tariffSlug: string | null,
    buildingId: string | null
  ): ActivePromotion[] => {
    return promotions.filter(promo => {
      // Global promotions with no specific targets apply to all
      if (promo.is_global && promo.target_product_slugs.length === 0 && promo.building_ids.length === 0) {
        return true;
      }

      // Check product-based targeting
      const hasProductTarget = promo.target_product_slugs.length > 0;
      const matchesProduct = tariffSlug && promo.target_product_slugs.some(slug => 
        tariffSlug.includes(slug) || slug.includes(tariffSlug.split('-')[0])
      );

      // Check building-based targeting  
      const hasBuildingTarget = promo.building_ids.length > 0;
      const matchesBuilding = buildingId && promo.building_ids.includes(buildingId);

      // Logic: 
      // - If only product target: must match product
      // - If only building target: must match building
      // - If both: must match both
      // - If neither (global): always applies
      if (hasProductTarget && hasBuildingTarget) {
        return matchesProduct && matchesBuilding;
      } else if (hasProductTarget) {
        return matchesProduct;
      } else if (hasBuildingTarget) {
        return matchesBuilding;
      }
      
      return promo.is_global;
    });
  };

  // Get router discount from applicable promotions
  const getRouterDiscountFromPromotions = (
    tariffSlug: string | null,
    buildingId: string | null
  ): number => {
    const applicable = getApplicablePromotions(tariffSlug, buildingId);
    let totalDiscount = 0;

    for (const promo of applicable) {
      for (const discount of promo.discounts) {
        // Check if discount applies to routers (option category)
        if (discount.applies_to === 'option') {
          // Apply router discounts from applicable promotions
          if (discount.discount_type === 'fixed' && discount.discount_amount) {
            totalDiscount += discount.discount_amount;
          }
        }
      }
    }

    return totalDiscount;
  };

  // Check if setup fee is waived by any applicable promotion
  const isSetupFeeWaivedByPromotion = (
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

  return {
    promotions,
    loading,
    getApplicablePromotions,
    getRouterDiscountFromPromotions,
    isSetupFeeWaivedByPromotion,
    refetch: fetchActivePromotions,
  };
}
