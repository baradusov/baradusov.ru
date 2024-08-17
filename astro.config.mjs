import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import serviceWorker from 'astrojs-service-worker';

// https://astro.build/config
export default defineConfig({
  site: 'https://baradusov.ru',
  integrations: [mdx(), serviceWorker()],
});
