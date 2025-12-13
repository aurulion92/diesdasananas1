import { useOrder } from '@/context/OrderContext';
import { usePromotionsContext } from '@/context/PromotionsContext';

// Map frontend router IDs to database option slugs
const ROUTER_ID_TO_SLUG: Record<string, string> = {
  'router-fritzbox-5690-pro': 'fritzbox-5690-pro',
  'router-fritzbox-5690': 'fritzbox-5690',
  'router-fritzbox-7690': 'fritzbox-7690',
};

/**
 * Hook that combines order context with promotions context
 * to calculate dynamic discounts based on active database promotions
 */
export function useOrderPromotions() {
  const { 
    selectedTariff, 
    selectedRouter, 
    address,
    appliedPromoCode 
  } = useOrder();
  
  const { 
    getRouterDiscountForTariff, 
    isSetupFeeWaived: isSetupFeeWaivedByPromotion,
    promotions,
    loading 
  } = usePromotionsContext();

  // Get building ID from address if available
  const buildingId = (address as any)?.buildingId || null;

  // Convert frontend router ID to database option ID by looking up in promotions
  const getRouterOptionId = (): string | null => {
    if (!selectedRouter || selectedRouter.id === 'router-none') return null;
    
    const slug = ROUTER_ID_TO_SLUG[selectedRouter.id];
    if (!slug) return null;

    // Find the option ID from promotions discounts
    for (const promo of promotions) {
      for (const discount of promo.discounts) {
        if (discount.target_option_id) {
          // We need to match by looking at what's in the database
          // The target_option_id is the database ID we need
          // We match based on the known router slugs from the database
          if (slug === 'fritzbox-5690-pro' && discount.target_option_id === '38da25aa-f523-4129-9000-40c175d46f7c') {
            return discount.target_option_id;
          }
          if (slug === 'fritzbox-5690' && discount.target_option_id === '621b25df-8a9d-4e7c-85ef-608dc9c091d5') {
            return discount.target_option_id;
          }
          if (slug === 'fritzbox-7690' && discount.target_option_id === '4c5e0fc0-1586-4aba-b91b-25530996ba01') {
            return discount.target_option_id;
          }
        }
      }
    }
    
    return null;
  };

  const routerOptionId = getRouterOptionId();

  // Get router discount from database promotions (e.g., FTTH-Aktion)
  const promotionRouterDiscount = selectedTariff 
    ? getRouterDiscountForTariff(selectedTariff.id, buildingId, routerOptionId)
    : 0;

  // Get router discount from manual promo code
  const promoCodeRouterDiscount = appliedPromoCode?.routerDiscount || 0;

  // Total router discount (don't double-apply)
  const totalRouterDiscount = Math.max(promotionRouterDiscount, promoCodeRouterDiscount);

  // Calculate actual router price with promotion discount
  const getPromotedRouterPrice = (): number => {
    if (!selectedRouter || selectedRouter.id === 'router-none') return 0;
    
    const basePrice = selectedRouter.monthlyPrice;
    const discountedPrice = Math.max(0, basePrice - totalRouterDiscount);
    
    return discountedPrice;
  };

  // Check if there's an active discount on router
  const hasRouterDiscount = (): boolean => {
    return totalRouterDiscount > 0 && selectedRouter?.id !== 'router-none';
  };

  // Check if setup fee is waived by any promotion
  const isSetupFeeWaivedByPromotions = (): boolean => {
    // First check database promotions
    if (selectedTariff && isSetupFeeWaivedByPromotion(selectedTariff.id, buildingId)) {
      return true;
    }
    // Then check manual promo code
    return appliedPromoCode?.setupFeeWaived === true;
  };

  // Get the names of applicable promotions (for display)
  const getApplicablePromotionNames = (): string[] => {
    if (!selectedTariff) return [];
    
    return promotions
      .filter(promo => {
        // Check if this promotion applies based on product targeting
        if (promo.target_product_slugs.length > 0) {
          const tariffId = selectedTariff.id;
          return promo.target_product_slugs.some(slug => {
            if (tariffId === slug) return true;
            if (tariffId.startsWith('einfach-') && slug.startsWith('einfach-')) return true;
            return false;
          });
        }
        return promo.is_global;
      })
      .map(p => p.name);
  };

  return {
    promotionRouterDiscount,
    promoCodeRouterDiscount,
    totalRouterDiscount,
    getPromotedRouterPrice,
    hasRouterDiscount,
    isSetupFeeWaivedByPromotions,
    getApplicablePromotionNames,
    promotionsLoading: loading,
  };
}
