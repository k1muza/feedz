import { getAllArticlesForAdmin } from '@/app/actions';
import { BlogManagement } from '@/components/admin/BlogManagement';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export default async function BlogAdminPage() {
  const articles = await getAllArticlesForAdmin();
  return (
    <div className="container mx-auto px-4">
      <BlogManagement initialArticles={articles} configured={isSupabaseConfigured} />
    </div>
  );
}
