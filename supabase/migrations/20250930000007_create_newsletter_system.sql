-- Create newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  unsubscribe_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  UNIQUE(email, store_id)
);

-- Create newsletter campaigns table (for tracking sent emails)
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recipients_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0
);

-- Create email queue table (for reliable delivery)
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  campaign_id UUID REFERENCES newsletter_campaigns(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_store ON newsletter_subscribers(store_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_store ON newsletter_campaigns(store_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);

-- Enable RLS
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for newsletter_subscribers
CREATE POLICY "Anyone can subscribe to newsletters"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own subscriptions"
  ON newsletter_subscribers FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM stores WHERE id = store_id));

CREATE POLICY "Store owners can view their subscribers"
  ON newsletter_subscribers FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM stores WHERE id = store_id));

-- RLS Policies for newsletter_campaigns
CREATE POLICY "Store owners can view their campaigns"
  ON newsletter_campaigns FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM stores WHERE id = store_id));

CREATE POLICY "Store owners can create campaigns"
  ON newsletter_campaigns FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM stores WHERE id = store_id));

-- RLS Policies for email_queue (admin only)
CREATE POLICY "Service role can manage email queue"
  ON email_queue FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
