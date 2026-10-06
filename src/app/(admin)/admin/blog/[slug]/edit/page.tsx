import { notFound } from 'next/navigation';
import { getArticleForAdmin } from '@/app/actions';
import { BlogPostForm } from '@/components/admin/BlogPostForm';

export const dynamic = 'force-dynamic';

export default async function EditBlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleForAdmin(slug);
  if (!article) notFound();
  return <BlogPostForm key={article.id} article={article} />;
}
