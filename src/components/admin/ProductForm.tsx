
'use client';

import { NutritionIngredientOption, Product, ProductCategory } from '@/types';
import { Save, ImageIcon, AlertCircle, Star, Trash2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { AssetSelectionModal } from './AssetSelectionModal';
import Image from 'next/image';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { saveProduct } from '@/app/actions';
import { PRODUCT_STATUSES } from '@/data/feedProducts';
import { packLabel, pricePerTonne } from '@/lib/product-units';
import { useToast } from '../ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface ProductFormProps {
  product?: Product;
  categories: ProductCategory[];
  nutritionIngredients: NutritionIngredientOption[];
}

const ProductImageSchema = z.string().trim().refine(
  (value) => value.startsWith('/') || z.string().url().safeParse(value).success,
  'Enter a valid URL or site-relative image path.',
);

const ProductFormSchema = z.object({
  nutritionIngredientId: z.string().trim().min(1, 'Choose a Brazilian Tables ingredient.'),
  name: z.string().trim().min(1, 'Product name is required.'),
  searchTerms: z.string().max(2000).optional(),
  categoryId: z.string().trim().min(1, 'A category is required.'),
  description: z.string().trim().min(1, 'Description is required.'),
  status: z.enum(PRODUCT_STATUSES),
  animals: z.array(z.enum(['pigs', 'poultry', 'cattle', 'other'])).min(1, 'Choose at least one animal.'),
  gradeFallback: z.string().trim().min(1, 'A fallback grade is required.'),
  imageLabel: z.string().trim().min(1, 'An image label is required.'),
  origin: z.string().trim().min(1, 'Origin or supplier is required.'),
  packaging: z.string().min(1, 'Packaging information is required.'),
  packSizeKg: z.coerce.number().positive('Pack size must be greater than zero.'),
  price: z.coerce.number().min(0, 'Price cannot be negative.'),
  moqKg: z.coerce.number().positive('MOQ must be greater than zero.'),
  stock: z.coerce.number().min(0, 'Stock cannot be negative.'),
  images: z.array(ProductImageSchema).min(1, 'At least one image is required.'),
  certifications: z.string().optional(),
  shipping: z.string().optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
});

type FormValues = z.infer<typeof ProductFormSchema>;

export const ProductForm = ({ product, categories, nutritionIngredients }: ProductFormProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({
      resolver: zodResolver(ProductFormSchema),
      defaultValues: {
          nutritionIngredientId: product?.ingredientId || '',
          name: product?.ingredient?.name || '',
          searchTerms: product?.searchTerms.join(', ') || '',
          categoryId: product?.categoryId || '',
          description: product?.ingredient?.description || '',
          status: product?.status || 'Available to order',
          animals: product?.animals || [],
          gradeFallback: product?.gradeFallback || '',
          imageLabel: product?.imageLabel || '',
          origin: product?.origin || '',
          packSizeKg: product?.packSizeKg || 50,
          price: product?.price || 0,
          stock: product?.stock || 0,
          moqKg: product?.moqKg || 0,
          images: product?.images || [],
          packaging: product?.packaging || '',
          certifications: product?.certifications?.join(', ') || '',
          shipping: product?.shipping || '',
          featured: product?.featured || false,
          active: product?.active ?? true,
      }
  });

  const images = watch('images') || [];
  const [packSizeKg, packPrice] = [Number(watch('packSizeKg')), Number(watch('price'))];
  const packPriceHint = packSizeKg > 0 && packPrice > 0
    ? `$${packPrice.toFixed(2)} / ${packLabel(packSizeKg)} = $${pricePerTonne(packPrice, packSizeKg).toLocaleString('en-US', { minimumFractionDigits: 2 })} / tonne`
    : '';
  
  const onSubmit: SubmitHandler<FormValues> = async (data) => {
      setIsSubmitting(true);
      setServerError(null);

      const result = await saveProduct(
          data, 
          product?.id,
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
          const resultErrors = result.errors as Record<string, string[] | undefined> | undefined;
          const firstFieldError = resultErrors && Object.values(resultErrors).flatMap((messages) => messages || [])[0];
          const errorMsg = resultErrors?._server?.[0] || firstFieldError || 'An unknown error occurred.';
          setServerError(errorMsg);
      }
  };

  const handleImageSelect = (selectedImages: string[]) => {
    const currentImages = watch('images') || [];
    const newImages = [...currentImages, ...selectedImages];
    const uniqueImages = Array.from(new Set(newImages)); // Ensure no duplicates
    setValue('images', uniqueImages, { shouldValidate: true, shouldDirty: true });
    setIsModalOpen(false);
  };
  
  const setAsFeatured = (index: number) => {
    const currentImages = watch('images');
    if (index > 0 && index < currentImages.length) {
        const itemToMove = currentImages[index];
        const remainingItems = currentImages.filter((_, i) => i !== index);
        setValue('images', [itemToMove, ...remainingItems], { shouldValidate: true, shouldDirty: true });
    }
  };

  const removeImage = (index: number) => {
    const currentImages = watch('images');
    const newImages = currentImages.filter((_, i) => i !== index);
    setValue('images', newImages, { shouldValidate: true, shouldDirty: true });
  };

  const addImageUrl = () => {
    const value = imageUrl.trim();
    if (!value) return;
    const parsed = ProductImageSchema.safeParse(value);
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message || 'Invalid image URL.');
      return;
    }
    setValue('images', Array.from(new Set([...images, value])), { shouldValidate: true, shouldDirty: true });
    setImageUrl('');
    setServerError(null);
  };


  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex mb-4 justify-between items-center">
            <h1 className="text-2xl font-bold text-ash-100">
                {product ? 'Edit Product' : 'Add New Product'}
            </h1>
            <div className="flex justify-end space-x-3">
            <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-ash-600 hover:bg-ash-700 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-harvest-600 hover:bg-harvest-500 text-ash-950 rounded-lg flex items-center space-x-2 transition-colors disabled:bg-ash-500 disabled:cursor-not-allowed"
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
          <div className="lg:col-span-2 space-y-6 bg-ash-800/50 border border-ash-700 rounded-lg p-6">
            <div>
              <label htmlFor="nutritionIngredientId" className="block text-sm font-medium text-ash-300">Brazilian Tables ingredient</label>
              <select id="nutritionIngredientId" {...register('nutritionIngredientId')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2">
                <option value="">Select the technical ingredient record</option>
                {nutritionIngredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name} · {ingredient.sourceTable || ingredient.category}</option>)}
              </select>
              {errors.nutritionIngredientId && <p className="text-red-500 text-xs mt-1">{errors.nutritionIngredientId.message}</p>}
              <p className="text-xs text-ash-400 mt-1">Nutrition and provenance are read from the versioned JSON library; commercial fields below remain editable here.</p>
            </div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ash-300">Product Name</label>
              <input id="name" {...register('name')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              {product && <p className="text-xs text-ash-400 mt-1">Record ID: {product.id}</p>}
            </div>
            <div>
              <label htmlFor="searchTerms" className="block text-sm font-medium text-ash-300">Alternative search terms</label>
              <input id="searchTerms" {...register('searchTerms')} placeholder="soya, soyabean meal, sbm" className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2" />
              {errors.searchTerms && <p className="text-red-500 text-xs mt-1">{errors.searchTerms.message}</p>}
              <p className="text-xs text-ash-400 mt-1">Comma-separated customer names and industry abbreviations.</p>
            </div>
            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-ash-300">FeedZ category</label>
              <select id="categoryId" {...register('categoryId')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2">
                <option value="">Select a category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-ash-300">Description</label>
              <textarea id="description" rows={5} {...register('description')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2" />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
            </div>
            <hr className="border-ash-600"/>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-ash-300">Availability</label>
                <select id="status" {...register('status')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2">
                  {PRODUCT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="origin" className="block text-sm font-medium text-ash-300">Origin / supplier</label>
                <input id="origin" {...register('origin')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2" />
                {errors.origin && <p className="text-red-500 text-xs mt-1">{errors.origin.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="gradeFallback" className="block text-sm font-medium text-ash-300">Fallback grade</label>
                <input id="gradeFallback" {...register('gradeFallback')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2" />
                {errors.gradeFallback && <p className="text-red-500 text-xs mt-1">{errors.gradeFallback.message}</p>}
              </div>
              <div>
                <label htmlFor="imageLabel" className="block text-sm font-medium text-ash-300">Image label</label>
                <input id="imageLabel" {...register('imageLabel')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2" />
                {errors.imageLabel && <p className="text-red-500 text-xs mt-1">{errors.imageLabel.message}</p>}
              </div>
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-ash-300">Suitable for</legend>
              <div className="mt-2 flex flex-wrap gap-4">
                {[['pigs', 'Pigs'], ['poultry', 'Poultry'], ['cattle', 'Cattle'], ['other', 'Other livestock']].map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-ash-300">
                    <input type="checkbox" value={value} {...register('animals')} className="h-4 w-4 rounded border-ash-600 bg-ash-700 text-harvest-600" />
                    {label}
                  </label>
                ))}
              </div>
              {errors.animals && <p className="text-red-500 text-xs mt-1">{errors.animals.message}</p>}
            </fieldset>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label htmlFor="packSizeKg" className="block text-sm font-medium text-ash-300">Pack size (kg)</label>
                  <input id="packSizeKg" type="number" step="any" {...register('packSizeKg')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2"/>
                  <p className="text-ash-500 text-xs mt-1">Smallest quantity sold, e.g. 50 for a 50 kg bag; 1000 for bulk per tonne.</p>
                  {errors.packSizeKg && <p className="text-red-500 text-xs mt-1">{errors.packSizeKg.message}</p>}
                </div>
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-ash-300">Price per pack ($)</label>
                  <input id="price" type="number" step="0.01" {...register('price')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2"/>
                  {packPriceHint && <p className="text-ash-500 text-xs mt-1">{packPriceHint}</p>}
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
                </div>
                <div>
                  <label htmlFor="stock" className="block text-sm font-medium text-ash-300">Stock (tons)</label>
                  <input id="stock" type="number" step="any" {...register('stock')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2"/>
                  {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock.message}</p>}
                </div>
                <div>
                  <label htmlFor="moqKg" className="block text-sm font-medium text-ash-300">MOQ (kg)</label>
                  <input id="moqKg" type="number" step="any" {...register('moqKg')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2"/>
                  {errors.moqKg && <p className="text-red-500 text-xs mt-1">{errors.moqKg.message}</p>}
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label htmlFor="packaging" className="block text-sm font-medium text-ash-300">Packaging</label>
                  <input id="packaging" {...register('packaging')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2"/>
                   {errors.packaging && <p className="text-red-500 text-xs mt-1">{errors.packaging.message}</p>}
                </div>
                <div>
                  <label htmlFor="shipping" className="block text-sm font-medium text-ash-300">Shipping Info</label>
                  <input id="shipping" {...register('shipping')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2"/>
                </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
              <div className="bg-ash-800/50 border border-ash-700 rounded-lg p-6">
                   <div className="mt-4">
                      <label htmlFor="certifications" className="block text-sm font-medium text-ash-300">Certifications</label>
                      <input id="certifications" {...register('certifications')} placeholder="Feed grade certificate, Non-GMO" className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2"/>
                       <p className="text-xs text-ash-400 mt-1">Comma-separated values.</p>
                  </div>
                   <div className="flex items-center space-x-2 mt-4">
                        <input type="checkbox" id="featured" {...register('featured')} className="h-4 w-4 rounded border-ash-600 bg-ash-700 text-harvest-600 focus:ring-harvest-500"/>
                        <label htmlFor="featured" className="text-sm font-medium text-ash-300">
                            Feature this product
                        </label>
                    </div>
                    <div className="flex items-center space-x-2 mt-4">
                        <input type="checkbox" id="active" {...register('active')} className="h-4 w-4 rounded border-ash-600 bg-ash-700 text-harvest-600 focus:ring-harvest-500"/>
                        <label htmlFor="active" className="text-sm font-medium text-ash-300">Visible in the public catalogue</label>
                    </div>
              </div>
              <div className="bg-ash-800/50 border border-ash-700 rounded-lg p-6">
                  <label className="block text-sm font-medium text-ash-300">Product Images</label>
                  <div className="mt-2 space-y-4">
                      {images.length > 0 ? (
                        <>
                          <div className="relative aspect-square w-full rounded-md overflow-hidden border-2 border-harvest-500">
                            <Image src={images[0]} alt="Featured Product Image" fill className="object-cover" />
                            <div className="absolute top-1 right-1 bg-harvest-600 text-ash-950 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                <Star className="w-3 h-3"/> Featured
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                             {images.slice(1).map((image, index) => (
                                <div key={image} className="relative group aspect-square">
                                    <Image src={image} alt={`Product image ${index + 2}`} fill className="object-cover rounded-md"/>
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                        <button type="button" onClick={() => setAsFeatured(index + 1)} className="p-1.5 bg-yellow-500 text-ash-100 rounded-full hover:bg-yellow-400" title="Set as featured">
                                            <Star className="w-3 h-3"/>
                                        </button>
                                        <button type="button" onClick={() => removeImage(index + 1)} className="p-1.5 bg-red-600 text-ash-100 rounded-full hover:bg-red-500" title="Remove image">
                                            <Trash2 className="w-3 h-3"/>
                                        </button>
                                    </div>
                                </div>
                             ))}
                          </div>
                        </>
                      ) : (
                          <div className="flex justify-center items-center aspect-square w-full border-2 border-ash-600 border-dashed rounded-md">
                              <ImageIcon className="h-12 w-12 text-ash-500" />
                          </div>
                      )}
                      <button 
                          type="button" 
                          onClick={() => setIsModalOpen(true)} 
                          className="mt-2 w-full px-4 py-2 bg-ash-700 hover:bg-ash-600 text-ash-100 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                      >
                          <ImageIcon className="w-4 h-4" />
                          <span>{images.length > 0 ? 'Add More' : 'Select'} Images</span>
                      </button>
                      <div className="flex gap-2">
                        <input
                          value={imageUrl}
                          onChange={(event) => setImageUrl(event.target.value)}
                          placeholder="https://… or /images/…"
                          className="min-w-0 flex-1 bg-ash-700 border-ash-600 rounded-md p-2 text-sm"
                        />
                        <button type="button" onClick={addImageUrl} className="p-2 bg-ash-700 hover:bg-ash-600 rounded-md" aria-label="Add image URL">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
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
        multiple={true}
      />
    </>
  );
};
