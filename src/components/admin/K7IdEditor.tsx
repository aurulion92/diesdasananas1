import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Edit2, Loader2 } from 'lucide-react';

interface K7IdEditorProps {
  id: string;
  table: 'products' | 'product_option_mappings';
  field: 'product_id_k7' | 'option_id_k7';
  currentValue: string | null;
  onUpdate?: () => void;
}

export const K7IdEditor = ({ id, table, field, currentValue, onUpdate }: K7IdEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentValue || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from(table)
        .update({ [field]: value || null })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Gespeichert', description: 'K7-ID wurde aktualisiert.' });
      setIsEditing(false);
      onUpdate?.();
    } catch (error: any) {
      console.error('Error saving K7 ID:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'K7-ID konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(currentValue || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 w-32 text-xs"
          placeholder="K7-ID"
          autoFocus
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Check className="w-3 h-3 text-green-600" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCancel}
          disabled={saving}
        >
          <X className="w-3 h-3 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 group">
      <span className="text-sm">{currentValue || '-'}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setIsEditing(true)}
      >
        <Edit2 className="w-3 h-3" />
      </Button>
    </div>
  );
};
