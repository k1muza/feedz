'use client';

import { Product } from '@/types';
import { Save, ImageIcon, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { AssetSelectionModal } from './AssetSelectionModal';
import Image from 'next/image';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { saveProduct } from '@/app/actions';
import { useToast } from '../ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface ProductFormProps {
  product?: Product;
}

const IngredientFormSchema = z.object({
  name: z.string().min(1, 'Ingredient name is required.'),
  category: z.string().min(1, 'Category is required.'),
  description: z.string().min(1, 'Description is required.'),
});

const ProductFormSchema = z.object({
  packaging: z.string().min(1, 'Packaging information is required.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
  moq: z.coerce.number().positive('MOQ must be a positive number.'),
  stock: z.coerce.number().min(0, 'Stock cannot be negative.'),
  images: z.array(z.string().url()).min(1, 'At least one image is required.'),
  certifications: z.string().optional(),
  shipping: z.string().optional(),
  featured: z.boolean().optional(),
});

type FormValues = z.infer<typeof ProductFormSchema> & z.infer<typeof IngredientFormSchema>;

export const ProductForm = ({ product }: ProductFormProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const combinedSchema = ProductFormSchema.merge(IngredientFormSchema);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({
      resolver: zodResolver(combinedSchema),
      defaultValues: {
          name: product?.ingredient?.name || '',
          category: product?.ingredient?.category || '',
          description: product?.ingredient?.description || '',
          price: product?.price || 0,
          stock: product?.stock || 0,
          moq: product?.moq || 0,
          images: product?.images || [],
          packaging: product?.packaging || '',
          certifications: product?.certifications?.join(', ') || '',
          shipping: product?.shipping || '',
          featured: product?.featured || false,
      }
  });

  const featuredImage = watch('images')?.[0];

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
      setIsSubmitting(true);
      setServerError(null);

      const { name, category, description, ...productData } = data;
      const ingredientData = { name, category, description };

      const result = await saveProduct(
          { ...productData, certifications: data.certifications?.split(',').map(s => s.trim()).filter(Boolean) || [] }, 
          ingredientData, 
          product?.id, 
          product?.ingredientId
      );

      setIsSubmitting(false);

      if (result.success) {
          toast({
              title: 'Success!',
              description: `Product ${product ? 'updated' : 'created'} successfully.`,
          });
          router.push('/admin/products');
          router.refresh();
      } else {
          const errorMsg = result.errors?._server?.[0] || 'An unknown error occurred.';
          setServerError(errorMsg);
      }
  };

  const handleImageSelect = (imageSrc: string) => {
    setValue('images', [imageSrc], { shouldValidate: true, shouldDirty: true });
    setIsModalOpen(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex mb-4 justify-between items-center">
            <h1 className="text-2xl font-bold text-white">
                {product ? 'Edit Product' : 'Add New Product'}
            </h1>
            <div className="flex justify-end space-x-3">
            <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : (product ? 'Save Changes' : 'Create Product')}</span>
            </button>
            </div>
        </div>

        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Server Error</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">Product Name</label>
              <input id="name" {...register('name')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
              <textarea id="description" rows={4} {...register('description')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-300">Price ($/ton)</label>
                  <input id="price" type="number" step="0.01" {...register('price')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
                   {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
                </div>
                <div>
                  <label htmlFor="stock" className="block text-sm font-medium text-gray-300">Stock (tons)</label>
                  <input id="stock" type="number" {...register('stock')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
                  {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock.message}</p>}
                </div>
                <div>
                  <label htmlFor="moq" className="block text-sm font-medium text-gray-300">MOQ (tons)</label>
                  <input id="moq" type="number" {...register('moq')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
                  {errors.moq && <p className="text-red-500 text-xs mt-1">{errors.moq.message}</p>}
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label htmlFor="packaging" className="block text-sm font-medium text-gray-300">Packaging</label>
                  <input id="packaging" {...register('packaging')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
                   {errors.packaging && <p className="text-red-500 text-xs mt-1">{errors.packaging.message}</p>}
                </div>
                <div>
                  <label htmlFor="shipping" className="block text-sm font-medium text-gray-300">Shipping Info</label>
                  <input id="shipping" {...register('shipping')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
                </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                  <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-300">Category</label>
                      <select id="category" {...register('category')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2">
                          <option value="">Select a category</option>
                          <option value="protein-feeds">Protein Feeds</option>
                          <option value="energy-feeds">Energy Feeds</option>
                          <option value="minerals">Minerals</option>
                          <option value="amino-acids">Amino Acids</option>
                          <option value="forage-products">Forage Products</option>
                          <option value="fiber-products">Fiber Products</option>
                      </select>
                      {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                  </div>
                   <div className="mt-4">
                      <label htmlFor="certifications" className="block text-sm font-medium text-gray-300">Certifications</label>
                      <input id="certifications" {...register('certifications')} placeholder="ISO 9001, Non-GMO" className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
                       <p className="text-xs text-gray-400 mt-1">Comma-separated values.</p>
                  </div>
                   <div className="flex items-center space-x-2 mt-4">
                        <input type="checkbox" id="featured" {...register('featured')} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"/>
                        <label htmlFor="featured" className="text-sm font-medium text-gray-300">
                            Feature this product
                        </label>
                    </div>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                  <label className="block text-sm font-medium text-gray-300">Product Image</label>
                  <div className="mt-2">
                      {featuredImage ? (
                          <div className="relative aspect-square w-full rounded-md overflow-hidden border-2 border-dashed border-gray-600">
                              <Image src={featuredImage} alt="Product Image" fill className="object-cover" />
                          </div>
                      ) : (
                          <div className="flex justify-center items-center aspect-square w-full border-2 border-gray-600 border-dashed rounded-md">
                              <ImageIcon className="h-12 w-12 text-gray-500" />
                          </div>
                      )}
                      <button 
                          type="button" 
                          onClick={() => setIsModalOpen(true)} 
                          className="mt-2 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center space-x-2 transition-colors"
                      >
                          <ImageIcon className="w-4 h-4" />
                          <span>{featuredImage ? 'Change Image' : 'Select Image'}</span>
                      </button>
                      {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images.message}</p>}
                  </div>
              </div>
          </div>
        </div>
      </form>
      <AssetSelectionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleImageSelect}
      />
    </>
  );
};
