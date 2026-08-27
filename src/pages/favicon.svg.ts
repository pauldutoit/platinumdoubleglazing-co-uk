import type { APIRoute } from 'astro';
import siteConfig from '../data/site.config.json';
import { ICONS, getInitials } from '../lib/logoIcon';

export const GET: APIRoute = async () => {
  const iconPaths = (siteConfig as any).logoIcon && ICONS[(siteConfig as any).logoIcon];
  const inner = iconPaths
    ? `<g transform="translate(14,14)" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${iconPaths}</g>`
    : `<text x="32" y="33" text-anchor="middle" dominant-baseline="central" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-weight="800" letter-spacing="-1" font-size="24" fill="#ffffff">${getInitials(siteConfig.siteName)}</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${siteConfig.themeColor}" />
      <stop offset="1" stop-color="${siteConfig.accentColor}" />
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#g)" />
  ${inner}
</svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
