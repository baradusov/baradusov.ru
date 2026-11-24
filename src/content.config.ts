import { file, glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      created: z.coerce.date(),
      tags: z.string().optional(),
      draft: z.boolean().optional(),
      image: image().optional(),
    }),
});

// Заметки из телеграм-канала. Имя файла — номер сообщения в канале,
// он же адрес: /notes/123 ↔ t.me/nuril_notes/123.
const notes = defineCollection({
  loader: glob({
    pattern: '**/[^_]*.md',
    base: './src/content/notes',
    generateId: ({ entry }) => entry.replace(/^.*\//, '').replace(/\.md$/, ''),
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string().optional(),
      created: z.coerce.date(),
      draft: z.boolean().optional(),
      image: image().optional(),
      forwarded: z.string().optional(),
      replyTo: z.number().optional(),
    }),
});

const projects = defineCollection({
  loader: file('./src/content/projects/projects.json'),
  schema: z.object({
    name: z.string(),
    url: z.string().url(),
    description: z.string(),
    order: z.number(),
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
      posterUrl: z.string().optional(),
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

export const collections = { posts, notes, movies, books, projects };
