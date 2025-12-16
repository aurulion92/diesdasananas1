import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default rate limit configurations (fallback if DB settings not found)
const DEFAULT_RATE_LIMITS: Record<string, { maxAttempts: number; windowMinutes: number; blockMinutes: number }> = {
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

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load rate limit settings from database
    let config = DEFAULT_RATE_LIMITS[action_type] || { maxAttempts: 5, windowMinutes: 15, blockMinutes: 30 };
    
    try {
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'rate_limit_settings')
        .maybeSingle();
      
      if (settingsData?.value) {
        const dbSettings = settingsData.value as Record<string, any>;
        
        // Check if rate limiting is globally enabled
        if (dbSettings.enabled === false) {
          console.log('Rate limiting is disabled globally');
          return new Response(
            JSON.stringify({ allowed: true, reason: 'rate_limiting_disabled' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check if IP is whitelisted
        const whitelist: string[] = dbSettings.ip_whitelist || [];
        if (whitelist.length > 0 && whitelist.includes(ip)) {
          console.log(`IP ${ip} is whitelisted, bypassing rate limit`);
          return new Response(
            JSON.stringify({ allowed: true, reason: 'ip_whitelisted' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Map action_type to settings prefix (matching SettingsManager format)
        // SettingsManager saves: order_max_attempts, contact_max_attempts, login_max_attempts, existing_customer_max_attempts
        const prefixMap: Record<string, string> = {
          'order_form': 'order',
          'contact_form': 'contact',
          'login': 'login',
          'existing_customer': 'existing_customer',
        };
        
        const prefix = prefixMap[action_type];
        if (prefix) {
          config = {
            maxAttempts: dbSettings[`${prefix}_max_attempts`] ?? config.maxAttempts,
            windowMinutes: dbSettings[`${prefix}_window_minutes`] ?? config.windowMinutes,
            blockMinutes: dbSettings[`${prefix}_block_minutes`] ?? config.blockMinutes,
          };
          console.log(`Using DB config for ${action_type}:`, config);
        }
      }
    } catch (settingsError) {
      console.warn('Could not load rate limit settings from DB, using defaults:', settingsError);
    }

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
