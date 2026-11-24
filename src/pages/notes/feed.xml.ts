import type { APIRoute } from 'astro';

import { buildFeed } from '../../utils/feed';

export const GET: APIRoute = (context) =>
  buildFeed(context, {
    title: 'заметки нуриля',
    description: 'заметки нуриля',
    notes: true,
  });
