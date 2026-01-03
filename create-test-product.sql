-- Create a test product for Stripe Connect testing
-- This will help us test the full payment flow

-- First, let's create a test user (seller)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'testseller@example.com',
  '$2a$10$dummy.hash.for.testing.purposes.only',
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"email": "testseller@example.com"}',
  false,
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Create profile for the test seller
INSERT INTO profiles (
  user_id,
  display_name,
  bio,
  is_creator,
  stripe_connect_status
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Test Seller',
  'A test seller for Stripe Connect testing',
  true,
  'not_connected'
) ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  is_creator = EXCLUDED.is_creator;

-- Create a test product
INSERT INTO products (
  id,
  title,
  description,
  price,
  creator_id,
  category,
  tags,
  is_active,
  image_url
) VALUES (
  '660e8400-e29b-41d4-a716-446655440001',
  'Test Digital Asset',
  'A test digital asset for Stripe Connect payment testing. This product will help verify that marketplace payments work correctly.',
  9.99,
  '550e8400-e29b-41d4-a716-446655440000',
  'Digital Assets',
  ARRAY['test', 'stripe', 'connect'],
  true,
  'https://via.placeholder.com/400x300/0ea5e9/ffffff?text=Test+Product'
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active;

-- Create a test buyer user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  '770e8400-e29b-41d4-a716-446655440002',
  'testbuyer@example.com',
  '$2a$10$dummy.hash.for.testing.purposes.only',
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"email": "testbuyer@example.com"}',
  false,
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Create profile for the test buyer
INSERT INTO profiles (
  user_id,
  display_name,
  bio
) VALUES (
  '770e8400-e29b-41d4-a716-446655440002',
  'Test Buyer',
  'A test buyer for Stripe Connect testing'
) ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio;

-- Show the created data
SELECT 'Test data created successfully!' as status;
SELECT 'Seller ID: 550e8400-e29b-41d4-a716-446655440000' as seller_info;
SELECT 'Product ID: 660e8400-e29b-41d4-a716-446655440001' as product_info;
SELECT 'Buyer ID: 770e8400-e29b-41d4-a716-446655440002' as buyer_info;