import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  image_url?: string;
  category: string;
  downloads: number;
  rating: number;
  creator_id?: string;
  is_featured: boolean;
  is_top_rated: boolean;
  is_new: boolean;
  file_urls?: string[];
  created_at: string;
  updated_at: string;
  creator?: {
    display_name: string;
    avatar_url?: string;
    is_creator: boolean;
  };
  store?: {
    store_name: string;
    store_slug: string;
  };
}

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Get products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Products query error:', productsError);
        throw productsError;
      }

      console.log('Products data:', productsData);

      if (!productsData || productsData.length === 0) {
        console.log('No products found in database');
        setProducts([]);
        return;
      }

      // Get unique creator IDs
      const creatorIds = [...new Set(productsData.map(p => p.creator_id).filter(Boolean))];

      // Fetch all creators in one query
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, is_creator')
        .in('user_id', creatorIds);

      // Create a map for quick lookup
      const creatorsMap = new Map(
        creatorsData?.map(c => [c.user_id, c]) || []
      );

      // Combine products with creator data
      const productsWithCreators: Product[] = productsData.map(product => ({
        ...product,
        creator: product.creator_id ? creatorsMap.get(product.creator_id) : undefined,
      }));

      // Filter out products without valid images (must have image_url that's not empty/placeholder)
      const productsWithImages = productsWithCreators.filter(product => {
        const hasValidImage = product.image_url && 
          product.image_url.trim() !== '' && 
          product.image_url !== '/placeholder.svg' &&
          !product.image_url.includes('placeholder');
        return hasValidImage;
      });

      console.log('Products with images:', productsWithImages.length, 'of', productsWithCreators.length);
      setProducts(productsWithImages);
    } catch (err) {
      console.error('Error in fetchProducts:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchProducts();
  }, []);

  const addProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) throw error;
      setProducts(prev => [data, ...prev]);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  return {
    products,
    loading,
    error,
    fetchProducts,
    addProduct,
  };
};