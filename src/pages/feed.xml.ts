import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

import sanitize from 'sanitize-html';
import MarkdownIt from 'markdown-it';

const parser = new MarkdownIt();

export const GET: APIRoute = async (context) => {
  const blog = await getCollection('posts', ({ data }) => data.draft === false);

  return rss({
    title: 'Нуриль Барадусов',
    description: 'Здесь я собираю всё, чем занимаюсь и пишу дневник.',
    site: context.site ?? '',
    trailingSlash: false,
    items: blog.map((post) => ({
      title: post.data.title,
      description: sanitize(parser.render(post.body ?? ''), {
        allowedTags: sanitize.defaults.allowedTags.concat(['img']),
      }),
      pubDate: post.data.created,
      link: `/posts/${post.id}/`,
    })),
  });
};
