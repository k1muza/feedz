
'use client';

import { BlogPost } from '@/types';
import { Save, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import 'react-quill/dist/quill.snow.css'; // import styles
import dynamic from 'next/dynamic';
import { useRef } from 'react';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill');
    // eslint-disable-next-line react/display-name
    return ({ forwardedRef, ...props }: any) => <RQ ref={forwardedRef} {...props} />;
  },
  { ssr: false }
);


interface BlogPostFormProps {
  post?: BlogPost;
}

type FormValues = {
  title: string;
  category: string;
  excerpt: string;
  content: string;
};

export const BlogPostForm = ({ post }: BlogPostFormProps) => {
  const router = useRouter();
  const quillRef = useRef(null);

  const { register, handleSubmit, formState: { errors }, control } = useForm<FormValues>({
    defaultValues: {
      title: post?.title || '',
      category: post?.category || '',
      excerpt: post?.excerpt || '',
      content: post?.content || '',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log(data);
    // Here you would typically call an API to save the data
    // For now, we'll just log it and redirect
    router.push('/admin/blog');
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  return (
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Post Content</label>
               <div className="bg-white text-black rounded-md">
                 <Controller
                    name="content"
                    control={control}
                    render={({ field }) => (
                        <ReactQuill
                            forwardedRef={quillRef}
                            theme="snow"
                            value={field.value}
                            onChange={field.onChange}
                            modules={quillModules}
                        />
                    )}
                 />
              </div>
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
            <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-500" />
                <div className="flex text-sm text-gray-400">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-700 rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-indigo-500 px-1">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
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
  );
};
