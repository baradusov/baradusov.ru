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
  schema: z.array(
    z.object({
      name: z.string(),
      url: z.string().url(),
      description: z.string(),
      dead: z.boolean().optional(),
    })
  ),
});

const movies = defineCollection({
  type: 'data',
  schema: z.record(
    z.string(),
    z.array(
      z.object({
        title: z.string(),
        originalTitle: z.string().optional(),
        releaseYear: z.string(),
      })
    )
  ),
});

const books = defineCollection({
  type: 'data',
  schema: z.record(
    z.string(),
    z.array(
      z.object({
        title: z.string(),
        author: z.string(),
      })
    )
  ),
});

export const collections = { posts, movies, books, projects };
