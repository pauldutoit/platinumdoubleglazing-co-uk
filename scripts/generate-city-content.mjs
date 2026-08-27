#!/usr/bin/env node
// Pre-generates genuinely unique, city+intent specific content at build time.
// Idempotent: existing files are skipped unless --force is passed, so re-runs
// are cheap and you never accidentally overwrite hand-edited copy.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-city-content.mjs
//   node scripts/generate-city-content.mjs --force            (regenerate everything)
//   node scripts/generate-city-content.mjs --city=london       (limit to one city)

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyCity = args.find((a) => a.startsWith('--city='))?.split('=')[1];

async function main() {
  if (!ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY environment variable.');
    process.exit(1);
  }

  const siteConfig = JSON.parse(await readFile(path.join(root, 'src/data/site.config.json'), 'utf-8'));
  const intents = JSON.parse(await readFile(path.join(root, 'src/data/intents.json'), 'utf-8'));
  let cities = JSON.parse(await readFile(path.join(root, 'src/data/cities.json'), 'utf-8'));

  if (onlyCity) cities = cities.filter((c) => c.slug === onlyCity);

  for (const city of cities) {
    for (const intent of intents) {
      const dir = path.join(root, 'src/content/cityContent', city.slug);
      const file = path.join(dir, `${intent.slug}.md`);

      if (!force && (await exists(file))) {
        console.log(`skip  ${city.slug}/${intent.slug} (already generated, use --force to overwrite)`);
        continue;
      }

      console.log(`gen   ${city.slug}/${intent.slug} ...`);
      const generated = await generateContent({ siteConfig, city, intent });

      await mkdir(dir, { recursive: true });
      await writeFile(file, toFrontmatterFile({ siteConfig, city, intent, generated }));

      // Be nice to the API - small delay between calls.
      await sleep(500);
    }
  }
}

async function generateContent({ siteConfig, city, intent }) {
  const priceLine = (city.pf && intent.basePriceRange)
    ? `Realistic price range for this city (national base price x this city's regional factor of ${city.pf}): £${Math.round(intent.basePriceRange[0] * city.pf)}-£${Math.round(intent.basePriceRange[1] * city.pf)}. Use this range instead of inventing prices.`
    : '';

  const prompt = `You are writing website copy for a local service business.

Business: ${siteConfig.siteName} (${siteConfig.nicheLabel}), operating in the UK.
Page topic: "${intent.label}" (${intent.searchIntent}) specifically for the city of ${city.name}, ${city.region}.
${priceLine}

Write genuinely unique, specific, non-generic copy for this exact city and service combination.
Reference real, verifiable local detail where sensible (well-known areas, typical local conditions),
and avoid boilerplate that could be copy-pasted onto any other city's page unchanged - that kind of
templated, one-word-swapped content gets flagged by Google as scaled content abuse.

Return ONLY markdown (no frontmatter, no code fences) with this structure:
## <a specific H2 headline for this city and service>
<2-3 sentences>

## Why locals choose us
<3-5 bullet points, city-specific where possible>

## Areas we cover around ${city.name}
<a short paragraph naming a few real neighbourhoods/postcodes/nearby towns>

## Frequently asked questions
<2-3 Q&A pairs relevant to this city and service>

Also return, as the very first line before the markdown, a single JSON line with:
{"metaTitle": "...", "metaDescription": "..."}
metaTitle under 60 chars, metaDescription under 155 chars, both mentioning ${city.name} and the service.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? '';
  const [firstLine, ...rest] = text.split('\n');

  let meta = { metaTitle: `${intent.label} in ${city.name}`, metaDescription: `${intent.label} in ${city.name} - ${siteConfig.siteName}.` };
  let body = text;
  try {
    meta = JSON.parse(firstLine);
    body = rest.join('\n').trim();
  } catch {
    // Model didn't return the JSON line as expected - fall back to defaults above.
  }

  return { meta, body };
}

function toFrontmatterFile({ siteConfig, city, intent, generated }) {
  const { meta, body } = generated;
  return `---
city: "${city.name}"
citySlug: "${city.slug}"
intent: "${intent.label}"
intentSlug: "${intent.slug}"
region: "${city.region ?? ''}"
indexable: ${city.indexable === true}
metaTitle: ${JSON.stringify(meta.metaTitle)}
metaDescription: ${JSON.stringify(meta.metaDescription)}
generatedAt: "${new Date().toISOString().slice(0, 10)}"
generatedBy: "llm"
---

${body}
`;
}

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

main().catch((err) => { console.error(err); process.exit(1); });
