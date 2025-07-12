
'use client';

import { Product, ProductCategory, Composition, Nutrient, Ingredient } from '@/types';
import { Save, ImageIcon, AlertCircle, Sparkles, Loader2, Star, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { AssetSelectionModal } from './AssetSelectionModal';
import Image from 'next/image';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { saveProduct, getProductSuggestions, getProductCategories, getAllIngredients } from '@/app/actions';
import { useToast } from '../ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { getNutrients } from '@/data/nutrients';

interface ProductFormProps {
  product?: Product;
}

const IngredientFormSchema = z.object({
  name: z.string().min(1, 'Ingredient name is required.'),
  category: z.string().min(1, 'Category is required.'),
  description: z.string().min(1, 'Description is required.'),
  key_benefits: z.string().optional(),
  applications: z.string().optional(),
});

const ProductFormSchema = z.object({
  ingredientId: z.string().optional(),
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [allNutrients, setAllNutrients] = useState<Nutrient[]>([]);
  const [aiCompositions, setAiCompositions] = useState<Omit<Composition, 'nutrient'>[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | undefined>(product?.ingredientId);


  useEffect(() => {
    async function fetchData() {
      const [fetchedCategories, fetchedNutrients, fetchedIngredients] = await Promise.all([
        getProductCategories(),
        getNutrients(),
        getAllIngredients(),
      ]);
      setCategories(fetchedCategories);
      setAllNutrients(fetchedNutrients);
      setAllIngredients(fetchedIngredients);
    }
    fetchData();
  }, []);

  const combinedSchema = ProductFormSchema.merge(IngredientFormSchema);

  const { register, handleSubmit, formState: { errors }, setValue, watch, getValues, reset } = useForm<FormValues>({
      resolver: zodResolver(combinedSchema),
      defaultValues: {
          name: product?.ingredient?.name || '',
          category: product?.ingredient?.category || '',
          description: product?.ingredient?.description || '',
          key_benefits: product?.ingredient?.key_benefits?.join(', ') || '',
          applications: product?.ingredient?.applications?.join(', ') || '',
          price: product?.price || 0,
          stock: product?.stock || 0,
          moq: product?.moq || 0,
          images: product?.images || [],
          packaging: product?.packaging || '',
          certifications: product?.certifications?.join(', ') || '',
          shipping: product?.shipping || '',
          featured: product?.featured || false,
          ingredientId: product?.ingredientId || undefined,
      }
  });

  const images = watch('images') || [];
  const ingredientId = watch('ingredientId');
  const isIngredientSelected = !!ingredientId;

  const handleIngredientChange = (id: string) => {
    setSelectedIngredientId(id);
    const selectedIng = allIngredients.find(ing => ing.id === id);
    if (selectedIng) {
        reset({
            ...getValues(), // keep other product values
            ingredientId: selectedIng.id,
            name: selectedIng.name,
            description: selectedIng.description,
            category: selectedIng.category,
            key_benefits: selectedIng.key_benefits?.join(', '),
            applications: selectedIng.applications?.join(', '),
        });
    } else {
        // Clear fields if "None" is selected
        reset({
            ...getValues(),
            ingredientId: undefined,
            name: '',
            description: '',
            category: '',
            key_benefits: '',
            applications: '',
        });
    }
  };


  const handleAiGeneration = async () => {
    const productName = getValues('name');
    if (!productName) {
      toast({
        title: "Product Name Required",
        description: "Please enter a product name before generating details.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setServerError(null);

    try {
      const result = await getProductSuggestions({ productName });
      setValue('description', result.description, { shouldValidate: true });
      setValue('category', result.category, { shouldValidate: true });
      setValue('key_benefits', result.keyBenefits.join(', '), { shouldValidate: true });
      setValue('applications', result.applications.join(', '), { shouldValidate: true });
      setValue('packaging', result.suggestedPackaging, { shouldValidate: true });

      const nutrientMap = new Map(allNutrients.map(n => [n.name.toLowerCase(), n.id]));
      const compositionsToStore = result.compositions
        .map(comp => {
            const nutrientId = nutrientMap.get(comp.nutrientName.toLowerCase());
            if (nutrientId) {
                return { nutrientId, value: comp.value };
            }
            return null;
        })
        .filter((c): c is Omit<Composition, 'nutrient'> => c !== null);

      setAiCompositions(compositionsToStore);

      toast({
        title: "AI Suggestions Applied",
        description: "The generated product details have been filled into the form.",
      });
    } catch (error) {
      console.error("AI Generation failed", error);
      setServerError("Failed to generate AI suggestions. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
      setIsSubmitting(true);
      setServerError(null);

      const { name, category, description, key_benefits, applications, ...productData } = data;
      const ingredientData = { 
        name, 
        category, 
        description,
        key_benefits: key_benefits,
        applications: applications,
      };

      const result = await saveProduct(
          productData, 
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

  const handleImageSelect = (selectedImages: string[]) => {
    const currentImages = getValues('images') || [];
    const newImages = [...currentImages, ...selectedImages];
    const uniqueImages = Array.from(new Set(newImages)); // Ensure no duplicates
    setValue('images', uniqueImages, { shouldValidate: true, shouldDirty: true });
    setIsModalOpen(false);
  };
  
  const setAsFeatured = (index: number) => {
    const currentImages = getValues('images');
    if (index > 0 && index < currentImages.length) {
        const itemToMove = currentImages[index];
        const remainingItems = currentImages.filter((_, i) => i !== index);
        setValue('images', [itemToMove, ...remainingItems], { shouldValidate: true, shouldDirty: true });
    }
  };

  const removeImage = (index: number) => {
    const currentImages = getValues('images');
    const newImages = currentImages.filter((_, i) => i !== index);
    setValue('images', newImages, { shouldValidate: true, shouldDirty: true });
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
              <label htmlFor="ingredientId" className="block text-sm font-medium text-gray-300">Select Ingredient (Optional)</label>
              <select 
                id="ingredientId"
                {...register('ingredientId')}
                onChange={(e) => handleIngredientChange(e.target.value)}
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"
              >
                  <option value="">-- Create New Ingredient --</option>
                  {allIngredients.map(ing => (
                      <option key={ing.id} value={ing.id}>{ing.name}</option>
                  ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Select an existing ingredient to link to, or leave blank to create a new one.</p>
            </div>
            <hr className="border-gray-600"/>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">Ingredient Name</label>
              <div className="flex items-center gap-2 mt-1">
                <input id="name" {...register('name')} readOnly={isIngredientSelected} className={`block w-full bg-gray-700 border-gray-600 rounded-md p-2 ${isIngredientSelected ? 'bg-gray-800' : ''}`}/>
                <button 
                  type="button" 
                  onClick={handleAiGeneration}
                  disabled={isGenerating || isIngredientSelected}
                  className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                  <span>Generate</span>
                </button>
              </div>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
              <textarea id="description" rows={4} {...register('description')} readOnly={isIngredientSelected} className={`mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 ${isIngredientSelected ? 'bg-gray-800' : ''}`}/>
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
            </div>
            
             <div>
              <label htmlFor="key_benefits" className="block text-sm font-medium text-gray-300">Key Benefits</label>
              <input id="key_benefits" {...register('key_benefits')} readOnly={isIngredientSelected} placeholder="Benefit 1, Benefit 2,..." className={`mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 ${isIngredientSelected ? 'bg-gray-800' : ''}`}/>
              <p className="text-xs text-gray-400 mt-1">Comma-separated values.</p>
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
                      <select id="category" {...register('category')} disabled={isIngredientSelected} className={`mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 ${isIngredientSelected ? 'bg-gray-800 disabled:cursor-not-allowed' : ''}`}>
                          <option value="">Select a category</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.slug}>{cat.name}</option>
                          ))}
                      </select>
                      {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                  </div>
                   <div className="mt-4">
                        <label htmlFor="applications" className="block text-sm font-medium text-gray-300">Applications</label>
                        <input id="applications" {...register('applications')} readOnly={isIngredientSelected} placeholder="Poultry, Swine,..." className={`mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 ${isIngredientSelected ? 'bg-gray-800' : ''}`}/>
                        <p className="text-xs text-gray-400 mt-1">Comma-separated values.</p>
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
                  <label className="block text-sm font-medium text-gray-300">Product Images</label>
                  <div className="mt-2 space-y-4">
                      {images.length > 0 ? (
                        <>
                          <div className="relative aspect-square w-full rounded-md overflow-hidden border-2 border-indigo-500">
                            <Image src={images[0]} alt="Featured Product Image" fill className="object-cover" />
                            <div className="absolute top-1 right-1 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                <Star className="w-3 h-3"/> Featured
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                             {images.slice(1).map((image, index) => (
                                <div key={image} className="relative group aspect-square">
                                    <Image src={image} alt={`Product image ${index + 2}`} fill className="object-cover rounded-md"/>
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                        <button type="button" onClick={() => setAsFeatured(index + 1)} className="p-1.5 bg-yellow-500 text-white rounded-full hover:bg-yellow-400" title="Set as featured">
                                            <Star className="w-3 h-3"/>
                                        </button>
                                        <button type="button" onClick={() => removeImage(index + 1)} className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-500" title="Remove image">
                                            <Trash2 className="w-3 h-3"/>
                                        </button>
                                    </div>
                                </div>
                             ))}
                          </div>
                        </>
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
                          <span>{images.length > 0 ? 'Add More' : 'Select'} Images</span>
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
        multiple={true}
      />
    </>
  );
};
