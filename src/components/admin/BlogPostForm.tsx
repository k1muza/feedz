
'use client';

import { BlogPost } from '@/types';
import { Save, Heading1, Heading2, Heading3, Bold, Italic, Strikethrough, List, ListOrdered, Quote, Minus, Undo, Redo } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Toggle } from '@/components/ui/toggle';

interface BlogPostFormProps {
  post?: BlogPost;
}

type FormValues = {
  title: string;
  category: string;
  excerpt: string;
  content: string;
};

const TiptapToolbar = ({ editor }: { editor: any | null }) => {
  if (!editor) {
    return null
  }

  return (
    <div className="border-t border-x border-gray-700 bg-gray-800 rounded-t-md p-1 flex flex-wrap items-center gap-1">
      <Toggle
        size="sm"
        pressed={editor.isActive('heading', { level: 1 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className="text-gray-400 hover:bg-gray-700 data-[state=on]:bg-indigo-600 data-[state=on]:text-white"
      >
        <Heading1 className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('heading', { level: 2 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className="text-gray-400 hover:bg-gray-700 data-[state=on]:bg-indigo-600 data-[state=on]:text-white"
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>
       <Toggle
        size="sm"
        pressed={editor.isActive('heading', { level: 3 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className="text-gray-400 hover:bg-gray-700 data-[state=on]:bg-indigo-600 data-[state=on]:text-white"
      >
        <Heading3 className="h-4 w-4" />
      </Toggle>
      
      <div className="w-px h-6 bg-gray-600 mx-1"></div>

      <Toggle
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        className="text-gray-400 hover:bg-gray-700 data-[state=on]:bg-indigo-600 data-[state=on]:text-white"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        className="text-gray-400 hover:bg-gray-700 data-[state=on]:bg-indigo-600 data-[state=on]:text-white"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
       <Toggle
        size="sm"
        pressed={editor.isActive('strike')}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        className="text-gray-400 hover:bg-gray-700 data-[state=on]:bg-indigo-600 data-[state=on]:text-white"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-gray-600 mx-1"></div>

      <Toggle
        size="sm"
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        className="text-gray-400 hover:bg-gray-700 data-[state=on]:bg-indigo-600 data-[state=on]:text-white"
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        className="text-gray-400 hover:bg-gray-700 data-[state=on]:bg-indigo-600 data-[state=on]:text-white"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
       <Toggle
        size="sm"
        pressed={editor.isActive('blockquote')}
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        className="text-gray-400 hover:bg-gray-700 data-[state=on]:bg-indigo-600 data-[state=on]:text-white"
      >
        <Quote className="h-4 w-4" />
      </Toggle>
       <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="p-2 text-gray-400 hover:bg-gray-700 hover:text-white rounded-md"
      >
        <Minus className="h-4 w-4" />
      </button>

       <div className="w-px h-6 bg-gray-600 mx-1"></div>

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 text-gray-400 hover:bg-gray-700 hover:text-white rounded-md disabled:opacity-50"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 text-gray-400 hover:bg-gray-700 hover:text-white rounded-md disabled:opacity-50"
        >
          <Redo className="h-4 w-4" />
        </button>
    </div>
  )
}


export const BlogPostForm = ({ post }: BlogPostFormProps) => {
  const router = useRouter();

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
    router.push('/admin/blog');
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
               <div className="text-white rounded-md">
                 <Controller
                    name="content"
                    control={control}
                    rules={{ required: 'Content is required.'}}
                    render={({ field }) => {
                       const editor = useEditor({
                        extensions: [
                          StarterKit.configure({
                            heading: {
                              levels: [1, 2, 3],
                            },
                            bulletList: {
                              keepMarks: true,
                              keepAttributes: false,
                            },
                            orderedList: {
                              keepMarks: true,
                              keepAttributes: false, 
                            },
                          }),
                        ],
                        content: field.value,
                        onUpdate: ({ editor }) => {
                          field.onChange(editor.getHTML());
                        },
                        editorProps: {
                          attributes: {
                            class: 'prose prose-invert min-h-[250px] w-full max-w-none rounded-b-md border-x border-b border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 shadow-sm placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50',
                          },
                        },
                      })

                      return (
                        <div className="flex flex-col gap-0">
                           <TiptapToolbar editor={editor} />
                           <EditorContent editor={editor} />
                        </div>
                      )
                    }}
                 />
              </div>
               {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>}
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
                 <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                 </svg>
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
