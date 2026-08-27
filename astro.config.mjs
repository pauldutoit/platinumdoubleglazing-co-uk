// @ts-check
import { defineConfig } from 'astro/config';
import siteConfig from './src/data/site.config.json' with { type: 'json' };

// https://astro.build/config
export default defineConfig({
  site: `https://${siteConfig.domain}`,
  output: 'static',
});
