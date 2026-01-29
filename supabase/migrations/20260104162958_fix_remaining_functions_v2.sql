-- Drop and recreate commission functions
DROP FUNCTION IF EXISTS public.get_store_commission_rate(UUID);
DROP FUNCTION IF EXISTS public.cleanup_expired_commission_overrides();

CREATE FUNCTION public.get_store_commission_rate(p_store_id UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_rate DECIMAL;
BEGIN
  SELECT custom_rate INTO v_rate
  FROM commission_overrides
  WHERE store_id = p_store_id
  AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;
  
  RETURN 0.10;
END;
$$;

CREATE FUNCTION public.cleanup_expired_commission_overrides()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM commission_overrides WHERE expires_at < NOW();
END;
$$;;
