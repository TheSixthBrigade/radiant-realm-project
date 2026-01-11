-- Create website_settings table for admin customizations
CREATE TABLE public.website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- Enable RLS
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
-- Create policies for website_settings
CREATE POLICY "Website settings are viewable by everyone" 
ON public.website_settings 
FOR SELECT 
USING (true);
CREATE POLICY "Admins can manage website settings" 
ON public.website_settings 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));
-- Insert default website settings
INSERT INTO public.website_settings (key, value) VALUES
('hero_title', '"Premium Digital Assets for Roblox Developers"'),
('hero_subtitle', '"Discover high-quality game assets, scripts, and 3D models from talented creators worldwide. Build your dream game with confidence."'),
('site_logo', '"/luzondev-logo.png"'),
('primary_color', '"#3b82f6"'),
('secondary_color', '"#1e40af"'),
('featured_product_ids', '[]'),
('footer_content', '"© 2024 LuzonDev. All rights reserved."');
-- Create sample creator profiles
DO $
DECLARE
    creator1_id uuid;
creator2_id uuid;
creator3_id uuid;
store1_id uuid;
store2_id uuid;
store3_id uuid;
BEGIN
    -- Insert sample users (these will be referenced by products)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
    VALUES 
        (gen_random_uuid(), 'gamedevpro@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"display_name": "GameDevPro"}'),
        (gen_random_uuid(), 'scriptwizard@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"display_name": "ScriptWizard"}'),
        (gen_random_uuid(), 'modelmaster@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"display_name": "ModelMaster"}')
    ON CONFLICT (email) DO NOTHING;
-- Get the user IDs
    SELECT id INTO creator1_id FROM auth.users WHERE email = 'gamedevpro@example.com';
SELECT id INTO creator2_id FROM auth.users WHERE email = 'scriptwizard@example.com';
SELECT id INTO creator3_id FROM auth.users WHERE email = 'modelmaster@example.com';
-- Insert profiles for these users
    INSERT INTO public.profiles (user_id, display_name, avatar_url, bio, is_creator, total_earnings)
    VALUES 
        (creator1_id, 'GameDevPro', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face', 'Professional game developer with 5+ years of Roblox experience', true, 2450.00),
        (creator2_id, 'ScriptWizard', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', 'Expert scripter specializing in combat systems and game mechanics', true, 1890.50),
        (creator3_id, 'ModelMaster', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', '3D artist creating high-quality models and animations', true, 3200.75)
    ON CONFLICT (user_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        bio = EXCLUDED.bio,
        is_creator = EXCLUDED.is_creator,
        total_earnings = EXCLUDED.total_earnings;
-- Create stores for these creators
    INSERT INTO public.stores (id, user_id, store_name, store_slug, description, total_sales, total_earnings)
    VALUES 
        (gen_random_uuid(), creator1_id, 'GameDev Pro Studio', 'gamedev-pro-studio', 'Professional game development assets and scripts', 45, 2450.00),
        (gen_random_uuid(), creator2_id, 'Script Wizard Shop', 'script-wizard-shop', 'Advanced scripting solutions for Roblox games', 32, 1890.50),
        (gen_random_uuid(), creator3_id, 'Model Master Gallery', 'model-master-gallery', 'High-quality 3D models and animations', 58, 3200.75)
    RETURNING id INTO store1_id;
-- Get store IDs
    SELECT id INTO store1_id FROM public.stores WHERE user_id = creator1_id;
SELECT id INTO store2_id FROM public.stores WHERE user_id = creator2_id;
SELECT id INTO store3_id FROM public.stores WHERE user_id = creator3_id;
-- Insert sample products
    INSERT INTO public.products (id, title, description, price, image_url, category, downloads, rating, creator_id, store_id, is_featured, is_top_rated, is_new)
    VALUES 
        (gen_random_uuid(), 'Advanced Sword Combat System', 'A comprehensive combat system featuring advanced sword mechanics, combos, and visual effects. Perfect for RPG and action games.', 24.99, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop', 'Scripts', 2340, 4.8, creator1_id, store1_id, true, true, false),
        (gen_random_uuid(), 'Magic Spell Framework', 'Complete magic system with spell casting, mana management, and visual effects. Includes 20+ pre-built spells.', 19.99, 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop', 'Scripts', 1850, 4.6, creator2_id, store2_id, true, false, true),
        (gen_random_uuid(), 'Medieval Castle Pack', 'High-quality medieval castle models with interiors. Includes walls, towers, gates, and decorative elements.', 34.99, 'https://images.unsplash.com/photo-1520637836862-4d197d17c93a?w=400&h=300&fit=crop', 'Models', 3200, 4.9, creator3_id, store3_id, true, true, false),
        (gen_random_uuid(), 'Racing Car Collection', 'Pack of 10 detailed racing cars with customizable colors and realistic physics properties.', 29.99, 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&h=300&fit=crop', 'Models', 2100, 4.7, creator3_id, store3_id, false, false, true),
        (gen_random_uuid(), 'Inventory Management System', 'Complete inventory system with drag-and-drop, item stacking, and database integration.', 22.50, 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=300&fit=crop', 'Scripts', 1650, 4.5, creator2_id, store2_id, true, false, false),
        (gen_random_uuid(), 'Fantasy Weapon Pack', 'Collection of 25 fantasy weapons including swords, axes, bows, and magical staves.', 18.99, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop', 'Models', 2800, 4.8, creator1_id, store1_id, false, true, false),
        (gen_random_uuid(), 'Chief Test Product', 'A test product for debugging and development purposes.', 9.99, 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop', 'Scripts', 150, 4.2, creator1_id, store1_id, false, false, true),
        (gen_random_uuid(), 'Dungeon Generator Script', 'Procedural dungeon generation system with customizable rooms, corridors, and treasure placement.', 27.99, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop', 'Scripts', 980, 4.4, creator2_id, store2_id, false, false, true);
-- Insert sample sales records
    INSERT INTO public.sales (product_id, buyer_id, amount)
    SELECT p.id, creator1_id, p.price
    FROM public.products p
    WHERE p.creator_id != creator1_id
    LIMIT 15;
INSERT INTO public.sales (product_id, buyer_id, amount)
    SELECT p.id, creator2_id, p.price
    FROM public.products p
    WHERE p.creator_id != creator2_id
    LIMIT 12;
INSERT INTO public.sales (product_id, buyer_id, amount)
    SELECT p.id, creator3_id, p.price
    FROM public.products p
    WHERE p.creator_id != creator3_id
    LIMIT 18;
-- Update featured products in website settings
    UPDATE public.website_settings 
    SET value = (
        SELECT jsonb_agg(id)
        FROM public.products 
        WHERE is_featured = true
        LIMIT 6
    )
    WHERE key = 'featured_product_ids';
END $;
-- Grant user roles to sample creators
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'creator'::user_role
FROM auth.users 
WHERE email IN ('gamedevpro@example.com', 'scriptwizard@example.com', 'modelmaster@example.com')
ON CONFLICT (user_id, role) DO NOTHING;
