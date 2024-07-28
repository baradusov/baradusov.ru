import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async (context) => {
  const blog = await getCollection('posts', ({ data }) => data.draft === false);

  return rss({
    title: 'Нуриль Барадусов',
    description: 'Фронтендер из Санкт-Петербурга',
    site: context.site ?? '',
    trailingSlash: false,
    items: blog.map((post) => ({
      title: post.data.title,
      description: post.body,
      pubDate: post.data.created,
      link: `/posts/${post.slug}/`,
    })),
  });
};
