import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection, render, type CollectionEntry } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';
import { getContainerRenderer as mdxContainerRenderer } from '@astrojs/mdx';

import sanitize from 'sanitize-html';

import { noteTitle } from './posts';

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

type Entry = CollectionEntry<'posts'> | CollectionEntry<'notes'>;

type Options = {
  title: string;
  description: string;
  posts?: boolean;
  notes?: boolean;
};

/** RSS из постов, заметок или всего вместе — разметка одна. */
export async function buildFeed(context: APIContext, options: Options) {
  const origin = new URL(context.site ?? 'https://baradusov.ru').origin;

  const posts = options.posts
    ? await getCollection('posts', ({ data }) => data.draft === false)
    : [];
  const notes = options.notes
    ? await getCollection('notes', ({ data }) => data.draft !== true)
    : [];

  const renderers = await loadRenderers([mdxContainerRenderer()]);
  const container = await AstroContainer.create({ renderers });

  const toHtml = async (entry: Entry) => {
    const { Content } = await render(entry);
    const html = (await container.renderToString(Content)).replace(
      /(src|srcset|href|poster)="([^"]*)"/g,
      (_m, attr, val) => `${attr}="${absolutize(val, origin)}"`,
    );

    return sanitize(html, {
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
        video: ['src', 'poster', 'controls', 'width', 'height', 'preload'],
      },
    });
  };

  const items = await Promise.all([
    ...posts.map(async (post) => ({
      title: post.data.title,
      pubDate: post.data.created,
      link: `/posts/${post.id}/`,
      description: await toHtml(post),
    })),
    ...notes.map(async (note) => ({
      title: noteTitle(note),
      pubDate: note.data.created,
      link: `/notes/${note.id}/`,
      description: await toHtml(note),
    })),
  ]);

  items.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: options.title,
    description: options.description,
    site: origin,
    trailingSlash: false,
    items,
  });
}
