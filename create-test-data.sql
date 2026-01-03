-- Create test data to ensure the system works

-- First, let's make sure we have a test user with PayPal
DO $$
DECLARE
    test_user_id UUID;
    test_product_id UUID;
BEGIN
    -- Create or get a test user (using a dummy UUID for testing)
    test_user_id := '00000000-0000-0000-0000-000000000001';
    
    -- Insert test user into auth.users if not exists (this might fail in production, that's ok)
    BEGIN
        INSERT INTO auth.users (id, email, created_at, updated_at)
        VALUES (test_user_id, 'testcreator@example.com', now(), now())
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore errors, user might already exist
        NULL;
    END;
    
    -- Create or update profile with PayPal email
    INSERT INTO public.profiles (user_id, display_name, is_creator, paypal_email, bio)
    VALUES (
        test_user_id, 
        'Test Creator', 
        true, 
        'testcreator@paypal.com',
        'I am a test creator with PayPal setup'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        is_creator = true,
        paypal_email = 'testcreator@paypal.com',
        display_name = 'Test Creator';
    
    -- Create a test product
    INSERT INTO public.products (
        id,
        title,
        description,
        price,
        image_url,
        category,
        downloads,
        rating,
        creator_id,
        is_featured,
        is_top_rated,
        is_new
    ) VALUES (
        gen_random_uuid(),
        'Test Product with PayPal',
        'This is a test product from a creator with PayPal setup',
        19.99,
        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop',
        'Scripts',
        150,
        4.8,
        test_user_id,
        true,
        false,
        true
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Test data created successfully!';
END $$;

-- Also make sure the current admin user has PayPal setup
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Find admin user
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'thecheesemanatyou@gmail.com' 
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Update admin profile with PayPal
        INSERT INTO public.profiles (user_id, display_name, is_creator, paypal_email)
        VALUES (admin_user_id, 'Admin Creator', true, 'admin@paypal.com')
        ON CONFLICT (user_id) DO UPDATE SET
            is_creator = true,
            paypal_email = 'admin@paypal.com';
            
        RAISE NOTICE 'Admin user updated with PayPal!';
    END IF;
END $$;