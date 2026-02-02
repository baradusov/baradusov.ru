import { file, glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    created: z.coerce.date(),
    tags: z.string().optional(),
    draft: z.boolean().optional(),
    image: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: file('./src/content/projects/projects.json'),
  schema: z.object({
    name: z.string(),
    url: z.string().url(),
    description: z.string(),
    dead: z.boolean().optional(),
  }),
});
const movies = defineCollection({
  loader: file('./src/content/movies/movies.json'),
  schema: z.array(
    z.object({
      title: z.string(),
      originalTitle: z.string().optional(),
      releaseYear: z.string(),
    }),
  ),
});

const books = defineCollection({
  loader: file('./src/content/books/books.json'),
  schema: z.array(
    z.object({
      title: z.string(),
      author: z.string(),
      coverUrl: z.string(),
    }),
  ),
});

export const collections = { posts, movies, books, projects };
