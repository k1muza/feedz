
'use client';

import { Plus, Download, MoreHorizontal, Search, Filter, Edit, Trash2, Eye, Loader2, FolderOpen, FlaskConical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Ingredient } from "@/types";
import { useState, useEffect } from "react";
import { deleteIngredient } from "@/app/actions";
import { useRouter } from "next/navigation";
import { useToast } from "../ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProductCategoryManagementModal } from "./ProductCategoryManagementModal";

export const IngredientsManagement = ({ initialIngredients }: { initialIngredients: Ingredient[] }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [loading, setLoading] = useState(true);
  const [ingredientToDelete, setIngredientToDelete] = useState<Ingredient | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIngredients(initialIngredients);
    setLoading(false);
  }, [initialIngredients]);

  const confirmDelete = (ingredient: Ingredient) => {
    setIngredientToDelete(ingredient);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!ingredientToDelete) return;

    const result = await deleteIngredient(ingredientToDelete.id);

    if (result.success) {
      toast({
        title: "Ingredient Deleted",
        description: `Successfully deleted ${ingredientToDelete.name}.`,
      });
      router.refresh();
    } else {
      toast({
        title: "Deletion Failed",
        description: result.error,
        variant: 'destructive',
      });
    }
    setIsAlertOpen(false);
    setIngredientToDelete(null);
  };

  if (loading) {
    return <div className="text-center p-8"><Loader2 className="w-6 h-6 animate-spin inline-block"/> Loading ingredients...</div>
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FlaskConical />
            Ingredients
        </h2>
        <div className="flex space-x-3">
           <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-4 py-2 border border-gray-600 hover:bg-gray-700 rounded-lg flex items-center space-x-2 transition-colors">
              <FolderOpen className="w-4 h-4" />
              <span>Manage Categories</span>
            </button>
          <Link href="/admin/ingredients/create">
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Add Ingredient</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ingredient name or category..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
        <button className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg flex items-center space-x-2 hover:bg-gray-700 transition-colors">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
      </div>

      {/* Ingredients Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Compositions</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {ingredients.map((ingredient) => (
                <tr key={ingredient.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{ingredient.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900/30 text-green-400 capitalize">
                      {ingredient.category?.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{ingredient.compositions?.length || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-full hover:bg-gray-700">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-white">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/ingredients/${ingredient.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                            <Edit className="w-4 h-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => confirmDelete(ingredient)} className="flex items-center gap-2 text-red-400 cursor-pointer focus:bg-red-900/50 focus:text-red-300">
                          <Trash2 className="w-4 h-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the ingredient
              <code className="font-mono bg-gray-700 rounded-sm px-1 mx-1">{ingredientToDelete?.name}</code>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500">
              Yes, delete ingredient
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ProductCategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </>
  );
};
