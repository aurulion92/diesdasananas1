import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ActionType = 'login' | 'order_form' | 'contact_form' | 'existing_customer';

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  remaining_seconds?: number;
  blocked_until?: string;
}

export function useRateLimit() {
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState<number | null>(null);

  const checkRateLimit = useCallback(async (actionType: ActionType): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('rate-limit', {
        body: { action_type: actionType },
      });

      if (error) {
        console.error('Rate limit check error:', error);
        // Fail open - allow on error
        return true;
      }

      const result = data as RateLimitResult;

      if (!result.allowed) {
        setIsBlocked(true);
        
        if (result.remaining_seconds) {
          setBlockTimeRemaining(result.remaining_seconds);
          
          const minutes = Math.ceil(result.remaining_seconds / 60);
          toast.error(
            `Zu viele Versuche. Bitte warten Sie ${minutes} Minute${minutes > 1 ? 'n' : ''}.`,
            { duration: 5000 }
          );
        }
        
        return false;
      }

      // Show warning when getting close to limit
      if (result.remaining !== undefined && result.remaining <= 2 && result.remaining > 0) {
        toast.warning(`Noch ${result.remaining} Versuch${result.remaining > 1 ? 'e' : ''} übrig.`);
      }

      setIsBlocked(false);
      setBlockTimeRemaining(null);
      return true;

    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow on error
      return true;
    }
  }, []);

  const formatBlockTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  }, []);

  return {
    checkRateLimit,
    isBlocked,
    blockTimeRemaining,
    formatBlockTime,
  };
}
