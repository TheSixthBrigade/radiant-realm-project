-- Fix the create_developer_defaults function to use fully qualified table names
CREATE OR REPLACE FUNCTION public.create_developer_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Use fully qualified table names with public schema
  INSERT INTO public.developer_subscriptions (developer_id, tier)
  VALUES (NEW.id, 'free')
  ON CONFLICT (developer_id) DO NOTHING;
  
  INSERT INTO public.obfuscation_credits (developer_id, credits)
  VALUES (NEW.id, 0)
  ON CONFLICT (developer_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'create_developer_defaults failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;;
