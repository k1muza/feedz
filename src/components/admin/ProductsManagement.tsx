
'use client';

import { Plus, Download, MoreHorizontal, Search, Filter, Edit, Trash2, Eye, Loader2, FolderOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types";
import { useState, useEffect } from "react";
import { deleteProduct } from "@/app/actions";
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
} from "@/components/ui/alert-dialog"
import { ProductCategoryManagementModal } from "./ProductCategoryManagementModal";
import { packLabel } from "@/lib/product-units";

export const ProductsManagement = ({ initialProducts }: { initialProducts: Product[] }) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(true);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setProducts(initialProducts);
    setLoading(false);
  }, [initialProducts]);

  const confirmDelete = (product: Product) => {
    setProductToDelete(product);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    const result = await deleteProduct(productToDelete.id);

    if (result.success) {
      toast({
        title: "Product Deleted",
        description: `Successfully deleted ${productToDelete.ingredient?.name}.`,
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
    setProductToDelete(null);
  };

  const categories = Array.from(new Set(products.map((product) => product.ingredient?.category).filter(Boolean) as string[])).sort();
  const normalizedQuery = query.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const category = product.ingredient?.category || '';
    const matchesCategory = categoryFilter === 'all' || category === categoryFilter;
    const matchesQuery = !normalizedQuery || [product.id, product.ingredient?.name || '', category]
      .some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesCategory && matchesQuery;
  });

  if (loading) {
    return <div className="text-center p-8"><Loader2 className="w-6 h-6 animate-spin inline-block"/> Loading products...</div>
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold text-ash-100">
          Products
        </h2>
        <div className="flex space-x-3">
          <button onClick={() => setIsCategoryModalOpen(true)} className="px-4 py-2 border border-ash-600 hover:bg-ash-700 rounded-lg flex items-center space-x-2 transition-colors">
            <FolderOpen className="w-4 h-4" />
            <span>Categories</span>
          </button>
          <Link href="/admin/products/create">
            <button className="px-4 py-2 bg-harvest-600 hover:bg-harvest-500 text-ash-950 rounded-lg flex items-center space-x-2 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </Link>
          <a
            href={`/api/products/catalog${categoryFilter === 'all' ? '' : `?category=${encodeURIComponent(categoryFilter)}`}`}
            target="_blank"
            rel="noopener"
            className="px-4 py-2 border border-ash-600 hover:bg-ash-700 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Catalogue</span>
          </a>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-ash-400" />
          <input
            type="text"
            placeholder="Search by product name or category..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-ash-800 border border-ash-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-harvest-500/50"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash-400 pointer-events-none" />
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="pl-9 pr-8 py-2 bg-ash-800 border border-ash-700 rounded-lg">
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-ash-800/50 border border-ash-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ash-700">
            <thead className="bg-ash-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ash-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-ash-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash-700">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-ash-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <Image className="h-10 w-10 rounded-md object-cover" src={product.images[0] || '/images/products/placeholder.webp'} alt={product.ingredient?.name || 'product'} width={40} height={40} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-ash-100">{product.ingredient?.name}</div>
                        <div className="text-sm text-ash-400">{product.id} · {product.ingredientId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900/30 text-green-400 capitalize">
                      {product.ingredient?.category?.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ash-400">{product.price > 0 ? `$${product.price.toFixed(2)} / ${packLabel(product.packSizeKg)}` : 'On request'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.status === 'In stock' ? 'bg-green-900/30 text-green-400' : product.status === 'Readily available' ? 'bg-emerald-900/30 text-emerald-300' : product.status === 'Limited' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-ash-700 text-ash-300'}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-full hover:bg-ash-700">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-ash-800 border-ash-700 text-ash-100">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/products/${product.id}`} className="flex items-center gap-2 cursor-pointer">
                            <Eye className="w-4 h-4" /> View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/products/${product.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                            <Edit className="w-4 h-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => confirmDelete(product)} className="flex items-center gap-2 text-red-400 cursor-pointer focus:bg-red-900/50 focus:text-red-300">
                          <Trash2 className="w-4 h-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-ash-400">No products match the current filters.</td></tr>
              )}
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
              This action cannot be undone. This will permanently delete the product
              <code className="font-mono bg-ash-700 rounded-sm px-1 mx-1">{productToDelete?.ingredient?.name}</code>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500">
              Yes, delete product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ProductCategoryManagementModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} />
    </>
  );
};
