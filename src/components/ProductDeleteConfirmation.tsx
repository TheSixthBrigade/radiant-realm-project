import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  title: string;
  price: number;
}

interface ProductDeleteConfirmationProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductDeleted: () => void;
}

const ProductDeleteConfirmation = ({
  product,
  open,
  onOpenChange,
  onProductDeleted,
}: ProductDeleteConfirmationProps) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!product) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;

      toast.success("Product deleted successfully!");
      onProductDeleted();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <DialogTitle>Delete Product</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            Are you sure you want to delete "{product.title}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
              This will permanently:
            </h4>
            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
              <li>• Remove the product from your store</li>
              <li>• Delete all product images and files</li>
              <li>• Remove it from customer wishlists</li>
              <li>• Cancel any pending orders</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDeleteConfirmation;