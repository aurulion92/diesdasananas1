import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageGalleryDialogProps {
  images: string[];
  alt: string;
  triggerClassName?: string;
}

export const ImageGalleryDialog = ({ images, alt, triggerClassName }: ImageGalleryDialogProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  if (!images || images.length === 0) return null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setCurrentIndex(0); }}>
      <DialogTrigger asChild>
        <img 
          src={images[0]} 
          alt={alt} 
          className={cn(
            "w-24 h-24 object-contain rounded-lg bg-muted/50 p-2 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-accent transition-all",
            triggerClassName
          )}
          title="Klicken zum Vergrößern"
        />
      </DialogTrigger>
      <DialogContent 
        className="max-w-2xl p-4" 
        onKeyDown={handleKeyDown}
      >
        <div className="relative flex flex-col items-center">
          {/* Main Image */}
          <div className="relative w-full flex items-center justify-center min-h-[300px]">
            {images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 z-10 h-12 w-12 rounded-full bg-background/80 hover:bg-background shadow-lg"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}
            
            <img 
              src={images[currentIndex]} 
              alt={`${alt} - Bild ${currentIndex + 1}`} 
              className="max-w-full max-h-[400px] object-contain"
            />
            
            {images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 z-10 h-12 w-12 rounded-full bg-background/80 hover:bg-background shadow-lg"
                onClick={goToNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>

          {/* Image Counter & Dots */}
          {images.length > 1 && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {currentIndex + 1} / {images.length}
              </p>
              <div className="flex gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      index === currentIndex 
                        ? "bg-accent w-4" 
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                    onClick={() => setCurrentIndex(index)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Thumbnails for many images */}
          {images.length > 2 && (
            <div className="mt-3 flex gap-2 overflow-x-auto max-w-full py-2">
              {images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`Miniatur ${index + 1}`}
                  className={cn(
                    "w-12 h-12 object-contain rounded border cursor-pointer transition-all flex-shrink-0",
                    index === currentIndex 
                      ? "border-accent ring-2 ring-accent" 
                      : "border-border hover:border-accent/50"
                  )}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground mt-3">{alt}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
