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

type Note = CollectionEntry<'notes'>;

export async function getNotes(): Promise<Note[]> {
  const notes = await getCollection('notes', ({ data }) => data.draft !== true);

  return notes.sort(
    (a, b) =>
      new Date(b.data.created).valueOf() - new Date(a.data.created).valueOf(),
  );
}

const EXCERPT = 70;

/** Текст заметки без разметки и медиа, строками. */
function noteLines(note: Note) {
  return (note.body ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\((?:<[^>]*>|[^)]*)\)/g, '$1')
    .replace(/[\\*_`~>#]/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Весь текст одной строкой — для превью ответа. */
export function notePlainText(note: Note) {
  return noteLines(note).join(' ');
}

/** Заголовок заметки, а если его нет — начало текста. */
export function noteTitle(note: Note) {
  if (note.data.title) return note.data.title;

  const text = noteLines(note)[0];

  if (!text) return formatDate(note.data.created, true);
  if (text.length <= EXCERPT) return text;

  const cut = text.slice(0, EXCERPT);
  const space = cut.lastIndexOf(' ');

  return `${(space > EXCERPT / 2 ? cut.slice(0, space) : cut).replace(/[,.:;—–-]+$/, '')}…`;
}

export type FeedItem = {
  kind: 'post' | 'note';
  href: string;
  title: string;
  /** Заметка без своего заголовка — показываем начало текста. */
  excerpt: boolean;
  created: Date;
};

/** Посты и заметки вперемешку, новые сверху. */
export async function getFeed(): Promise<FeedItem[]> {
  const [posts, notes] = await Promise.all([getPosts(), getNotes()]);

  const items: FeedItem[] = [
    ...posts.map((post) => ({
      kind: 'post' as const,
      href: `/posts/${post.id}`,
      title: post.data.title,
      excerpt: false,
      created: new Date(post.data.created),
    })),
    ...notes.map((note) => ({
      kind: 'note' as const,
      href: `/notes#${note.id}`,
      title: noteTitle(note),
      excerpt: !note.data.title,
      created: new Date(note.data.created),
    })),
  ];

  return items.sort((a, b) => b.created.valueOf() - a.created.valueOf());
}

export function feedByYear(items: FeedItem[]) {
  const groups = items.reduce<Record<string, FeedItem[]>>((acc, item) => {
    (acc[item.created.getFullYear()] ??= []).push(item);
    return acc;
  }, {});

  return Object.keys(groups)
    .sort((a, b) => Number(b) - Number(a))
    .map((year) => ({ year, items: groups[year] }));
}
