// Small library of generic trade icons for the logo badge + favicon, selected via
// site.config.json's optional "logoIcon" field. Falls back to a two-letter
// initials monogram when unset or unrecognised, so this stays niche-agnostic
// for future sites that don't pick one.
export const ICONS: Record<string, string> = {
  window: '<rect x="4" y="4" width="28" height="28" rx="3"/><line x1="18" y1="4" x2="18" y2="32"/><line x1="4" y1="18" x2="32" y2="18"/>',
  wrench: '<path d="M23 7a6.5 6.5 0 0 0-8.4 8.4L6 24.9V29h4.1l9.5-8.6A6.5 6.5 0 0 0 28 12l-4.3 4.3-3-3L25 9z"/>',
  house: '<path d="M5 17 18 5l13 12"/><path d="M8 15v15h20V15"/><line x1="15" y1="30" x2="15" y2="21"/><line x1="21" y1="30" x2="21" y2="21"/>',
  shield: '<path d="M18 4 30 8v9c0 8.5-5.2 13.7-12 16-6.8-2.3-12-7.5-12-16V8z"/>',
  door: '<rect x="9" y="4" width="18" height="28" rx="2"/><circle cx="20" cy="19" r="1.4" fill="currentColor"/>',
};

export function getInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}
