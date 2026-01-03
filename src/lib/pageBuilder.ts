import { supabase } from "@/integrations/supabase/client";

export interface PageSection {
  id: string;
  type: string;
  order: number;
  settings: Record<string, any>;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  productIds: string[];
  isVisible: boolean;
}

/**
 * Save page sections to the database
 */
export async function savePageSections(userId: string, sections: PageSection[]) {
  try {
    // Delete existing sections for this user
    await supabase
      .from('page_sections')
      .delete()
      .eq('user_id', userId);

    // Insert new sections
    const sectionsToInsert = sections.map((section) => ({
      user_id: userId,
      type: section.type,
      order_index: section.order,
      settings: section.settings || {},
    }));

    const { error } = await supabase
      .from('page_sections')
      .insert(sectionsToInsert);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error saving page sections:', error);
    return { success: false, error };
  }
}

/**
 * Load page sections from the database
 */
export async function loadPageSections(userId: string): Promise<PageSection[]> {
  try {
    const { data, error } = await supabase
      .from('page_sections')
      .select('*')
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    if (error) throw error;

    return (data || []).map((section) => ({
      id: section.id,
      type: section.type,
      order: section.order_index,
      settings: section.settings || {},
    }));
  } catch (error) {
    console.error('Error loading page sections:', error);
    return [];
  }
}

/**
 * Save collections to the database
 */
export async function saveCollections(userId: string, collections: Collection[]) {
  try {
    // Delete existing collections for this user
    await supabase
      .from('product_collections')
      .delete()
      .eq('user_id', userId);

    // Insert new collections
    for (const collection of collections) {
      const { data: collectionData, error: collectionError } = await supabase
        .from('product_collections')
        .insert({
          id: collection.id,
          user_id: userId,
          name: collection.name,
          slug: collection.slug,
          is_visible: collection.isVisible,
        })
        .select()
        .single();

      if (collectionError) throw collectionError;

      // Insert collection-product relationships
      if (collection.productIds.length > 0) {
        const relationships = collection.productIds.map((productId) => ({
          collection_id: collection.id,
          product_id: productId,
        }));

        const { error: relationshipError } = await supabase
          .from('collection_products')
          .insert(relationships);

        if (relationshipError) throw relationshipError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving collections:', error);
    return { success: false, error };
  }
}

/**
 * Load collections from the database
 */
export async function loadCollections(userId: string): Promise<Collection[]> {
  try {
    const { data: collectionsData, error: collectionsError } = await supabase
      .from('product_collections')
      .select('*')
      .eq('user_id', userId);

    if (collectionsError) throw collectionsError;

    const collections: Collection[] = [];

    for (const collection of collectionsData || []) {
      // Load product IDs for this collection
      const { data: productsData, error: productsError } = await supabase
        .from('collection_products')
        .select('product_id')
        .eq('collection_id', collection.id);

      if (productsError) throw productsError;

      collections.push({
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        productIds: (productsData || []).map((p) => p.product_id),
        isVisible: collection.is_visible,
      });
    }

    return collections;
  } catch (error) {
    console.error('Error loading collections:', error);
    return [];
  }
}
