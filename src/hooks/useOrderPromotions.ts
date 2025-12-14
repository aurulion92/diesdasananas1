import { useOrder } from '@/context/OrderContext';
import { usePromotionsContext } from '@/context/PromotionsContext';

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

  // Get router option UUID directly from the selected router
  // The databaseId is set when the router is created from database options
  const routerOptionId = selectedRouter?.databaseId || null;

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
