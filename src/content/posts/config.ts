import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: {
    title: z.string(),
    created: z.coerce.date(),
    tags: z.string(),
    draft: z.boolean().optional(),
  },
});

export const collections = { posts };
