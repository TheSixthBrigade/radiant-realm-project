-- Fix existing affiliate and discount tables
-- This migration addresses column name mismatches and missing columns

-- First, let's check and fix the discount_usage table structure
DO $$
BEGIN
    -- Check if discount_code_id column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'discount_usage' 
        AND column_name = 'discount_code_id'
        AND table_schema = 'public'
    ) THEN
        -- Add the missing column
        ALTER TABLE discount_usage ADD COLUMN discount_code_id UUID;
        
        -- Add foreign key constraint
        ALTER TABLE discount_usage 
        ADD CONSTRAINT fk_discount_usage_discount_code_id 
        FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id) ON DELETE CASCADE;
    END IF;
    
    -- Check if cookie_days column exists in affiliate_settings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'affiliate_settings' 
        AND column_name = 'cookie_days'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE affiliate_settings ADD COLUMN cookie_days INTEGER DEFAULT 30;
    END IF;
    
    -- Check if earnings column exists in affiliate_links (might be named differently)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'affiliate_links' 
        AND column_name = 'earnings'
        AND table_schema = 'public'
    ) THEN
        -- Check if it's named total_earnings instead
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'affiliate_links' 
            AND column_name = 'total_earnings'
            AND table_schema = 'public'
        ) THEN
            -- Rename total_earnings to earnings for consistency
            ALTER TABLE affiliate_links RENAME COLUMN total_earnings TO earnings;
        ELSE
            -- Add the earnings column
            ALTER TABLE affiliate_links ADD COLUMN earnings DECIMAL(10,2) DEFAULT 0.00;
        END IF;
    END IF;
END $$;

-- Create missing indexes (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_discount_usage_discount_code_id ON discount_usage(discount_code_id);

-- Ensure all RLS policies exist
DO $$
BEGIN
    -- Check if RLS is enabled on all tables
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'affiliate_settings' 
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE affiliate_settings ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'affiliate_links' 
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'affiliate_referrals' 
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'discount_codes' 
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'discount_usage' 
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE discount_usage ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create RLS policies (with IF NOT EXISTS equivalent using DO blocks)
DO $$
BEGIN
    -- Affiliate Settings Policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliate_settings' 
        AND policyname = 'Users can view their own affiliate settings'
    ) THEN
        CREATE POLICY "Users can view their own affiliate settings" ON affiliate_settings
            FOR SELECT USING (auth.uid() = creator_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliate_settings' 
        AND policyname = 'Users can insert their own affiliate settings'
    ) THEN
        CREATE POLICY "Users can insert their own affiliate settings" ON affiliate_settings
            FOR INSERT WITH CHECK (auth.uid() = creator_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliate_settings' 
        AND policyname = 'Users can update their own affiliate settings'
    ) THEN
        CREATE POLICY "Users can update their own affiliate settings" ON affiliate_settings
            FOR UPDATE USING (auth.uid() = creator_id);
    END IF;
    
    -- Affiliate Links Policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliate_links' 
        AND policyname = 'Users can view affiliate links for their stores'
    ) THEN
        CREATE POLICY "Users can view affiliate links for their stores" ON affiliate_links
            FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliate_links' 
        AND policyname = 'Users can create affiliate links'
    ) THEN
        CREATE POLICY "Users can create affiliate links" ON affiliate_links
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliate_links' 
        AND policyname = 'Users can update their own affiliate links'
    ) THEN
        CREATE POLICY "Users can update their own affiliate links" ON affiliate_links
            FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = creator_id);
    END IF;
    
    -- Affiliate Referrals Policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliate_referrals' 
        AND policyname = 'Users can view referrals for their links'
    ) THEN
        CREATE POLICY "Users can view referrals for their links" ON affiliate_referrals
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM affiliate_links 
                    WHERE affiliate_links.id = affiliate_referrals.link_id 
                    AND (affiliate_links.user_id = auth.uid() OR affiliate_links.creator_id = auth.uid())
                )
            );
    END IF;
    
    -- Discount Codes Policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'discount_codes' 
        AND policyname = 'Users can view their own discount codes'
    ) THEN
        CREATE POLICY "Users can view their own discount codes" ON discount_codes
            FOR SELECT USING (auth.uid() = creator_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'discount_codes' 
        AND policyname = 'Users can insert their own discount codes'
    ) THEN
        CREATE POLICY "Users can insert their own discount codes" ON discount_codes
            FOR INSERT WITH CHECK (auth.uid() = creator_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'discount_codes' 
        AND policyname = 'Users can update their own discount codes'
    ) THEN
        CREATE POLICY "Users can update their own discount codes" ON discount_codes
            FOR UPDATE USING (auth.uid() = creator_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'discount_codes' 
        AND policyname = 'Users can delete their own discount codes'
    ) THEN
        CREATE POLICY "Users can delete their own discount codes" ON discount_codes
            FOR DELETE USING (auth.uid() = creator_id);
    END IF;
    
    -- Discount Usage Policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'discount_usage' 
        AND policyname = 'Users can view discount usage for their codes'
    ) THEN
        CREATE POLICY "Users can view discount usage for their codes" ON discount_usage
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM discount_codes 
                    WHERE discount_codes.id = discount_usage.discount_code_id 
                    AND discount_codes.creator_id = auth.uid()
                )
            );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'discount_usage' 
        AND policyname = 'Anyone can insert discount usage'
    ) THEN
        CREATE POLICY "Anyone can insert discount usage" ON discount_usage
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;