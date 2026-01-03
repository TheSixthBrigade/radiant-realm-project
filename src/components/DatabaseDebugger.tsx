import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { createTestData } from "@/utils/createTestData";
import { toast } from "sonner";

const DatabaseDebugger = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const testDatabase = async () => {
    setLoading(true);
    try {
      console.log('Testing database...');

      // Test products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .limit(10);

      if (productsError) {
        console.error('Products error:', productsError);
      } else {
        console.log('Products:', productsData);
        setProducts(productsData || []);
      }

      // Test profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(10);

      if (profilesError) {
        console.error('Profiles error:', profilesError);
      } else {
        console.log('Profiles:', profilesData);
        setProfiles(profilesData || []);
      }

      // Test specific product with creator
      if (productsData && productsData.length > 0) {
        const firstProduct = productsData[0];
        console.log('Testing first product:', firstProduct);

        if (firstProduct.creator_id) {
          const { data: creatorData, error: creatorError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', firstProduct.creator_id)
            .single();

          if (creatorError) {
            console.error('Creator error:', creatorError);
          } else {
            console.log('Creator for first product:', creatorData);
          }
        }
      }

    } catch (error) {
      console.error('Database test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTestData = async () => {
    setCreating(true);
    try {
      await createTestData();
      toast.success('Test data created successfully!');
      await testDatabase(); // Refresh the data
    } catch (error) {
      console.error('Error creating test data:', error);
      toast.error('Failed to create test data');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    testDatabase();
  }, []);

  return (
    <Card className="p-6 m-4">
      <h3 className="text-lg font-semibold mb-4">Database Debugger</h3>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={testDatabase} disabled={loading}>
            {loading ? 'Testing...' : 'Test Database'}
          </Button>
          <Button onClick={handleCreateTestData} disabled={creating} variant="outline">
            {creating ? 'Creating...' : 'Create Test Data'}
          </Button>
        </div>

        <div>
          <h4 className="font-medium">Products ({products.length}):</h4>
          <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(products, null, 2)}
          </pre>
        </div>

        <div>
          <h4 className="font-medium">Profiles ({profiles.length}):</h4>
          <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(profiles, null, 2)}
          </pre>
        </div>
      </div>
    </Card>
  );
};

export default DatabaseDebugger;