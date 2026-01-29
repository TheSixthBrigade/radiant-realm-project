-- Create affiliate_settings table
CREATE TABLE IF NOT EXISTS affiliate_settings (
  creator_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  commission_rate DECIMAL DEFAULT 0.10,
  min_payout DECIMAL DEFAULT 50,
  cookie_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create affiliate_links table
CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  earnings DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, creator_id)
);

-- Create affiliate_referrals table
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID REFERENCES affiliate_links(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  commission_amount DECIMAL NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create affiliate_payout_requests table
CREATE TABLE IF NOT EXISTS affiliate_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  payout_method TEXT,
  payout_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE affiliate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payout_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliate_settings
CREATE POLICY "Anyone can view enabled affiliate settings" ON affiliate_settings
  FOR SELECT USING (true);

CREATE POLICY "Creators can manage their own settings" ON affiliate_settings
  FOR ALL USING (auth.uid() = creator_id);

-- RLS Policies for affiliate_links
CREATE POLICY "Anyone can view affiliate links" ON affiliate_links
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own affiliate links" ON affiliate_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links" ON affiliate_links
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = creator_id);

-- RLS Policies for affiliate_referrals
CREATE POLICY "Users can view their own referrals" ON affiliate_referrals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM affiliate_links 
      WHERE affiliate_links.id = affiliate_referrals.link_id 
      AND (affiliate_links.user_id = auth.uid() OR affiliate_links.creator_id = auth.uid())
    )
  );

CREATE POLICY "System can insert referrals" ON affiliate_referrals
  FOR INSERT WITH CHECK (true);

-- RLS Policies for affiliate_payout_requests
CREATE POLICY "Users can view their own payout requests" ON affiliate_payout_requests
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = creator_id);

CREATE POLICY "Users can create payout requests" ON affiliate_payout_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can update payout requests" ON affiliate_payout_requests
  FOR UPDATE USING (auth.uid() = creator_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_links_user_id ON affiliate_links(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_creator_id ON affiliate_links(creator_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_code ON affiliate_links(code);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_link_id ON affiliate_referrals(link_id);
