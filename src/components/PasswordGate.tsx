import { useState, useEffect, lazy, Suspense, ComponentType, ReactNode, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { clearFavicon, restoreFavicon, clearTitle, restoreTitle } from '@/hooks/useFavicon';

interface PasswordGateProps {
  // Option 1: regular children (loads immediately - less secure)
  children?: ReactNode;
  // Option 2: lazy load a component (code only loads after auth - more secure)
  lazyComponent?: () => Promise<{ default: ComponentType<any> }>;
  componentProps?: Record<string, any>;
}

const STORAGE_KEY = 'site_access_granted';

export const PasswordGate = ({ children, lazyComponent, componentProps = {} }: PasswordGateProps) => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [correctPassword, setCorrectPassword] = useState('');

  // Lazy component - only created when needed
  const LazyContent = useMemo(() => {
    if (lazyComponent) {
      return lazy(lazyComponent);
    }
    return null;
  }, [lazyComponent]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'site_password_settings')
          .single();

        if (data?.value) {
          const settings = data.value as { enabled: boolean; password: string };
          setIsEnabled(settings.enabled || false);
          setCorrectPassword(settings.password || '');
          
          // Check if already authenticated
          if (settings.enabled) {
            const storedAuth = localStorage.getItem(STORAGE_KEY);
            if (storedAuth === 'true') {
              setIsAuthenticated(true);
              restoreFavicon();
              restoreTitle();
            } else {
              // Clear favicon and title when password protection is active and not authenticated
              clearFavicon();
              clearTitle();
            }
          }
        }
      } catch (err) {
        // If no settings exist, password protection is disabled
        setIsEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Clear or restore favicon and title based on authentication state
  useEffect(() => {
    if (!isLoading) {
      if (isEnabled && !isAuthenticated) {
        clearFavicon();
        clearTitle();
      } else {
        restoreFavicon();
        restoreTitle();
      }
    }
  }, [isEnabled, isAuthenticated, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password === correctPassword) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsAuthenticated(true);
      restoreFavicon();
      restoreTitle();
    } else {
      setError('Falsches Passwort');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If password protection is disabled or user is authenticated
  if (!isEnabled || isAuthenticated) {
    // If using lazy component, render it with Suspense
    if (LazyContent) {
      return (
        <Suspense fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }>
          <LazyContent {...componentProps} />
        </Suspense>
      );
    }
    // Otherwise render children directly
    return <>{children}</>;
  }

  // Show password form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Zugangsschutz</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Diese Seite ist passwortgeschützt.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Passwort eingeben"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={error ? 'border-destructive' : ''}
              />
              {error && (
                <p className="text-sm text-destructive mt-1">{error}</p>
              )}
            </div>
            <Button type="submit" className="w-full">
              Zugang freischalten
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
