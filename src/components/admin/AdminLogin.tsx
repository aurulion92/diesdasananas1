import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { useRateLimit } from '@/hooks/useRateLimit';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin = ({ onLoginSuccess }: AdminLoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const { checkRateLimit, isBlocked } = useRateLimit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Check rate limit before attempting login
    const allowed = await checkRateLimit('login');
    if (!allowed) {
      setLoading(false);
      return;
    }
    try {
      if (isSignUp) {
        // Sign up flow
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/devconfig`
          }
        });

        if (authError) {
          setError(authError.message);
          return;
        }

        if (data.user) {
          setSuccess('Registrierung erfolgreich! Bitte warten Sie auf die Admin-Freischaltung und melden Sie sich dann an.');
          setIsSignUp(false);
        }
      } else {
        // Login flow
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          setError(authError.message);
          return;
        }

        if (data.user) {
          // Check if user has admin role
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', data.user.id)
            .eq('role', 'admin')
            .maybeSingle();

          if (roleError || !roleData) {
            await supabase.auth.signOut();
            setError('Kein Administratorzugang für diesen Benutzer. Bitte warten Sie auf die Freischaltung.');
            return;
          }

          onLoginSuccess();
        }
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Admin-Bereich
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Erstellen Sie ein neues Admin-Konto.' 
              : 'Melden Sie sich an, um auf die Konfiguration zuzugreifen.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="border-success bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">{success}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@comin.de"
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading || isBlocked}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isSignUp ? 'Registrieren...' : 'Anmelden...'}
                </>
              ) : isBlocked ? (
                <>
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  Gesperrt
                </>
              ) : (
                isSignUp ? 'Registrieren' : 'Anmelden'
              )}
            </Button>

            <div className="text-center pt-2">
              <Button
                type="button"
                variant="link"
                className="text-sm text-muted-foreground"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setSuccess(null);
                }}
              >
                {isSignUp 
                  ? 'Bereits registriert? Anmelden' 
                  : 'Noch kein Konto? Registrieren'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
