import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import siteConfig from '../data/site.config.json';
import intents from '../data/intents.json';

export const GET: APIRoute = async () => {
  const entries = await getCollection('cityContent');
  const indexableEntries = entries.filter((e) => e.data.indexable);

  const staticUrls = [
    '/',
    '/areas',
    ...intents.map((i) => `/services/${i.slug}/`),
  ];

  const urls = [
    ...staticUrls,
    ...indexableEntries.map((e) => `/${e.data.intentSlug}-${e.data.citySlug}/`),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>https://${siteConfig.domain}${u}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
