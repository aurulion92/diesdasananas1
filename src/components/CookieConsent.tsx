import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie-consent';

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'all');
    setShowBanner(false);
  };

  const handleAcceptNecessary = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'necessary');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-card border-t border-border shadow-lg">
      <div className="container mx-auto max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Cookie className="h-6 w-6 text-primary flex-shrink-0 hidden sm:block" />
          <div className="flex-1">
            <p className="text-sm text-foreground">
              Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung auf unserer Website zu bieten. 
              Weitere Informationen finden Sie in unserer{' '}
              <a 
                href="https://comin-glasfaser.de/datenschutz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                Datenschutzerklärung
              </a>.
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAcceptNecessary}
              className="flex-1 sm:flex-none"
            >
              Nur notwendige
            </Button>
            <Button 
              size="sm" 
              onClick={handleAcceptAll}
              className="flex-1 sm:flex-none"
            >
              Alle akzeptieren
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
