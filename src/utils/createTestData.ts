import { supabase } from "@/integrations/supabase/client";

export const createTestData = async () => {
  try {
    console.log('Creating test data...');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user logged in');
      return;
    }

    console.log('Current user:', user.id, user.email);

    // Create or update profile with PayPal
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        display_name: 'Test Creator',
        is_creator: true,
        paypal_email: 'test@paypal.com',
        bio: 'Test creator with PayPal setup'
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
    } else {
      console.log('Profile created/updated:', profile);
    }

    // Create a test product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        title: 'Test Product with PayPal',
        description: 'This is a test product from a creator with PayPal setup',
        price: 19.99,
        image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop',
        category: 'Scripts',
        downloads: 150,
        rating: 4.8,
        creator_id: user.id,
        is_featured: true,
        is_top_rated: false,
        is_new: true
      })
      .select()
      .single();

    if (productError) {
      console.error('Product error:', productError);
    } else {
      console.log('Product created:', product);
    }

    return { profile, product };
  } catch (error) {
    console.error('Error creating test data:', error);
    throw error;
  }
};