import { supabase } from '@/integrations/supabase/client';

export const seedSampleData = async () => {
  try {
    console.log('Starting to seed sample data...');
    
    // Check if we already have products
    const { count: existingProducts, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    console.log('Existing products count:', existingProducts);
    
    if (countError) {
      console.error('Error checking existing products:', countError);
    }

    if (existingProducts && existingProducts > 0) {
      console.log('Sample data already exists');
      return { success: true, message: `Sample data already exists (${existingProducts} products found)` };
    }

    // Create sample products
    const sampleProducts = [
      {
        title: 'Advanced Sword Combat System',
        description: 'A comprehensive combat system featuring advanced sword mechanics, combos, and visual effects. Perfect for RPG and action games.',
        price: 24.99,
        image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
        category: 'Scripts',
        downloads: 2340,
        rating: 4.8,
        is_featured: true,
        is_top_rated: true,
        is_new: false,
      },
      {
        title: 'Magic Spell Framework',
        description: 'Complete magic system with spell casting, mana management, and visual effects. Includes 20+ pre-built spells.',
        price: 19.99,
        image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
        category: 'Scripts',
        downloads: 1850,
        rating: 4.6,
        is_featured: true,
        is_top_rated: false,
        is_new: true,
      },
      {
        title: 'Medieval Castle Pack',
        description: 'High-quality medieval castle models with interiors. Includes walls, towers, gates, and decorative elements.',
        price: 34.99,
        image_url: 'https://images.unsplash.com/photo-1520637836862-4d197d17c93a?w=400&h=300&fit=crop',
        category: 'Models',
        downloads: 3200,
        rating: 4.9,
        is_featured: true,
        is_top_rated: true,
        is_new: false,
      },
      {
        title: 'Racing Car Collection',
        description: 'Pack of 10 detailed racing cars with customizable colors and realistic physics properties.',
        price: 29.99,
        image_url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&h=300&fit=crop',
        category: 'Models',
        downloads: 2100,
        rating: 4.7,
        is_featured: false,
        is_top_rated: false,
        is_new: true,
      },
      {
        title: 'Inventory Management System',
        description: 'Complete inventory system with drag-and-drop, item stacking, and database integration.',
        price: 22.50,
        image_url: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=300&fit=crop',
        category: 'Scripts',
        downloads: 1650,
        rating: 4.5,
        is_featured: true,
        is_top_rated: false,
        is_new: false,
      },
    ];

    console.log('Inserting sample products...');
    
    // Insert sample products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .insert(sampleProducts)
      .select();

    if (productsError) {
      console.error('Error inserting products:', productsError);
      throw productsError;
    }

    console.log('Products inserted:', products?.length);

    // Create some sample sales
    if (products && products.length > 0) {
      const sampleSales = [
        { product_id: products[0].id, amount: 24.99 },
        { product_id: products[1].id, amount: 19.99 },
        { product_id: products[2].id, amount: 34.99 },
        { product_id: products[0].id, amount: 24.99 },
        { product_id: products[4].id, amount: 22.50 },
        { product_id: products[2].id, amount: 34.99 },
        { product_id: products[1].id, amount: 19.99 },
        { product_id: products[3].id, amount: 29.99 },
      ];

      const { error: salesError } = await supabase
        .from('sales')
        .insert(sampleSales);

      if (salesError) throw salesError;
    }

    console.log('Sample data creation completed successfully');
    return { success: true, message: `Sample data created successfully! Added ${products?.length || 0} products.` };
  } catch (error) {
    console.error('Error seeding data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to seed data' };
  }
};