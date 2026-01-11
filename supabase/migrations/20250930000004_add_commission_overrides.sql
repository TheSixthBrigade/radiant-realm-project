-- Create commission_overrides table for custom store commission rates
CREATE TABLE IF NOT EXISTS public.commission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  custom_rate DECIMAL(5,2) NOT NULL CHECK (custom_rate >= 0 AND custom_rate <= 100),
  default_rate DECIMAL(5,2) DEFAULT 5.00,
  is_permanent BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(store_id)
);
-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_commission_overrides_store_id ON public.commission_overrides(store_id);
CREATE INDEX IF NOT EXISTS idx_commission_overrides_expires_at ON public.commission_overrides(expires_at) WHERE expires_at IS NOT NULL;
-- Enable RLS
ALTER TABLE public.commission_overrides ENABLE ROW LEVEL SECURITY;
-- RLS Policies
CREATE POLICY "Admins can manage commission overrides" ON public.commission_overrides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );
CREATE POLICY "Store owners can view their commission rate" ON public.commission_overrides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = commission_overrides.store_id 
      AND stores.user_id = auth.uid()
    )
  );
-- Function to get active commission rate for a store
CREATE OR REPLACE FUNCTION get_store_commission_rate(store_id_param UUID)
RETURNS DECIMAL AS $$
DECLARE
  override_rate DECIMAL;
  override_expires TIMESTAMP WITH TIME ZONE;
  is_perm BOOLEAN;
BEGIN
  -- Check if there's an active override
  SELECT custom_rate, expires_at, is_permanent
  INTO override_rate, override_expires, is_perm
  FROM commission_overrides
  WHERE store_id = store_id_param;
  
  -- If no override found, return default 5%
  IF override_rate IS NULL THEN
    RETURN 5.00;
  END IF;
  
  -- If permanent, return the custom rate
  IF is_perm THEN
    RETURN override_rate;
  END IF;
  
  -- If temporary and not expired, return custom rate
  IF override_expires IS NULL OR override_expires > NOW() THEN
    RETURN override_rate;
  END IF;
  
  -- If expired, return default
  RETURN 5.00;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to clean up expired commission overrides
CREATE OR REPLACE FUNCTION cleanup_expired_commission_overrides()
RETURNS void AS $$
BEGIN
  DELETE FROM commission_overrides
  WHERE is_permanent = false 
  AND expires_at IS NOT NULL 
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Add comment
COMMENT ON TABLE public.commission_overrides IS 'Custom commission rates for specific stores, can be temporary or permanent';
COMMENT ON FUNCTION get_store_commission_rate IS 'Returns the active commission rate for a store (custom or default 5%)';
