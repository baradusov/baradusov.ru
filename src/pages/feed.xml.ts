import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';
import { getContainerRenderer as mdxContainerRenderer } from '@astrojs/mdx';

import sanitize from 'sanitize-html';

const absolutize = (value: string, origin: string) =>
  value
    .split(',')
    .map((part) => {
      const seg = part.trim();
      if (!seg) return seg;
      const [url, ...descr] = seg.split(/\s+/);
      const abs = url.startsWith('/') ? origin + url : url;
      return [abs, ...descr].join(' ');
    })
    .join(', ');

export const GET: APIRoute = async (context) => {
  const origin = new URL(context.site ?? 'https://baradusov.ru').origin;
  const posts = await getCollection(
    'posts',
    ({ data }) => data.draft === false,
  );

  const renderers = await loadRenderers([mdxContainerRenderer()]);
  const container = await AstroContainer.create({ renderers });

  const items = await Promise.all(
    posts.map(async (post) => {
      const { Content } = await render(post);
      let html = await container.renderToString(Content);

      html = html.replace(
        /(src|srcset|href)="([^"]*)"/g,
        (_m, attr, val) => `${attr}="${absolutize(val, origin)}"`,
      );

      return {
        title: post.data.title,
        pubDate: post.data.created,
        link: `/posts/${post.id}/`,
        description: sanitize(html, {
          allowedTags: sanitize.defaults.allowedTags.concat([
            'img',
            'picture',
            'source',
            'figure',
            'figcaption',
            'video',
          ]),
          allowedAttributes: {
            ...sanitize.defaults.allowedAttributes,
            img: [
              'src',
              'srcset',
              'sizes',
              'alt',
              'width',
              'height',
              'loading',
              'decoding',
            ],
            source: ['src', 'srcset', 'sizes', 'type', 'media'],
            video: ['src', 'controls', 'width', 'height', 'preload'],
          },
        }),
      };
    }),
  );

  return rss({
    title: 'Нуриль Барадусов',
    description: 'Здесь я собираю всё, чем занимаюсь и пишу дневник.',
    site: origin,
    trailingSlash: false,
    items,
  });
};
