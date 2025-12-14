import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2, Image as ImageIcon, Plus, GripVertical } from 'lucide-react';

interface MultiImageUploadProps {
  values: string[];
  onChange: (urls: string[]) => void;
  bucket?: string;
  folder?: string;
  maxImages?: number;
}

export const MultiImageUpload = ({ 
  values = [], 
  onChange, 
  bucket = 'admin-uploads',
  folder = 'options',
  maxImages = 10
}: MultiImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - values.length;
    if (remainingSlots <= 0) {
      toast({
        title: 'Limit erreicht',
        description: `Maximal ${maxImages} Bilder erlaubt.`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      const filesToUpload = Array.from(files).slice(0, remainingSlots);

      for (const file of filesToUpload) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Fehler',
            description: `${file.name} ist keine Bilddatei.`,
            variant: 'destructive',
          });
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'Fehler',
            description: `${file.name} ist zu groß (max. 5MB).`,
            variant: 'destructive',
          });
          continue;
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        newUrls.push(urlData.publicUrl);
      }

      if (newUrls.length > 0) {
        onChange([...values, ...newUrls]);
        toast({
          title: 'Erfolg',
          description: `${newUrls.length} Bild(er) hochgeladen.`,
        });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload fehlgeschlagen',
        description: error.message || 'Bilder konnten nicht hochgeladen werden.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index: number) => {
    const newValues = values.filter((_, i) => i !== index);
    onChange(newValues);
  };

  const handleAddUrl = () => {
    if (urlInputValue.trim() && values.length < maxImages) {
      onChange([...values, urlInputValue.trim()]);
      setUrlInputValue('');
      setShowUrlInput(false);
    }
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= values.length) return;
    const newValues = [...values];
    const [removed] = newValues.splice(fromIndex, 1);
    newValues.splice(toIndex, 0, removed);
    onChange(newValues);
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
      
      {/* Image Grid */}
      {values.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {values.map((url, index) => (
            <div key={index} className="relative group border rounded-lg overflow-hidden bg-muted/50">
              <img 
                src={url} 
                alt={`Bild ${index + 1}`} 
                className="w-full h-20 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {index > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white hover:text-white hover:bg-white/20"
                    onClick={() => moveImage(index, index - 1)}
                    title="Nach vorne"
                  >
                    ←
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white hover:text-destructive hover:bg-white/20"
                  onClick={() => handleRemove(index)}
                  title="Entfernen"
                >
                  <X className="h-3 w-3" />
                </Button>
                {index < values.length - 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white hover:text-white hover:bg-white/20"
                    onClick={() => moveImage(index, index + 1)}
                    title="Nach hinten"
                  >
                    →
                  </Button>
                )}
              </div>
              {index === 0 && (
                <span className="absolute top-1 left-1 bg-accent text-accent-foreground text-xs px-1.5 py-0.5 rounded">
                  Hauptbild
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add more images */}
      {values.length < maxImages && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {values.length === 0 ? 'Bilder hochladen' : 'Weitere Bilder'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowUrlInput(!showUrlInput)}
              title="URL eingeben"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </div>
          
          {showUrlInput && (
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())}
              />
              <Button type="button" onClick={handleAddUrl} disabled={!urlInputValue.trim()}>
                Hinzufügen
              </Button>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            {values.length} von {maxImages} Bildern • Das erste Bild wird als Vorschau angezeigt
          </p>
        </div>
      )}
    </div>
  );
};
