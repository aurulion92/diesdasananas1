import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit configurations per action type
const RATE_LIMITS: Record<string, { maxAttempts: number; windowMinutes: number; blockMinutes: number }> = {
  'login': { maxAttempts: 5, windowMinutes: 15, blockMinutes: 30 },
  'order_form': { maxAttempts: 3, windowMinutes: 60, blockMinutes: 60 },
  'contact_form': { maxAttempts: 5, windowMinutes: 30, blockMinutes: 30 },
  'existing_customer': { maxAttempts: 5, windowMinutes: 15, blockMinutes: 30 },
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action_type } = await req.json();

    if (!action_type) {
      console.error('Missing action_type in request');
      return new Response(
        JSON.stringify({ error: 'action_type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP from headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
    
    console.log(`Rate limit check for IP: ${ip}, action: ${action_type}`);

    // Get rate limit config for this action
    const config = RATE_LIMITS[action_type] || { maxAttempts: 5, windowMinutes: 15, blockMinutes: 30 };

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the rate limit check function
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_ip_address: ip,
      p_action_type: action_type,
      p_max_attempts: config.maxAttempts,
      p_window_minutes: config.windowMinutes,
      p_block_minutes: config.blockMinutes,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request (fail open for better UX)
      return new Response(
        JSON.stringify({ allowed: true, error: 'Rate limit check failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Rate limit result for ${ip}:`, data);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in rate-limit function:', error);
    // Fail open - allow request on error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ allowed: true, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
