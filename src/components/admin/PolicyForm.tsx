
'use client';

import { Policy } from '@/types';
import { Save, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { savePolicy } from '@/app/actions';
import { useToast } from '../ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface PolicyFormProps {
  policy?: Policy;
}

const PolicyFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

type FormValues = z.infer<typeof PolicyFormSchema>;

export const PolicyForm = ({ policy }: PolicyFormProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(PolicyFormSchema),
    defaultValues: {
      title: policy?.title || '',
      content: policy?.content || '',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    setServerError(null);

    const result = await savePolicy(data, policy?.id);

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: 'Success!',
        description: `Policy has been ${policy ? 'updated' : 'published'}.`,
      });
      router.push('/admin/policies');
      router.refresh();
    } else {
      if (result.error) {
        setServerError(result.error);
      } else {
         setServerError('An unknown error occurred.');
      }
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex mb-4 justify-between items-center">
            <h1 className="text-2xl font-bold text-ash-100">
                {policy ? 'Edit Policy' : 'Create New Policy'}
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
                <span>{isSubmitting ? 'Saving...' : (policy ? 'Save Changes' : 'Publish Policy')}</span>
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
        
        <div className="space-y-6 bg-ash-800/50 border border-ash-700 rounded-lg p-6">
            <div>
            <label htmlFor="title" className="block text-sm font-medium text-ash-300">
                Policy Title
            </label>
            <input
                id="title"
                type="text"
                {...register('title')}
                className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md shadow-sm focus:ring-harvest-500 focus:border-harvest-500 sm:text-sm p-2"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
            <div>
            <label htmlFor="content" className="block text-sm font-medium text-ash-300 mb-2">
                Policy Content (Markdown)
            </label>
            <textarea
                id="content"
                rows={15}
                {...register('content')}
                className="mt-1 block w-full bg-ash-900 border-ash-600 rounded-md shadow-sm focus:ring-harvest-500 focus:border-harvest-500 sm:text-sm p-2 font-mono"
                placeholder="Write your policy content using Markdown..."
            />
            {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>}
            <a
                href="https://www.markdownguide.org/basic-syntax/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-ash-400 hover:text-harvest-400 mt-2 inline-block"
            >
                Markdown syntax guide
            </a>
            </div>
        </div>
      </form>
    </>
  );
};
