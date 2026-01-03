import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Eye, EyeOff, Copy } from "lucide-react";

interface ProductActionsMenuProps {
  productId: string;
  productTitle: string;
  isActive: boolean;
  onEdit: (productId: string) => void;
  onDelete: (productId: string) => void;
  onToggleVisibility: (productId: string) => void;
  onDuplicate: (productId: string) => void;
}

const ProductActionsMenu = ({
  productId,
  productTitle,
  isActive,
  onEdit,
  onDelete,
  onToggleVisibility,
  onDuplicate,
}: ProductActionsMenuProps) => {
  const [open, setOpen] = useState(false);

  const handleEdit = () => {
    onEdit(productId);
    setOpen(false);
  };

  const handleDelete = () => {
    onDelete(productId);
    setOpen(false);
  };

  const handleToggleVisibility = () => {
    onToggleVisibility(productId);
    setOpen(false);
  };

  const handleDuplicate = () => {
    onDuplicate(productId);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="w-4 h-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
          <Edit className="w-4 h-4 mr-2" />
          Edit Product
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleToggleVisibility} className="cursor-pointer">
          {isActive ? (
            <>
              <EyeOff className="w-4 h-4 mr-2" />
              Hide Product
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              Show Product
            </>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleDuplicate} className="cursor-pointer">
          <Copy className="w-4 h-4 mr-2" />
          Duplicate
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleDelete} 
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Product
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProductActionsMenu;