import 'server-only';
import { cache } from 'react';
import { knowledgeArticles, type KnowledgeArticle } from '@/data/knowledgeArticles';
import { staticPolicies, staticTeamMembers } from '@/data/siteContent';
import type { Policy, TeamMember } from '@/types';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createPublicClient } from '@/lib/supabase/server';

// Public content reads. Each falls back to the in-code content when Supabase is not
// connected or the query fails, so the public site never goes blank.

export type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  description: string;
  topic: string;
  image_url: string;
  image_alt: string;
  image_credit: string;
  ingredients: string[];
  keywords: string[];
  key_points: string[];
  body: string;
  status: 'draft' | 'published';
  published_at: string;
  updated_at: string;
};

export function rowToArticle(row: ArticleRow): KnowledgeArticle {
  return {
    id: row.id,
    status: row.status,
    slug: row.slug,
    title: row.title,
    seoTitle: row.seo_title || undefined,
    description: row.description,
    topic: row.topic,
    image: { id: row.slug, src: row.image_url, alt: row.image_alt || row.title, photographer: row.image_credit },
    published: row.published_at,
    updated: row.updated_at.slice(0, 10),
    ingredients: row.ingredients,
    keywords: row.keywords,
    keyPoints: row.key_points,
    body: row.body,
  };
}

// cache() dedupes calls within one render, e.g. generateMetadata and the page body.
export const getPublishedArticles = cache(async (): Promise<KnowledgeArticle[]> => {
  if (!isSupabaseConfigured) return knowledgeArticles;
  const { data, error } = await createPublicClient()
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to load articles, using built-in content:', error.message);
    return knowledgeArticles;
  }
  return (data as ArticleRow[]).map(rowToArticle);
});

export async function getPublishedArticle(slug: string) {
  return (await getPublishedArticles()).find((article) => article.slug === slug);
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  if (!isSupabaseConfigured) return staticTeamMembers;
  const { data, error } = await createPublicClient().from('team_members').select('*').order('sort_order').order('created_at');
  if (error) {
    console.error('Failed to load team members, using built-in content:', error.message);
    return staticTeamMembers;
  }
  return data.map((row) => ({ id: row.id, name: row.name, role: row.role, bio: row.bio, image: row.image, social: { linkedin: row.linkedin || undefined, email: row.email || undefined } }));
}

type PolicyRow = { id: string; title: string; content: string; effective_date: string; updated_at: string };

const rowToPolicy = (row: PolicyRow): Policy => ({ id: row.id, title: row.title, content: row.content, effectiveDate: row.effective_date, lastUpdated: row.updated_at.slice(0, 10) });

export async function getPolicies(): Promise<Policy[]> {
  if (!isSupabaseConfigured) return staticPolicies;
  const { data, error } = await createPublicClient().from('policies').select('*').order('created_at');
  if (error) {
    console.error('Failed to load policies, using built-in content:', error.message);
    return staticPolicies;
  }
  return (data as PolicyRow[]).map(rowToPolicy);
}
