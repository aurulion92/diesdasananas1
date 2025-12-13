import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProductOption {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  monthly_price: number | null;
  one_time_price: number | null;
  is_ftth: boolean;
  is_fttb: boolean;
  parent_option_slug: string[] | null;
  auto_include_option_slug: string[] | null;
  exclusive_group: string | null;
  requires_kabel_tv: boolean;
  display_order: number;
  info_text: string | null;
  image_url: string | null;
  external_link_url: string | null;
  external_link_label: string | null;
}

export interface ProductOptionMapping {
  option_id: string;
  option_id_k7: string | null;
  is_included: boolean;
  discount_amount: number | null;
  option: ProductOption;
}

/**
 * Hook to fetch product options assigned to a specific product
 * Returns only the options that are mapped to the product via product_option_mappings
 */
/**
 * Hook to fetch product options assigned to a specific product
 * @param productId - The UUID of the product (not the slug!)
 */
export function useProductOptions(productId: string | null) {
  const [options, setOptions] = useState<ProductOptionMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasOptionsAssigned, setHasOptionsAssigned] = useState(false);

  useEffect(() => {
    if (!productId) {
      setOptions([]);
      setHasOptionsAssigned(false);
      return;
    }

    const fetchOptions = async () => {
      setLoading(true);
      try {
        // productId is now the UUID directly, no need to look it up
        const productUuid = productId;

        // Fetch options mapped to this product
        const { data, error } = await supabase
          .from('product_option_mappings')
          .select(`
            option_id,
            option_id_k7,
            is_included,
            discount_amount,
            product_options (
              id,
              name,
              slug,
              category,
              description,
              monthly_price,
              one_time_price,
              is_ftth,
              is_fttb,
              parent_option_slug,
              auto_include_option_slug,
              exclusive_group,
              requires_kabel_tv,
              display_order,
              info_text,
              image_url,
              external_link_url,
              external_link_label
            )
          `)
          .eq('product_id', productUuid);

        if (error) {
          console.error('Error fetching product options:', error);
          setOptions([]);
          setHasOptionsAssigned(false);
          return;
        }

        const mappings: ProductOptionMapping[] = (data || [])
          .filter(d => d.product_options)
          .map(d => ({
            option_id: d.option_id,
            option_id_k7: d.option_id_k7,
            is_included: d.is_included || false,
            discount_amount: d.discount_amount,
            option: {
              id: (d.product_options as any).id,
              name: (d.product_options as any).name,
              slug: (d.product_options as any).slug,
              category: (d.product_options as any).category,
              description: (d.product_options as any).description,
              monthly_price: (d.product_options as any).monthly_price,
              one_time_price: (d.product_options as any).one_time_price,
              is_ftth: (d.product_options as any).is_ftth,
              is_fttb: (d.product_options as any).is_fttb,
              parent_option_slug: (d.product_options as any).parent_option_slug,
              auto_include_option_slug: (d.product_options as any).auto_include_option_slug,
              exclusive_group: (d.product_options as any).exclusive_group,
              requires_kabel_tv: (d.product_options as any).requires_kabel_tv,
              display_order: (d.product_options as any).display_order || 0,
              info_text: (d.product_options as any).info_text,
              image_url: (d.product_options as any).image_url,
              external_link_url: (d.product_options as any).external_link_url,
              external_link_label: (d.product_options as any).external_link_label,
            }
          }))
          .sort((a, b) => a.option.display_order - b.option.display_order);

        setOptions(mappings);
        setHasOptionsAssigned(mappings.length > 0);
      } catch (err) {
        console.error('Error in useProductOptions:', err);
        setOptions([]);
        setHasOptionsAssigned(false);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [productId]);

  // Helper functions to get options by category
  const getOptionsByCategory = (category: string) => 
    options.filter(o => o.option.category === category);

  const hasCategory = (category: string) => 
    options.some(o => o.option.category === category);

  return {
    options,
    loading,
    hasOptionsAssigned,
    getOptionsByCategory,
    hasCategory,
    // Convenience getters
    routerOptions: getOptionsByCategory('router'),
    phoneOptions: getOptionsByCategory('phone'),
    tvCominOptions: getOptionsByCategory('tv_comin'),
    tvWaipuOptions: getOptionsByCategory('tv_waipu'),
    tvHardwareOptions: getOptionsByCategory('tv_hardware'),
    serviceOptions: getOptionsByCategory('service'),
  };
}
