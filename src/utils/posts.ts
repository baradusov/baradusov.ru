import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';

type Post = CollectionEntry<'posts'>;

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => data.draft !== true);

  return posts.sort(
    (a, b) =>
      new Date(b.data.created).valueOf() - new Date(a.data.created).valueOf(),
  );
}

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

export function countByYear(entries: { data: unknown[] }[]) {
  return entries.reduce((acc, entry) => entry.data.length + acc, 0);
}

/** Разделы с именем, следом годы по убыванию. */
export function sortByShelf<T extends { id: string }>(entries: T[]) {
  return [...entries].sort((a, b) => {
    const na = Number(a.id);
    const nb = Number(b.id);
    const aNamed = Number.isNaN(na);
    const bNamed = Number.isNaN(nb);

    if (aNamed !== bNamed) return aNamed ? -1 : 1;
    if (aNamed) return 0;

    return nb - na;
  });
}

/** Что в процессе, добор законченными сквозь годы. Ещё отдаёт число текущих. */
export function buildShelf<T>(
  entries: { id: string; data: T[] }[],
  current: string,
  size: number,
) {
  const now = entries.find((entry) => entry.id === current)?.data ?? [];

  const done = entries
    .filter((entry) => entry.id !== current)
    .sort((a, b) => Number(b.id) - Number(a.id))
    .flatMap((entry) => entry.data);

  return {
    items: [...now, ...done].slice(0, size),
    active: Math.min(now.length, size),
  };
}
