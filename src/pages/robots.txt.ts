import type { APIRoute } from 'astro';
import siteConfig from '../data/site.config.json';

export const GET: APIRoute = async () => {
  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /quote
Disallow: /quote/
Disallow: /thank-you
Disallow: /thank-you/

Sitemap: https://${siteConfig.domain}/sitemap.xml
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
};
