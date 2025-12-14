import { useOrder } from '@/context/OrderContext';
import { usePromotionsContext } from '@/context/PromotionsContext';

// Map frontend router IDs (router-{slug}) to database option UUIDs
const ROUTER_SLUG_TO_UUID: Record<string, string> = {
  'fritzbox-5690-pro': '38da25aa-f523-4129-9000-40c175d46f7c',
  'fritzbox-5690': '621b25df-8a9d-4e7c-85ef-608dc9c091d5',
  'fritzbox-7690': '4c5e0fc0-1586-4aba-b91b-25530996ba01',
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

  // Convert frontend router ID to database option UUID
  const getRouterOptionId = (): string | null => {
    if (!selectedRouter || selectedRouter.id === 'router-none') return null;
    
    // Router ID format: "router-{slug}" -> extract slug
    const slug = selectedRouter.id.replace('router-', '');
    
    // Look up UUID from known mapping
    const uuid = ROUTER_SLUG_TO_UUID[slug];
    if (uuid) return uuid;
    
    // Fallback: try to find in promotions discounts
    for (const promo of promotions) {
      for (const discount of promo.discounts) {
        if (discount.target_option_id) {
          // If we can't find a mapping, return the first router option ID we find
          // This is a fallback for dynamically added routers
          return discount.target_option_id;
        }
      }
    }
    
    return null;
  };

  const routerOptionId = getRouterOptionId();

  // Get router discount from database promotions (e.g., FTTH-Aktion)
  // Uses tariff UUID for matching
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
    // First check database promotions (uses tariff UUID)
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
        // Check if this promotion applies based on product UUID targeting
        if (promo.target_product_ids.length > 0) {
          return promo.target_product_ids.includes(selectedTariff.id);
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
