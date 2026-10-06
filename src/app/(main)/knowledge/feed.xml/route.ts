import { articleAuthor } from '@/data/knowledgeArticles';
import { getPublishedArticles } from '@/lib/content';
import { absoluteUrl, siteConfig } from '@/lib/seo';

export const revalidate = 3600;

const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET() {
  const items = [...await getPublishedArticles()]
    .sort((a, b) => b.published.localeCompare(a.published))
    .map((article) => {
      const url = absoluteUrl(`/knowledge/${article.slug}`);
      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(article.description)}</description>
      <category>${escapeXml(article.topic)}</category>
      <author>${siteConfig.email} (${escapeXml(articleAuthor)})</author>
      <pubDate>${new Date(`${article.published}T00:00:00Z`).toUTCString()}</pubDate>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${siteConfig.name} Knowledge Centre`)}</title>
    <link>${absoluteUrl('/knowledge')}</link>
    <atom:link href="${absoluteUrl('/knowledge/feed.xml')}" rel="self" type="application/rss+xml" />
    <description>Practical livestock feed and nutrition guides for farmers and feed manufacturers in Zimbabwe.</description>
    <language>en-zw</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
