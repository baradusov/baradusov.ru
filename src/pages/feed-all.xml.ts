import type { APIRoute } from 'astro';

import { buildFeed } from '../utils/feed';

export const GET: APIRoute = (context) =>
  buildFeed(context, {
    title: 'Нуриль Барадусов',
    description: 'Здесь я собираю всё, чем занимаюсь и пишу дневник.',
    posts: true,
    notes: true,
  });
