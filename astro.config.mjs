import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

import remarkTypography from './src/plugins/remark-typography.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://baradusov.ru',
  integrations: [mdx()],
  markdown: {
    // Свой типограф вместо smartypants: тот делает английские “кавычки”.
    smartypants: false,
    remarkPlugins: [remarkTypography],
  },
  image: {
    layout: 'constrained',
  },
  vite: {
    server: {
      // Чтобы дев-сервер открывался с телефона по MagicDNS-имени тейлнета.
      // На сборку и прод не влияет.
      allowedHosts: ['.ts.net'],
    },
  },
});
