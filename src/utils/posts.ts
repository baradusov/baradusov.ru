import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';

type Post = CollectionEntry<'posts'>;

/** Опубликованные записи, новые сверху. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => data.draft !== true);

  return posts.sort(
    (a, b) =>
      new Date(b.data.created).valueOf() - new Date(a.data.created).valueOf(),
  );
}

/** Годы по убыванию и записи каждого года. */
export function byYear(posts: Post[]) {
  const groups = posts.reduce<Record<string, Post[]>>((acc, post) => {
    const year = new Date(post.data.created).getFullYear();

    (acc[year] ??= []).push(post);

    return acc;
  }, {});

  return Object.keys(groups)
    .sort((a, b) => Number(b) - Number(a))
    .map((year) => ({ year, posts: groups[year] }));
}

/** «31.08» или «31.08.26». */
export function formatDate(value: Date | string, withYear = false) {
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(2);

  return withYear ? `${day}.${month}.${year}` : `${day}.${month}`;
}

/** Сколько всего в коллекции, разложенной по годам. */
export function countByYear(entries: { data: unknown[] }[]) {
  return entries.reduce((acc, entry) => entry.data.length + acc, 0);
}
