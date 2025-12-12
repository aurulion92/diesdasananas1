-- Create rate limits table for bot protection
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'login', 'order_form', 'contact_form'
  attempts INTEGER NOT NULL DEFAULT 1,
  first_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  UNIQUE(ip_address, action_type)
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No public access - only edge functions with service role can access
-- (no policies needed = no access for anon users)

-- Index for fast lookups
CREATE INDEX idx_rate_limits_ip_action ON public.rate_limits(ip_address, action_type);
CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits(last_attempt_at);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_ip_address TEXT,
  p_action_type TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15,
  p_block_minutes INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record rate_limits%ROWTYPE;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_now TIMESTAMP WITH TIME ZONE := now();
BEGIN
  v_window_start := v_now - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Get existing record
  SELECT * INTO v_record 
  FROM rate_limits 
  WHERE ip_address = p_ip_address AND action_type = p_action_type;
  
  -- Check if currently blocked
  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > v_now THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'blocked',
      'blocked_until', v_record.blocked_until,
      'remaining_seconds', EXTRACT(EPOCH FROM (v_record.blocked_until - v_now))::INTEGER
    );
  END IF;
  
  -- If no record or window expired, reset counter
  IF v_record.id IS NULL THEN
    INSERT INTO rate_limits (ip_address, action_type, attempts, first_attempt_at, last_attempt_at)
    VALUES (p_ip_address, p_action_type, 1, v_now, v_now);
    
    RETURN jsonb_build_object(
      'allowed', true,
      'attempts', 1,
      'max_attempts', p_max_attempts,
      'remaining', p_max_attempts - 1
    );
  END IF;
  
  -- Check if window expired (reset counter)
  IF v_record.first_attempt_at < v_window_start THEN
    UPDATE rate_limits 
    SET attempts = 1, first_attempt_at = v_now, last_attempt_at = v_now, blocked_until = NULL
    WHERE id = v_record.id;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'attempts', 1,
      'max_attempts', p_max_attempts,
      'remaining', p_max_attempts - 1
    );
  END IF;
  
  -- Increment attempts
  IF v_record.attempts >= p_max_attempts THEN
    -- Block the IP
    UPDATE rate_limits 
    SET blocked_until = v_now + (p_block_minutes || ' minutes')::INTERVAL,
        last_attempt_at = v_now
    WHERE id = v_record.id;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'blocked_until', v_now + (p_block_minutes || ' minutes')::INTERVAL,
      'remaining_seconds', p_block_minutes * 60
    );
  END IF;
  
  -- Update attempt count
  UPDATE rate_limits 
  SET attempts = attempts + 1, last_attempt_at = v_now
  WHERE id = v_record.id;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'attempts', v_record.attempts + 1,
    'max_attempts', p_max_attempts,
    'remaining', p_max_attempts - v_record.attempts - 1
  );
END;
$$;

-- Cleanup old entries (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits 
  WHERE last_attempt_at < now() - INTERVAL '24 hours'
    AND (blocked_until IS NULL OR blocked_until < now());
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;