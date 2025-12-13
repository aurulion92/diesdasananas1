import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, X, AlertTriangle, Check } from 'lucide-react';

interface ProductOptionAssignmentProps {
  productId: string;
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

interface ProductOption {
  id: string;
  name: string;
  slug: string;
  category: string;
  monthly_price: number | null;
  one_time_price: number | null;
}

interface OptionMapping {
  id: string;
  option_id: string;
  option_id_k7: string | null;
  is_included: boolean;
  discount_amount: number | null;
  option: ProductOption;
}

const CATEGORY_LABELS: Record<string, string> = {
  router: 'Router',
  phone: 'Telefon',
  tv_comin: 'COM-IN TV',
  tv_waipu: 'waipu.tv',
  tv_hardware: 'TV Hardware',
};

export function ProductOptionAssignment({
  productId,
  productName,
  open,
  onOpenChange,
  onUpdate,
}: ProductOptionAssignmentProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [assignedOptions, setAssignedOptions] = useState<OptionMapping[]>([]);
  const [allOptions, setAllOptions] = useState<ProductOption[]>([]);
  const [k7Inputs, setK7Inputs] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (open && productId) {
      fetchData();
    }
  }, [open, productId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all active options
      const { data: optionsData, error: optionsError } = await supabase
        .from('product_options')
        .select('id, name, slug, category, monthly_price, one_time_price')
        .eq('is_active', true)
        .order('category')
        .order('display_order');

      if (optionsError) throw optionsError;
      setAllOptions(optionsData || []);

      // Fetch current mappings for this product
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('product_option_mappings')
        .select(`
          id,
          option_id,
          option_id_k7,
          is_included,
          discount_amount,
          product_options (
            id,
            name,
            slug,
            category,
            monthly_price,
            one_time_price
          )
        `)
        .eq('product_id', productId);

      if (mappingsError) throw mappingsError;

      const mappings: OptionMapping[] = (mappingsData || [])
        .filter(m => m.product_options)
        .map(m => ({
          id: m.id,
          option_id: m.option_id,
          option_id_k7: m.option_id_k7,
          is_included: m.is_included || false,
          discount_amount: m.discount_amount,
          option: m.product_options as unknown as ProductOption,
        }));

      setAssignedOptions(mappings);

      // Initialize K7 inputs
      const k7Map: Record<string, string> = {};
      mappings.forEach(m => {
        k7Map[m.option_id] = m.option_id_k7 || '';
      });
      setK7Inputs(k7Map);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Fehler',
        description: 'Daten konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isOptionAssigned = (optionId: string) => {
    return assignedOptions.some(m => m.option_id === optionId);
  };

  const toggleOption = async (option: ProductOption) => {
    const isAssigned = isOptionAssigned(option.id);
    setSaving(option.id);

    try {
      if (isAssigned) {
        // Remove assignment
        const { error } = await supabase
          .from('product_option_mappings')
          .delete()
          .eq('product_id', productId)
          .eq('option_id', option.id);

        if (error) throw error;

        setAssignedOptions(prev => prev.filter(m => m.option_id !== option.id));
        setK7Inputs(prev => {
          const newInputs = { ...prev };
          delete newInputs[option.id];
          return newInputs;
        });

        toast({ title: 'Option entfernt', description: `${option.name} wurde entfernt.` });
      } else {
        // Add assignment
        const { data, error } = await supabase
          .from('product_option_mappings')
          .insert({
            product_id: productId,
            option_id: option.id,
            option_id_k7: null,
            is_included: false,
            discount_amount: 0,
          })
          .select()
          .single();

        if (error) throw error;

        setAssignedOptions(prev => [
          ...prev,
          {
            id: data.id,
            option_id: option.id,
            option_id_k7: null,
            is_included: false,
            discount_amount: null,
            option,
          },
        ]);
        setK7Inputs(prev => ({ ...prev, [option.id]: '' }));

        toast({ title: 'Option hinzugefügt', description: `${option.name} wurde hinzugefügt.` });
      }

      onUpdate?.();
    } catch (error: any) {
      console.error('Error toggling option:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Option konnte nicht geändert werden.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const updateK7Id = async (optionId: string) => {
    const newK7 = k7Inputs[optionId]?.trim() || null;
    const mapping = assignedOptions.find(m => m.option_id === optionId);
    if (!mapping) return;

    setSaving(optionId);

    try {
      const { error } = await supabase
        .from('product_option_mappings')
        .update({ option_id_k7: newK7 })
        .eq('id', mapping.id);

      if (error) throw error;

      setAssignedOptions(prev =>
        prev.map(m =>
          m.option_id === optionId ? { ...m, option_id_k7: newK7 } : m
        )
      );

      toast({ title: 'K7-ID gespeichert' });
      onUpdate?.();
    } catch (error: any) {
      console.error('Error updating K7 ID:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'K7-ID konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  // Group options by category
  const groupedOptions = allOptions.reduce((acc, option) => {
    const cat = option.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(option);
    return acc;
  }, {} as Record<string, ProductOption[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Optionen für "{productName}"</DialogTitle>
          <DialogDescription>
            Wählen Sie die verfügbaren Optionen und hinterlegen Sie die K7-IDs.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedOptions).map(([category, options]) => (
              <div key={category} className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {CATEGORY_LABELS[category] || category}
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Aktiv</TableHead>
                        <TableHead>Option</TableHead>
                        <TableHead>Preis</TableHead>
                        <TableHead>K7-ID für dieses Produkt</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {options.map(option => {
                        const isAssigned = isOptionAssigned(option.id);
                        const mapping = assignedOptions.find(m => m.option_id === option.id);
                        const hasK7 = mapping?.option_id_k7;

                        return (
                          <TableRow key={option.id} className={isAssigned ? 'bg-accent/5' : ''}>
                            <TableCell>
                              <Checkbox
                                checked={isAssigned}
                                onCheckedChange={() => toggleOption(option)}
                                disabled={saving === option.id}
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium">{option.name}</span>
                                <br />
                                <span className="text-xs text-muted-foreground">{option.slug}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {option.monthly_price ? (
                                <span>{option.monthly_price.toFixed(2)} €/Monat</span>
                              ) : option.one_time_price ? (
                                <span>{option.one_time_price.toFixed(2)} € einmalig</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isAssigned ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={k7Inputs[option.id] || ''}
                                    onChange={e =>
                                      setK7Inputs(prev => ({
                                        ...prev,
                                        [option.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="K7-ID eingeben"
                                    className="h-8 text-sm"
                                    disabled={saving === option.id}
                                  />
                                  {!hasK7 && (
                                    <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isAssigned && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateK7Id(option.id)}
                                  disabled={saving === option.id}
                                >
                                  {saving === option.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}

            {Object.keys(groupedOptions).length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Keine Optionen vorhanden. Erstellen Sie zuerst Optionen im Optionen-Manager.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
