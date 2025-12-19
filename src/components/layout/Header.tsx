import { useState } from 'react';
import { useBranding } from '@/hooks/useBranding';
import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderProps {
  onLogoClick?: () => void;
}

export function Header({ onLogoClick }: HeaderProps) {
  const { branding, loading } = useBranding();
  const [imageError, setImageError] = useState(false);
  
  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    }
  };

  // Split company name for styled display (first part normal, last part in accent box)
  const nameParts = branding.company_name.split('-');
  const firstPart = nameParts.length > 1 ? nameParts.slice(0, -1).join('-') : branding.company_name;
  const lastPart = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  // Only show text fallback if no logo_url is set (empty string)
  const showTextLogo = !branding.logo_url || branding.logo_url.trim() === '';

  return (
    <header className="bg-primary sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <button 
          onClick={handleLogoClick}
          className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          title="Zurück zur Startseite"
        >
          {loading ? (
            <div className="h-8 w-32 bg-primary-foreground/20 rounded animate-pulse" />
          ) : showTextLogo ? (
            <div className="flex items-center cursor-pointer">
              <span className="text-primary-foreground font-bold text-2xl tracking-tight">{firstPart}</span>
              {lastPart && (
                <span className="bg-accent text-accent-foreground font-bold text-2xl px-1.5 py-0.5 rounded">{lastPart}</span>
              )}
            </div>
          ) : (
            <img 
              src={branding.logo_url} 
              alt={branding.company_name} 
              className={`h-10 max-w-[200px] object-contain ${imageError ? 'opacity-50' : ''}`}
              onError={() => setImageError(true)}
            />
          )}
        </button>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="hidden md:flex items-center gap-6">
              <div className="h-4 w-32 bg-primary-foreground/20 rounded animate-pulse" />
              <div className="h-4 w-24 bg-primary-foreground/20 rounded animate-pulse" />
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-6 text-sm text-primary-foreground/90">
              <a href={`tel:${branding.hotline_number.replace(/\s/g, '')}`} className="hover:text-primary-foreground transition-colors">
                Hotline: {branding.hotline_number}
              </a>
              <span>{branding.hotline_hours}</span>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
