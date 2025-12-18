import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { clearFavicon, restoreFavicon } from '@/hooks/useFavicon';

interface PasswordGateProps {
  children: React.ReactNode;
}

const STORAGE_KEY = 'site_access_granted';

export const PasswordGate = ({ children }: PasswordGateProps) => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [correctPassword, setCorrectPassword] = useState('');

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
            } else {
              // Clear favicon when password protection is active and not authenticated
              clearFavicon();
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

  // Clear or restore favicon based on authentication state
  useEffect(() => {
    if (!isLoading) {
      if (isEnabled && !isAuthenticated) {
        clearFavicon();
      } else {
        restoreFavicon();
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
    } else {
      setError('Falsches Passwort');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If password protection is disabled, show children directly
  if (!isEnabled || isAuthenticated) {
    return <>{children}</>;
  }

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
