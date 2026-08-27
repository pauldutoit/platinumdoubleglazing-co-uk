import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const cityContent = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/cityContent' }),
  schema: z.object({
    city: z.string(),
    citySlug: z.string(),
    intent: z.string(),
    intentSlug: z.string(),
    region: z.string().optional(),
    indexable: z.boolean().default(false),
    metaTitle: z.string(),
    metaDescription: z.string(),
    generatedAt: z.string().optional(),
    generatedBy: z.enum(['llm', 'manual']).default('manual'),
  }),
});

export const collections = { cityContent };
