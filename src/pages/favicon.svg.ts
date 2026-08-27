import type { APIRoute } from 'astro';
import siteConfig from '../data/site.config.json';

export function getInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

export const GET: APIRoute = async () => {
  const initials = getInitials(siteConfig.siteName);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="${siteConfig.themeColor}" />
  <text x="32" y="34" text-anchor="middle" dominant-baseline="central" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-weight="800" font-size="26" fill="#ffffff">${initials}</text>
</svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
