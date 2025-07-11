
'use client';

import { BlogPost } from '@/types';
import { Save, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { AssetSelectionModal } from './AssetSelectionModal';
import Image from 'next/image';

interface BlogPostFormProps {
  post?: BlogPost;
}

type FormValues = {
  title: string;
  category: string;
  excerpt: string;
  content: string;
  image: string;
};

export const BlogPostForm = ({ post }: BlogPostFormProps) => {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      title: post?.title || '',
      category: post?.category || '',
      excerpt: post?.excerpt || '',
      content: post?.content || '',
      image: post?.image || '',
    },
  });

  const featuredImage = watch('image');

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log(data);
    // Here you would typically call an API to save the data
    router.push('/admin/blog');
  };

  const handleImageSelect = (imageSrc: string) => {
    setValue('image', imageSrc);
    setIsModalOpen(false);
  };


  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300">Post Title</label>
              <input
                id="title"
                type="text"
                {...register('title', { required: 'Post title is required' })}
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">Post Content (Markdown)</label>
              <textarea
                id="content"
                rows={15}
                {...register('content', { required: 'Content is required.' })}
                className="mt-1 block w-full bg-gray-900 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 font-mono"
                placeholder="Write your blog post content using Markdown..."
              />
              {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>}
              <a href="https://www.markdownguide.org/basic-syntax/" target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-indigo-400 mt-2 inline-block">
                Markdown syntax guide
              </a>
          </div>
        </div>

        {/* Right Column: Meta */}
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
                <option value="Nutrition">Nutrition</option>
                <option value="Economics">Economics</option>
                <option value="Safety">Safety</option>
                <option value="Innovation">Innovation</option>
                <option value="Research">Research</option>
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
            </div>
             <div className='mt-6'>
                <label htmlFor="excerpt" className="block text-sm font-medium text-gray-300">Excerpt</label>
                <textarea
                  id="excerpt"
                  rows={3}
                  {...register('excerpt')}
                  className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                />
              </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <label className="block text-sm font-medium text-gray-300">Featured Image</label>
            <div className="mt-2">
                {featuredImage ? (
                    <div className="relative aspect-video w-full rounded-md overflow-hidden border-2 border-dashed border-gray-600">
                        <Image src={featuredImage} alt="Featured Image" fill className="object-cover" />
                    </div>
                ) : (
                    <div className="flex justify-center items-center aspect-video w-full border-2 border-gray-600 border-dashed rounded-md">
                        <ImageIcon className="h-12 w-12 text-gray-500" />
                    </div>
                )}
                 <button type="button" onClick={() => setIsModalOpen(true)} className="mt-2 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center space-x-2 transition-colors">
                    <ImageIcon className="w-4 h-4" />
                    <span>{featuredImage ? 'Change' : 'Select'} Image</span>
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
          <span>{post ? 'Save Changes' : 'Publish Post'}</span>
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
