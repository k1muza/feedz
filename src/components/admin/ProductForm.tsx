'use client';

import { Product } from '@/types';
import { Save, Upload, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { AssetSelectionModal } from './AssetSelectionModal';
import Image from 'next/image';

interface ProductFormProps {
  product?: Product;
}

type FormValues = {
    name: string;
    category: string;
    description: string;
    price: number;
    stock: number;
    moq: number;
    image: string; // Changed to a single image URL
};

export const ProductForm = ({ product }: ProductFormProps) => {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({
      defaultValues: {
          name: product?.ingredient?.name || '',
          category: product?.ingredient?.category || '',
          description: product?.ingredient?.description || '',
          price: product?.price || 0,
          stock: product?.stock || 0,
          moq: product?.moq || 0,
          image: product?.images?.[0] || '', // Use first image as default
      }
  });

  const featuredImage = watch('image');

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log(data);
    // In a real app, you would transform data.image back into an array if needed
    // e.g., { ...data, images: [data.image] }
    router.push('/admin/products');
  };

  const handleImageSelect = (imageSrc: string) => {
    setValue('image', imageSrc, { shouldValidate: true });
    setIsModalOpen(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Main Details */}
          <div className="lg:col-span-2 space-y-6 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">Product Name</label>
              <input
                id="name"
                type="text"
                {...register('name', { required: 'Product name is required' })}
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
              <textarea
                id="description"
                rows={4}
                {...register('description')}
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-300">Price ($/ton)</label>
                  <input
                    id="price"
                    type="number"
                    {...register('price', { required: true, valueAsNumber: true })}
                    className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  />
                </div>
                <div>
                  <label htmlFor="stock" className="block text-sm font-medium text-gray-300">Stock (tons)</label>
                  <input
                    id="stock"
                    type="number"
                    {...register('stock', { required: true, valueAsNumber: true })}
                    className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  />
                </div>
                <div>
                  <label htmlFor="moq" className="block text-sm font-medium text-gray-300">MOQ (tons)</label>
                  <input
                    id="moq"
                    type="number"
                    {...register('moq', { required: true, valueAsNumber: true })}
                    className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  />
                </div>
            </div>
          </div>

          {/* Right Column: Category and Media */}
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                  <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-300">Category</label>
                      <select
                          id="category"
                          {...register('category', { required: 'Category is required' })}
                          className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                      >
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
                  </div>
              </div>
          </div>
        </div>
        
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
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{product ? 'Save Changes' : 'Create Product'}</span>
          </button>
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
