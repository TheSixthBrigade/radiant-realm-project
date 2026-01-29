-- Platform Enhancements Migration
-- Adds: voting, changelogs, notifications, reviews, discounts, bundles, affiliates, versioning, licenses, download tracking

-- ============================================
-- 1. Roadmap Voting System
-- ============================================

-- Votes table
CREATE TABLE IF NOT EXISTS roadmap_item_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_item ON roadmap_item_votes(item_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON roadmap_item_votes(user_id);

-- Add voting settings to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS voting_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_by_votes BOOLEAN DEFAULT false;

-- RLS for votes
ALTER TABLE roadmap_item_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can view votes" ON roadmap_item_votes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Logged in users can vote" ON roadmap_item_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can remove their own votes" ON roadmap_item_votes FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- 2. Changelogs
-- ============================================

CREATE TABLE IF NOT EXISTS changelogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version_id UUID REFERENCES roadmap_versions(id) ON DELETE SET NULL,
  version_name TEXT NOT NULL,
  title TEXT,
  content TEXT,
  release_date TIMESTAMPTZ DEFAULT NOW(),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_changelogs_product ON changelogs(product_id);
CREATE INDEX IF NOT EXISTS idx_changelogs_published ON changelogs(is_published, release_date DESC);

-- RLS for changelogs
ALTER TABLE changelogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published changelogs" 
ON changelogs FOR SELECT 
USING (is_published = true OR auth.uid() IN (SELECT creator_id FROM products WHERE id = product_id));

CREATE POLICY "Creators can manage changelogs" 
ON changelogs FOR ALL 
USING (auth.uid() IN (SELECT creator_id FROM products WHERE id = product_id));


-- ============================================
-- 3. Notification Preferences
-- ============================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_product ON notification_preferences(product_id);

-- RLS for notification preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences" 
ON notification_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences" 
ON notification_preferences FOR ALL 
USING (auth.uid() = user_id);

-- ============================================
-- 4. Product Reviews
-- ============================================

CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  owner_response TEXT,
  owner_response_at TIMESTAMPTZ,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON product_reviews(product_id, rating);

-- RLS for reviews
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" 
ON product_reviews FOR SELECT USING (true);

CREATE POLICY "Buyers can create reviews" 
ON product_reviews FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (SELECT 1 FROM sales WHERE buyer_id = auth.uid() AND product_id = product_reviews.product_id)
);

CREATE POLICY "Users can update their own reviews" 
ON product_reviews FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" 
ON product_reviews FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- 5. Discount Codes
-- ============================================

CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL NOT NULL CHECK (discount_value > 0),
  min_purchase DECIMAL,
  max_discount DECIMAL,
  product_ids UUID[],
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creator_id, code)
);

CREATE INDEX IF NOT EXISTS idx_discount_creator ON discount_codes(creator_id);
CREATE INDEX IF NOT EXISTS idx_discount_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_active ON discount_codes(is_active, expires_at);

-- Discount Usage tracking
CREATE TABLE IF NOT EXISTS discount_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  discount_amount DECIMAL NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_usage_code ON discount_usage(code_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_user ON discount_usage(user_id);

-- RLS for discount codes
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage their discount codes" 
ON discount_codes FOR ALL 
USING (auth.uid() = creator_id);

CREATE POLICY "Anyone can view active discount codes for validation" 
ON discount_codes FOR SELECT 
USING (is_active = true);

ALTER TABLE discount_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view usage of their codes" 
ON discount_usage FOR SELECT 
USING (code_id IN (SELECT id FROM discount_codes WHERE creator_id = auth.uid()));

CREATE POLICY "System can insert usage records" 
ON discount_usage FOR INSERT 
WITH CHECK (true);


-- ============================================
-- 6. Product Bundles
-- ============================================

CREATE TABLE IF NOT EXISTS product_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  product_ids UUID[] NOT NULL,
  bundle_price DECIMAL NOT NULL CHECK (bundle_price >= 0),
  original_price DECIMAL NOT NULL CHECK (original_price >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundles_creator ON product_bundles(creator_id);
CREATE INDEX IF NOT EXISTS idx_bundles_active ON product_bundles(is_active);

-- RLS for bundles
ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bundles" 
ON product_bundles FOR SELECT 
USING (is_active = true OR auth.uid() = creator_id);

CREATE POLICY "Creators can manage their bundles" 
ON product_bundles FOR ALL 
USING (auth.uid() = creator_id);

-- ============================================
-- 7. Affiliate System
-- ============================================

-- Affiliate settings per creator
CREATE TABLE IF NOT EXISTS affiliate_settings (
  creator_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  commission_rate DECIMAL DEFAULT 0.1 CHECK (commission_rate >= 0 AND commission_rate <= 1),
  min_payout DECIMAL DEFAULT 50 CHECK (min_payout >= 0),
  cookie_days INTEGER DEFAULT 30 CHECK (cookie_days > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate links
CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  earnings DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_links_user ON affiliate_links(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_creator ON affiliate_links(creator_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_code ON affiliate_links(code);

-- Affiliate referrals
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  commission_amount DECIMAL NOT NULL CHECK (commission_amount >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_referrals_link ON affiliate_referrals(link_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON affiliate_referrals(status);

-- RLS for affiliate tables
ALTER TABLE affiliate_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enabled affiliate settings" 
ON affiliate_settings FOR SELECT 
USING (is_enabled = true OR auth.uid() = creator_id);

CREATE POLICY "Creators can manage their affiliate settings" 
ON affiliate_settings FOR ALL 
USING (auth.uid() = creator_id);

ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own affiliate links" 
ON affiliate_links FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = creator_id);

CREATE POLICY "Users can create affiliate links" 
ON affiliate_links FOR INSERT 
WITH CHECK (auth.uid() = user_id);

ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their referrals" 
ON affiliate_referrals FOR SELECT 
USING (link_id IN (SELECT id FROM affiliate_links WHERE user_id = auth.uid() OR creator_id = auth.uid()));


-- ============================================
-- 8. Product Versioning
-- ============================================

CREATE TABLE IF NOT EXISTS product_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  changelog TEXT,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_versions_product ON product_versions(product_id);
CREATE INDEX IF NOT EXISTS idx_versions_current ON product_versions(product_id, is_current) WHERE is_current = true;

-- RLS for product versions
ALTER TABLE product_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers and creators can view versions" 
ON product_versions FOR SELECT 
USING (
  auth.uid() IN (SELECT creator_id FROM products WHERE id = product_id)
  OR EXISTS (SELECT 1 FROM sales WHERE buyer_id = auth.uid() AND product_id = product_versions.product_id)
);

CREATE POLICY "Creators can manage versions" 
ON product_versions FOR ALL 
USING (auth.uid() IN (SELECT creator_id FROM products WHERE id = product_id));

-- Trigger to ensure only one current version per product
CREATE OR REPLACE FUNCTION ensure_single_current_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE product_versions 
    SET is_current = false 
    WHERE product_id = NEW.product_id AND id != NEW.id AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_single_current_version ON product_versions;
CREATE TRIGGER trigger_single_current_version
BEFORE INSERT OR UPDATE ON product_versions
FOR EACH ROW EXECUTE FUNCTION ensure_single_current_version();

-- ============================================
-- 9. License Keys
-- ============================================

CREATE TABLE IF NOT EXISTS license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  activations INTEGER DEFAULT 0,
  max_activations INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_product ON license_keys(product_id);
CREATE INDEX IF NOT EXISTS idx_license_user ON license_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_license_key ON license_keys(key);
CREATE INDEX IF NOT EXISTS idx_license_status ON license_keys(status);

-- License activations
CREATE TABLE IF NOT EXISTS license_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES license_keys(id) ON DELETE CASCADE,
  machine_id TEXT NOT NULL,
  ip_address INET,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_activations_license ON license_activations(license_id);
CREATE INDEX IF NOT EXISTS idx_activations_machine ON license_activations(machine_id);

-- Add license settings to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS license_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_activations INTEGER;

-- RLS for license keys
ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own licenses" 
ON license_keys FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() IN (SELECT creator_id FROM products WHERE id = product_id));

CREATE POLICY "System can create licenses" 
ON license_keys FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Creators can update licenses" 
ON license_keys FOR UPDATE 
USING (auth.uid() IN (SELECT creator_id FROM products WHERE id = product_id));

ALTER TABLE license_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "License owners and creators can view activations" 
ON license_activations FOR SELECT 
USING (
  license_id IN (
    SELECT id FROM license_keys 
    WHERE user_id = auth.uid() 
    OR product_id IN (SELECT id FROM products WHERE creator_id = auth.uid())
  )
);

CREATE POLICY "System can manage activations" 
ON license_activations FOR ALL 
WITH CHECK (true);


-- ============================================
-- 10. Download Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS download_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version_id UUID REFERENCES product_versions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_downloads_product ON download_events(product_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user ON download_events(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_date ON download_events(downloaded_at);
CREATE INDEX IF NOT EXISTS idx_downloads_version ON download_events(version_id);

-- RLS for download events
ALTER TABLE download_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view download events for their products" 
ON download_events FOR SELECT 
USING (auth.uid() IN (SELECT creator_id FROM products WHERE id = product_id));

CREATE POLICY "System can insert download events" 
ON download_events FOR INSERT 
WITH CHECK (true);

-- ============================================
-- 11. Helper Functions
-- ============================================

-- Function to get vote count for a roadmap item
CREATE OR REPLACE FUNCTION get_roadmap_item_vote_count(item_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM roadmap_item_votes WHERE item_id = item_uuid);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user has voted on an item
CREATE OR REPLACE FUNCTION user_has_voted_on_item(item_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM roadmap_item_votes WHERE item_id = item_uuid AND user_id = user_uuid);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate average rating for a product
CREATE OR REPLACE FUNCTION get_product_average_rating(product_uuid UUID)
RETURNS DECIMAL AS $$
BEGIN
  RETURN (SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0) FROM product_reviews WHERE product_id = product_uuid);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get review count for a product
CREATE OR REPLACE FUNCTION get_product_review_count(product_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM product_reviews WHERE product_id = product_uuid);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to validate discount code
CREATE OR REPLACE FUNCTION validate_discount_code(
  p_code TEXT,
  p_creator_id UUID,
  p_product_id UUID DEFAULT NULL,
  p_total DECIMAL DEFAULT 0
)
RETURNS TABLE (
  valid BOOLEAN,
  discount_id UUID,
  discount_type TEXT,
  discount_value DECIMAL,
  max_discount DECIMAL,
  error_message TEXT
) AS $$
DECLARE
  v_discount discount_codes%ROWTYPE;
BEGIN
  -- Find the discount code
  SELECT * INTO v_discount 
  FROM discount_codes 
  WHERE code = UPPER(p_code) 
    AND creator_id = p_creator_id 
    AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, 'Invalid discount code'::TEXT;
    RETURN;
  END IF;
  
  -- Check expiration
  IF v_discount.expires_at IS NOT NULL AND v_discount.expires_at < NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, 'This code has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check usage limit
  IF v_discount.usage_limit IS NOT NULL AND v_discount.usage_count >= v_discount.usage_limit THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, 'This code has reached its usage limit'::TEXT;
    RETURN;
  END IF;
  
  -- Check minimum purchase
  IF v_discount.min_purchase IS NOT NULL AND p_total < v_discount.min_purchase THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, 
      ('Minimum purchase of $' || v_discount.min_purchase || ' required')::TEXT;
    RETURN;
  END IF;
  
  -- Check product restriction
  IF v_discount.product_ids IS NOT NULL AND p_product_id IS NOT NULL THEN
    IF NOT (p_product_id = ANY(v_discount.product_ids)) THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, 
        'This code cannot be applied to this product'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Valid!
  RETURN QUERY SELECT true, v_discount.id, v_discount.discount_type, v_discount.discount_value, v_discount.max_discount, NULL::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to generate license key
CREATE OR REPLACE FUNCTION generate_license_key()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
  j INTEGER;
BEGIN
  FOR i IN 1..4 LOOP
    IF i > 1 THEN
      result := result || '-';
    END IF;
    FOR j IN 1..4 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique affiliate code
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 12. Updated_at triggers
-- ============================================

DROP TRIGGER IF EXISTS update_changelogs_updated_at ON changelogs;
CREATE TRIGGER update_changelogs_updated_at 
BEFORE UPDATE ON changelogs 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON product_reviews;
CREATE TRIGGER update_product_reviews_updated_at 
BEFORE UPDATE ON product_reviews 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_bundles_updated_at ON product_bundles;
CREATE TRIGGER update_product_bundles_updated_at 
BEFORE UPDATE ON product_bundles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_affiliate_settings_updated_at ON affiliate_settings;
CREATE TRIGGER update_affiliate_settings_updated_at 
BEFORE UPDATE ON affiliate_settings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

