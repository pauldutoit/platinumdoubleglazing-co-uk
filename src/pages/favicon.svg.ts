import type { APIRoute } from 'astro';
import siteConfig from '../data/site.config.json';

export function getInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

export const GET: APIRoute = async () => {
  const initials = getInitials(siteConfig.siteName);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${siteConfig.themeColor}" />
      <stop offset="1" stop-color="${siteConfig.accentColor}" />
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#g)" />
  <text x="32" y="33" text-anchor="middle" dominant-baseline="central" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-weight="800" letter-spacing="-1" font-size="24" fill="#ffffff">${initials}</text>
</svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
