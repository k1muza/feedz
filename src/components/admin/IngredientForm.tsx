
'use client';

import { Ingredient, ProductCategory } from '@/types';
import { Save, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { saveIngredient, getProductSuggestions, getProductCategories } from '@/app/actions';
import { useToast } from '../ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface IngredientFormProps {
  ingredient?: Ingredient;
}

const IngredientFormSchema = z.object({
  name: z.string().min(1, 'Ingredient name is required.'),
  category: z.string().min(1, 'Category is required.'),
  description: z.string().min(1, 'Description is required.'),
  key_benefits: z.string().optional(),
  applications: z.string().optional(),
});

type FormValues = z.infer<typeof IngredientFormSchema>;

export const IngredientForm = ({ ingredient }: IngredientFormProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  useEffect(() => {
    async function fetchData() {
      const fetchedCategories = await getProductCategories();
      setCategories(fetchedCategories);
    }
    fetchData();
  }, []);

  const { register, handleSubmit, formState: { errors }, setValue, getValues, reset } = useForm<FormValues>({
      resolver: zodResolver(IngredientFormSchema),
      defaultValues: {
          name: ingredient?.name || '',
          category: ingredient?.category || '',
          description: ingredient?.description || '',
          key_benefits: ingredient?.key_benefits?.join(', ') || '',
          applications: ingredient?.applications?.join(', ') || '',
      }
  });

  const handleAiGeneration = async () => {
    const productName = getValues('name');
    if (!productName) {
      toast({
        title: "Ingredient Name Required",
        description: "Please enter an ingredient name before generating details.",
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

      toast({
        title: "AI Suggestions Applied",
        description: "The generated ingredient details have been filled into the form.",
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

      const result = await saveIngredient(data, ingredient?.id);

      setIsSubmitting(false);

      if (result.success) {
          toast({
              title: 'Success!',
              description: `Ingredient ${ingredient ? 'updated' : 'created'} successfully.`,
          });
          router.push('/admin/ingredients');
          router.refresh();
      } else {
          const errorMsg = result.errors?._server?.[0] || 'An unknown error occurred.';
          setServerError(errorMsg);
      }
  };


  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Server Error</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300">Ingredient Name</label>
          <div className="flex items-center gap-2 mt-1">
            <input id="name" {...register('name')} className="block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
            <button 
              type="button" 
              onClick={handleAiGeneration}
              disabled={isGenerating}
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
          <textarea id="description" rows={4} {...register('description')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
        </div>
        
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-300">Category</label>
          <select id="category" {...register('category')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2">
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>{cat.name}</option>
              ))}
          </select>
          {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
        </div>

         <div>
          <label htmlFor="key_benefits" className="block text-sm font-medium text-gray-300">Key Benefits</label>
          <input id="key_benefits" {...register('key_benefits')} placeholder="Benefit 1, Benefit 2,..." className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
          <p className="text-xs text-gray-400 mt-1">Comma-separated values.</p>
        </div>
        
        <div>
            <label htmlFor="applications" className="block text-sm font-medium text-gray-300">Applications</label>
            <input id="applications" {...register('applications')} placeholder="Poultry, Swine,..." className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"/>
            <p className="text-xs text-gray-400 mt-1">Comma-separated values.</p>
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
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : (ingredient ? 'Save Changes' : 'Create Ingredient')}</span>
        </button>
        </div>
      </form>
    </>
  );
};
