'use client';

import { AlertCircle, ImageIcon, Save } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { saveArticle, type ArticleFormValues } from '@/app/actions';
import { feedProductCatalog } from '@/data/feedProducts';
import { knowledgeTopics, type KnowledgeArticle } from '@/data/knowledgeArticles';
import { useToast } from '../ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

type FormValues = Omit<ArticleFormValues, 'ingredients'> & { ingredients: string[] };

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const inputClass = 'mt-1 block w-full rounded-md border-ash-600 bg-ash-700 p-2 text-sm text-ash-100 shadow-sm focus:border-harvest-500 focus:ring-harvest-500';
const labelClass = 'block text-sm font-medium text-ash-300';
const hintClass = 'mt-1 text-xs text-ash-400';
const panelClass = 'rounded-lg border border-ash-700 bg-ash-800/50 p-6';

export const BlogPostForm = ({ article }: { article?: KnowledgeArticle }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(Boolean(article));

  const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      title: article?.title ?? '',
      slug: article?.slug ?? '',
      seoTitle: article?.seoTitle ?? '',
      description: article?.description ?? '',
      topic: article?.topic ?? '',
      imageUrl: article?.image.src ?? '',
      imageAlt: article?.image.alt ?? '',
      imageCredit: article?.image.photographer ?? '',
      ingredients: article?.ingredients ?? [],
      keywords: article?.keywords.join(', ') ?? '',
      keyPoints: article?.keyPoints.join('\n') ?? '',
      body: article?.body.trim() ?? '',
      status: article?.status ?? 'draft',
      publishedAt: article?.published ?? new Date().toISOString().slice(0, 10),
    },
  });

  const imageUrl = watch('imageUrl');
  const description = watch('description') ?? '';
  const seoTitle = watch('seoTitle') ?? '';
  const status = watch('status');

  const titleField = register('title', {
    onChange: (event) => {
      if (!slugEdited) setValue('slug', slugify(event.target.value));
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setServerError(null);
    const result = await saveArticle(values, article?.id);
    if (!result.success) {
      setServerError(result.error ?? 'An unknown error occurred.');
      return;
    }
    toast({ title: 'Saved', description: values.status === 'published' ? 'The article is live.' : 'Saved as a draft.' });
    if (!article || result.slug !== article.slug) {
      router.push(`/admin/blog/${result.slug}/edit`);
    }
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-ash-100">{article ? 'Edit article' : 'New article'}</h1>
        <div className="flex gap-3">
          <button type="button" onClick={() => router.push('/admin/blog')} className="rounded-lg border border-ash-600 px-4 py-2 transition-colors hover:bg-ash-700">Back</button>
          {article?.status === 'published' && <a href={`/knowledge/${article.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-ash-600 px-4 py-2 transition-colors hover:bg-ash-700">View live</a>}
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-harvest-600 px-4 py-2 text-ash-950 transition-colors hover:bg-harvest-500 disabled:cursor-not-allowed disabled:bg-ash-500">
            <Save className="h-4 w-4" />
            <span>{isSubmitting ? 'Saving...' : status === 'published' ? 'Save and publish' : 'Save draft'}</span>
          </button>
        </div>
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className={`${panelClass} space-y-5`}>
            <div>
              <label htmlFor="title" className={labelClass}>Title</label>
              <input id="title" required {...titleField} className={inputClass} />
            </div>
            <div>
              <label htmlFor="slug" className={labelClass}>URL slug</label>
              <div className="mt-1 flex items-center gap-1 font-mono text-sm text-ash-400">
                /knowledge/
                <input id="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" {...register('slug', { onChange: () => setSlugEdited(true) })} className={`${inputClass} mt-0 font-mono`} />
              </div>
              {article && <p className={hintClass}>Changing the slug of a published article breaks existing links to it.</p>}
            </div>
            <div>
              <label htmlFor="description" className={labelClass}>Description</label>
              <textarea id="description" required rows={3} maxLength={400} {...register('description')} className={inputClass} />
              <p className={hintClass}>Shown on cards and as the search result snippet. Aim for 120–160 characters ({description.length} now).</p>
            </div>
            <div>
              <label htmlFor="keyPoints" className={labelClass}>Key points</label>
              <textarea id="keyPoints" rows={4} {...register('keyPoints')} className={inputClass} placeholder="One point per line" />
              <p className={hintClass}>One per line. Shown in a box at the top of the article.</p>
            </div>
          </div>

          <div className={panelClass}>
            <label htmlFor="body" className={`${labelClass} mb-2`}>Content (Markdown)</label>
            <textarea id="body" required rows={28} {...register('body')} className={`${inputClass} bg-ash-900 font-mono`} placeholder="Start sections with ## headings. The title is added automatically." />
            <p className={hintClass}>Use ## for section headings (they build the &quot;On this page&quot; list), | tables |, and links like [soybean meal](/products/soybean-meal).</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`${panelClass} space-y-5`}>
            <div>
              <span className={labelClass}>Status</span>
              <div className="mt-2 flex gap-2">
                {(['draft', 'published'] as const).map((value) => (
                  <label key={value} className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-center text-sm capitalize ${status === value ? 'border-harvest-500 bg-harvest-500/20 text-ash-100' : 'border-ash-600 text-ash-300'}`}>
                    <input type="radio" value={value} {...register('status')} className="sr-only" />
                    {value}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="publishedAt" className={labelClass}>Publish date</label>
              <input id="publishedAt" type="date" required {...register('publishedAt')} className={inputClass} />
            </div>
            <div>
              <label htmlFor="topic" className={labelClass}>Topic</label>
              <select id="topic" required {...register('topic')} className={inputClass}>
                <option value="">Select a topic</option>
                {knowledgeTopics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
              </select>
            </div>
          </div>

          <div className={`${panelClass} space-y-4`}>
            <span className={labelClass}>Featured image</span>
            <div className="relative aspect-video w-full overflow-hidden rounded-md border-2 border-dashed border-ash-600">
              {imageUrl && /^https:\/\//.test(imageUrl) ? <Image src={imageUrl} alt="" fill sizes="400px" className="object-cover" unoptimized /> : <div className="flex h-full items-center justify-center"><ImageIcon className="h-10 w-10 text-ash-500" /></div>}
            </div>
            <div>
              <label htmlFor="imageUrl" className={labelClass}>Image URL</label>
              <input id="imageUrl" type="url" required {...register('imageUrl')} className={inputClass} placeholder="https://images.unsplash.com/photo-..." />
              <p className={hintClass}>Unsplash or your Supabase Storage bucket.</p>
            </div>
            <div>
              <label htmlFor="imageAlt" className={labelClass}>Image description (alt text)</label>
              <input id="imageAlt" required {...register('imageAlt')} className={inputClass} />
            </div>
            <div>
              <label htmlFor="imageCredit" className={labelClass}>Photo credit</label>
              <input id="imageCredit" {...register('imageCredit')} className={inputClass} placeholder="Photographer on Unsplash" />
            </div>
          </div>

          <div className={`${panelClass} space-y-5`}>
            <div>
              <label htmlFor="seoTitle" className={labelClass}>Search title (optional)</label>
              <input id="seoTitle" maxLength={200} {...register('seoTitle')} className={inputClass} />
              <p className={hintClass}>Overrides the title in Google results. Keep under 60 characters ({seoTitle.length} now).</p>
            </div>
            <div>
              <label htmlFor="keywords" className={labelClass}>Keywords</label>
              <input id="keywords" {...register('keywords')} className={inputClass} placeholder="pig feed formulation, lysine for pigs" />
              <p className={hintClass}>Separate with commas.</p>
            </div>
            <fieldset>
              <legend className={labelClass}>Ingredients mentioned</legend>
              <p className={hintClass}>Linked from the article and shown on these product pages.</p>
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                {feedProductCatalog.map((product) => (
                  <label key={product.id} className="flex items-center gap-2 text-sm text-ash-200">
                    <input type="checkbox" value={product.id} {...register('ingredients')} className="rounded border-ash-600 bg-ash-700" />
                    {product.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
      </div>
    </form>
  );
};
