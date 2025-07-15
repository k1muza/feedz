
'use client';

import { BlogCategory, BlogPost, User } from '@/types';
import { Save, ImageIcon, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { AssetSelectionModal } from './AssetSelectionModal';
import Image from 'next/image';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { saveBlogPost, getBlogCategories, getAllUsers } from '@/app/actions';
import { useToast } from '../ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface BlogPostFormProps {
  post?: BlogPost;
}

const BlogFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.string().min(1, 'Category is required'),
  excerpt: z.string().min(1, 'Excerpt is required'),
  content: z.string().min(1, 'Content is required'),
  image: z.string().url('A valid featured image URL is required'),
  tags: z.string().optional(),
  authorId: z.string().min(1, 'Author is required'),
});

type FormValues = z.infer<typeof BlogFormSchema>;

export const BlogPostForm = ({ post }: BlogPostFormProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(BlogFormSchema),
    defaultValues: post ? {
        title: post.title,
        category: post.category,
        excerpt: post.excerpt,
        content: post.content,
        image: post.image,
        tags: post.tags?.join(', '),
        authorId: '', // Will be set in useEffect
    } : {},
  });

  useEffect(() => {
    async function fetchData() {
      const [fetchedCategories, fetchedUsers] = await Promise.all([
        getBlogCategories(),
        getAllUsers(),
      ]);
      setCategories(fetchedCategories);
      setUsers(fetchedUsers);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (post && users.length > 0) {
      const author = users.find(u => u.name === post.author.name);
      reset({
        title: post.title,
        category: post.category,
        excerpt: post.excerpt,
        content: post.content,
        image: post.image,
        tags: post.tags?.join(', '),
        authorId: author?.id || '',
      });
    }
  }, [post, users, reset]);

  const featuredImage = watch('image');

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    setServerError(null);

    const result = await saveBlogPost(data, post?.id);

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: 'Success!',
        description: `Post has been ${post ? 'updated' : 'published'}.`,
      });
      router.push('/admin/blog');
      router.refresh();
    } else {
      // Handle server-side validation errors if any
      if (result.errors) {
        // You can enhance this part to set individual field errors with setError
        setServerError(Object.values(result.errors).flat().join(', '));
      } else {
         setServerError('An unknown error occurred.');
      }
    }
  };

  const handleImageSelect = (imageSrc: string[]) => {
    if (imageSrc.length > 0) {
        setValue('image', imageSrc[0], { shouldDirty: true, shouldValidate: true });
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex mb-4 justify-between items-center">
            <h1 className="text-2xl font-bold text-white">
                {post ? 'Edit Blog Post' : 'Create New Blog Post'}
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
                <span>{isSubmitting ? 'Saving...' : (post ? 'Save Changes' : 'Publish Post')}</span>
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
          {/* Left Column: Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300">
                  Post Title
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title')}
                  className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">
                Post Content (Markdown)
              </label>
              <textarea
                id="content"
                rows={15}
                {...register('content')}
                className="mt-1 block w-full bg-gray-900 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 font-mono"
                placeholder="Write your blog post content using Markdown..."
              />
              {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>}
              <a
                href="https://www.markdownguide.org/basic-syntax/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-gray-400 hover:text-indigo-400 mt-2 inline-block"
              >
                Markdown syntax guide
              </a>
            </div>
          </div>

          {/* Right Column: Meta */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div>
                <label htmlFor="authorId" className="block text-sm font-medium text-gray-300">
                  Author
                </label>
                <select
                  id="authorId"
                  {...register('authorId')}
                  className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                >
                  <option value="">Select an author</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
                {errors.authorId && (
                  <p className="text-red-500 text-xs mt-1">{errors.authorId.message}</p>
                )}
              </div>
              <div className="mt-6">
                <label htmlFor="category" className="block text-sm font-medium text-gray-300">
                  Category
                </label>
                <select
                  id="category"
                  {...register('category')}
                  className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>
                )}
              </div>
              <div className="mt-6">
                <label htmlFor="excerpt" className="block text-sm font-medium text-gray-300">
                  Excerpt
                </label>
                <textarea
                  id="excerpt"
                  rows={3}
                  {...register('excerpt')}
                  className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                />
                {errors.excerpt && (
                  <p className="text-red-500 text-xs mt-1">{errors.excerpt.message}</p>
                )}
              </div>
              <div className="mt-6">
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-300">
                      Tags
                  </label>
                  <input
                      id="tags"
                      type="text"
                      {...register('tags')}
                      className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                      placeholder="e.g. poultry, lysine, cost-saving"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                      Separate tags with a comma.
                  </p>
                  {errors.tags && <p className="text-red-500 text-xs mt-1">{errors.tags.message}</p>}
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
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="mt-2 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{featuredImage ? 'Change' : 'Select'} Image</span>
                </button>
                 {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image.message}</p>}
              </div>
            </div>
          </div>
        </div>
      </form>

      <AssetSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleImageSelect}
        multiple={false}
      />
    </>
  );
};
