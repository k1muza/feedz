
'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Edit2, Trash2, Check, Loader2 } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import {
  getBlogCategories,
  addBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
} from '@/app/actions';
import { BlogCategory } from '@/types';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryManagementModal = ({ isOpen, onClose }: CategoryManagementModalProps) => {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchCategories = async () => {
    setLoading(true);
    const fetchedCategories = await getBlogCategories();
    setCategories(fetchedCategories);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: 'Error', description: 'Category name cannot be empty.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const result = await addBlogCategory(newCategoryName);
    if (result.success) {
      toast({ title: 'Success', description: 'Category added.' });
      setNewCategoryName('');
      fetchCategories();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingCategoryName.trim()) {
      toast({ title: 'Error', description: 'Category name cannot be empty.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const result = await updateBlogCategory(id, editingCategoryName);
    if (result.success) {
      toast({ title: 'Success', description: 'Category updated.' });
      setEditingCategoryId(null);
      fetchCategories();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };
  
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This cannot be undone.')) {
        return;
    }
    const result = await deleteBlogCategory(id);
     if (result.success) {
      toast({ title: 'Success', description: 'Category deleted.' });
      fetchCategories();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };


  const startEditing = (category: BlogCategory) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-ash-800 border border-ash-700 rounded-lg w-full max-w-lg flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-ash-700 flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-medium text-ash-100">Manage Categories</h3>
          <button onClick={onClose} className="text-ash-400 hover:text-ash-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-2">
            {loading ? (
                <p className="text-ash-400">Loading categories...</p>
            ) : (
                categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between bg-ash-700/50 p-2 rounded-lg">
                        {editingCategoryId === cat.id ? (
                            <input
                                type="text"
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                className="bg-ash-600 border-ash-500 rounded-md shadow-sm focus:ring-harvest-500 focus:border-harvest-500 sm:text-sm p-1 flex-grow"
                                autoFocus
                            />
                        ) : (
                            <span className="text-ash-100">{cat.name}</span>
                        )}

                        <div className="flex items-center space-x-2">
                            {editingCategoryId === cat.id ? (
                                <button 
                                    onClick={() => handleUpdateCategory(cat.id)}
                                    disabled={isSubmitting}
                                    className="p-1.5 text-green-400 hover:bg-ash-600 rounded-md"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4" />}
                                </button>
                            ) : (
                                <button onClick={() => startEditing(cat)} className="p-1.5 text-ash-400 hover:text-ash-100 hover:bg-ash-600 rounded-md">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            )}
                             <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-red-500 hover:text-red-400 hover:bg-ash-600 rounded-md">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Add Category Form */}
        <div className="p-4 border-t border-ash-700 flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name"
              className="w-full bg-ash-700 border-ash-600 rounded-md shadow-sm focus:ring-harvest-500 focus:border-harvest-500 sm:text-sm p-2"
            />
            <button
              onClick={handleAddCategory}
              disabled={isSubmitting}
              className="px-4 py-2 bg-harvest-600 hover:bg-harvest-500 text-ash-950 rounded-lg flex items-center space-x-2 transition-colors disabled:bg-ash-500"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4" />}
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
