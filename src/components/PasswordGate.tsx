import { useState, useEffect, lazy, Suspense, ComponentType, ReactNode, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { clearFavicon, restoreFavicon, clearTitle, restoreTitle } from '@/hooks/useFavicon';

interface PasswordGateProps {
  children?: ReactNode;
  lazyComponent?: () => Promise<{ default: ComponentType<any> }>;
  componentProps?: Record<string, any>;
}

const STORAGE_KEY = 'site_access_session';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

interface StoredSession {
  passwordHash: string;
  grantedAt: number;
}

// Simple hash function for password comparison (not cryptographic, just for session validation)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
};

export const PasswordGate = ({ children, lazyComponent, componentProps = {} }: PasswordGateProps) => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [correctPassword, setCorrectPassword] = useState('');

  const LazyContent = useMemo(() => {
    if (lazyComponent) {
      return lazy(lazyComponent);
    }
    return null;
  }, [lazyComponent]);

  const validateSession = (storedSession: StoredSession | null, currentPassword: string): boolean => {
    if (!storedSession) return false;
    
    const now = Date.now();
    const sessionAge = now - storedSession.grantedAt;
    
    // Check if session has expired (12 hours)
    if (sessionAge > SESSION_DURATION_MS) {
      console.log('Session expired');
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    
    // Check if password has changed since session was granted
    const currentHash = simpleHash(currentPassword);
    if (storedSession.passwordHash !== currentHash) {
      console.log('Password changed, session invalidated');
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    
    return true;
  };

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
          
          if (settings.enabled && settings.password) {
            // Check for existing valid session
            const storedSessionStr = localStorage.getItem(STORAGE_KEY);
            if (storedSessionStr) {
              try {
                const storedSession: StoredSession = JSON.parse(storedSessionStr);
                if (validateSession(storedSession, settings.password)) {
                  setIsAuthenticated(true);
                  restoreFavicon();
                  restoreTitle();
                } else {
                  clearFavicon();
                  clearTitle();
                }
              } catch {
                // Invalid JSON, clear it
                localStorage.removeItem(STORAGE_KEY);
                clearFavicon();
                clearTitle();
              }
            } else {
              clearFavicon();
              clearTitle();
            }
          }
        }
      } catch (err) {
        setIsEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

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
      // Store session with password hash and timestamp
      const session: StoredSession = {
        passwordHash: simpleHash(correctPassword),
        grantedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
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

  // If password protection is disabled or user is authenticated, show content
  if (!isEnabled || isAuthenticated) {
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
