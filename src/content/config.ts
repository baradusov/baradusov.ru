import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    created: z.coerce.date(),
    tags: z.string().optional(),
    draft: z.boolean().optional(),
  }),
});

const projects = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    url: z.string(),
    description: z.string(),
    dead: z.boolean().optional(),
  }),
});

export const collections = { posts, projects };
