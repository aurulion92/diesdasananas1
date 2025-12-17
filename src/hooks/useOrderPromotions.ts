import { useOrder } from '@/context/OrderContext';
import { usePromotionsContext } from '@/context/PromotionsContext';

/**
 * Hook that combines order context with promotions context
 * to calculate dynamic discounts based on active database promotions
 * Supports separate monthly and one-time discounts
 */
export function useOrderPromotions() {
  const { 
    selectedTariff, 
    selectedRouter, 
    address,
    appliedPromoCode 
  } = useOrder();
  
  const { 
    getOptionDiscountForTariff, 
    isSetupFeeWaived: isSetupFeeWaivedByPromotion,
    promotions,
    loading 
  } = usePromotionsContext();

  // Get building ID from address if available
  const buildingId = (address as any)?.buildingId || null;

  // Get router option UUID directly from the selected router
  // The databaseId is set when the router is created from database options
  const routerOptionId = selectedRouter?.databaseId || null;

  // Get MONTHLY router discount from database promotions (e.g., FTTH-Aktion)
  const monthlyDiscountResult = selectedTariff 
    ? getOptionDiscountForTariff(selectedTariff.id, buildingId, routerOptionId, 'monthly')
    : { amount: 0, durationMonths: null };
  
  const promotionRouterMonthlyDiscount = monthlyDiscountResult.amount;
  const routerDiscountDurationMonths = monthlyDiscountResult.durationMonths;

  // Get ONE-TIME router discount from database promotions
  const oneTimeDiscountResult = selectedTariff 
    ? getOptionDiscountForTariff(selectedTariff.id, buildingId, routerOptionId, 'one_time')
    : { amount: 0, durationMonths: null };
  
  const promotionRouterOneTimeDiscount = oneTimeDiscountResult.amount;

  // Get router discount from manual promo code (legacy - treated as monthly)
  const promoCodeRouterDiscount = appliedPromoCode?.routerDiscount || 0;

  // Total monthly router discount (don't double-apply with promo code)
  const totalRouterMonthlyDiscount = Math.max(promotionRouterMonthlyDiscount, promoCodeRouterDiscount);
  
  // Total one-time router discount
  const totalRouterOneTimeDiscount = promotionRouterOneTimeDiscount;

  // Legacy alias for backward compatibility
  const totalRouterDiscount = totalRouterMonthlyDiscount;

  // Calculate effective discount (cannot exceed base price)
  const getEffectiveRouterMonthlyDiscount = (): number => {
    if (!selectedRouter || selectedRouter.id === 'router-none') return 0;
    // Discount cannot exceed the base price (no negative prices)
    return Math.min(totalRouterMonthlyDiscount, selectedRouter.monthlyPrice);
  };

  const getEffectiveRouterOneTimeDiscount = (): number => {
    if (!selectedRouter || selectedRouter.id === 'router-none') return 0;
    // Discount cannot exceed the base price (no negative prices)
    return Math.min(totalRouterOneTimeDiscount, selectedRouter.oneTimePrice);
  };

  // Calculate actual router monthly price with promotion discount
  const getPromotedRouterPrice = (): number => {
    if (!selectedRouter || selectedRouter.id === 'router-none') return 0;
    
    const basePrice = selectedRouter.monthlyPrice;
    const effectiveDiscount = getEffectiveRouterMonthlyDiscount();
    
    return Math.max(0, basePrice - effectiveDiscount);
  };

  // Calculate actual router one-time price with promotion discount
  const getPromotedRouterOneTimePrice = (): number => {
    if (!selectedRouter || selectedRouter.id === 'router-none') return 0;
    
    const basePrice = selectedRouter.oneTimePrice;
    const effectiveDiscount = getEffectiveRouterOneTimeDiscount();
    
    return Math.max(0, basePrice - effectiveDiscount);
  };

  // Check if there's an active monthly discount on router
  const hasRouterDiscount = (): boolean => {
    return totalRouterMonthlyDiscount > 0 && selectedRouter?.id !== 'router-none';
  };

  // Check if there's an active one-time discount on router
  const hasRouterOneTimeDiscount = (): boolean => {
    return totalRouterOneTimeDiscount > 0 && selectedRouter?.id !== 'router-none';
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
    // Monthly discounts
    promotionRouterMonthlyDiscount,
    totalRouterMonthlyDiscount,
    totalRouterDiscount, // Legacy alias
    getPromotedRouterPrice,
    hasRouterDiscount,
    getEffectiveRouterMonthlyDiscount,
    routerDiscountDurationMonths,
    
    // One-time discounts
    promotionRouterOneTimeDiscount,
    totalRouterOneTimeDiscount,
    getPromotedRouterOneTimePrice,
    hasRouterOneTimeDiscount,
    getEffectiveRouterOneTimeDiscount,
    
    // Other
    promoCodeRouterDiscount,
    isSetupFeeWaivedByPromotions,
    getApplicablePromotionNames,
    promotionsLoading: loading,
  };
}
