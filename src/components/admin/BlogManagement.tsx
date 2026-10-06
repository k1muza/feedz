"use client";

import { AlertCircle, Edit, Eye, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { KnowledgeArticle } from "@/data/knowledgeArticles";
import { deleteArticle, setArticleStatus } from "@/app/actions";
import { Switch } from "../ui/switch";
import { useToast } from "../ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

type Props = {
  initialArticles: KnowledgeArticle[];
  configured: boolean;
};

export const BlogManagement = ({ initialArticles, configured }: Props) => {
  const router = useRouter();
  const { toast } = useToast();
  const [articles, setArticles] = useState(initialArticles);
  const [searchTerm, setSearchTerm] = useState("");
  const [topic, setTopic] = useState("All");
  const [articleToDelete, setArticleToDelete] = useState<KnowledgeArticle | null>(null);

  const topics = useMemo(() => ["All", ...Array.from(new Set(articles.map((article) => article.topic)))], [articles]);
  const visible = articles.filter((article) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesTerm = !term || article.title.toLowerCase().includes(term) || article.slug.includes(term);
    return matchesTerm && (topic === "All" || article.topic === topic);
  });

  const handleStatusToggle = async (article: KnowledgeArticle, published: boolean) => {
    if (!article.id) return;
    const status = published ? "published" : "draft";
    const result = await setArticleStatus(article.id, status);
    if (result.success) {
      setArticles((items) => items.map((item) => (item.id === article.id ? { ...item, status } : item)));
      toast({ title: published ? "Published" : "Moved to drafts", description: article.title });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!articleToDelete?.id) return;
    const result = await deleteArticle(articleToDelete.id);
    if (result.success) {
      setArticles((items) => items.filter((item) => item.id !== articleToDelete.id));
      toast({ title: "Deleted", description: `"${articleToDelete.title}" was deleted.` });
      router.refresh();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setArticleToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ash-100">Knowledge articles</h1>
          <p className="mt-1 text-sm text-ash-400">Published articles appear in the Knowledge Centre, sitemap and RSS feed.</p>
        </div>
        <Link href="/admin/blog/create" className="flex items-center gap-2 rounded-lg bg-harvest-600 px-4 py-2 text-ash-950 transition-colors hover:bg-harvest-500">
          <Plus className="h-4 w-4" /> New article
        </Link>
      </div>

      {!configured && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Database not connected</AlertTitle>
          <AlertDescription>Set the Supabase environment variables and run the migration and seed to manage articles here. The public site is showing the built-in articles.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-500" />
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by title or slug" className="w-full rounded-lg border border-ash-700 bg-ash-800 py-2 pl-9 pr-3 text-sm text-ash-100" />
        </div>
        <select value={topic} onChange={(event) => setTopic(event.target.value)} className="rounded-lg border border-ash-700 bg-ash-800 px-3 py-2 text-sm text-ash-100">
          {topics.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-ash-700 bg-ash-800/50">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ash-700">
            <thead className="bg-ash-900">
              <tr>
                {["Article", "Topic", "Published", "Live", ""].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ash-400">{heading}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-ash-800">
              {visible.map((article) => (
                <tr key={article.id || article.slug} className="hover:bg-ash-900/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-ash-700">
                        <Image src={article.image.src} alt="" fill sizes="64px" className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="line-clamp-1 text-sm font-medium text-ash-100">{article.title}</div>
                        <div className="mt-0.5 line-clamp-1 font-mono text-xs text-ash-500">/knowledge/{article.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ash-300">{article.topic}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ash-400">{article.published}</td>
                  <td className="px-4 py-3">
                    <Switch checked={article.status === "published"} onCheckedChange={(checked) => handleStatusToggle(article, checked)} aria-label={`Publish ${article.title}`} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {article.status === "published" && <Link href={`/knowledge/${article.slug}`} target="_blank" className="rounded p-2 text-ash-400 hover:bg-ash-700 hover:text-ash-100" title="View"><Eye className="h-4 w-4" /></Link>}
                      <Link href={`/admin/blog/${article.slug}/edit`} className="rounded p-2 text-ash-400 hover:bg-ash-700 hover:text-ash-100" title="Edit"><Edit className="h-4 w-4" /></Link>
                      <button type="button" onClick={() => setArticleToDelete(article)} className="rounded p-2 text-ash-400 hover:bg-red-900/50 hover:text-red-300" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ash-500">{articles.length === 0 ? "No articles yet. Run the seed or create one." : "No articles match your filters."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!articleToDelete} onOpenChange={(open) => !open && setArticleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this article?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{articleToDelete?.title}&quot; will be removed from the site permanently. Move it to drafts instead if you might want it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-500">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
