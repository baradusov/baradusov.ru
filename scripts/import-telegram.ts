/**
 * Заметки из HTML-экспорта телеграм-канала (Telegram Desktop → Export chat
 * history → HTML) в src/content/notes.
 *
 *   bun run notes:import ~/Downloads/ChatExport_…
 *
 * Флаги: --dry-run, --force. Без --force уже существующие заметки не трогает,
 * так что заголовки и правки, внесённые руками, переживут повторный импорт.
 */

import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const NOTES_DIR = 'src/content/notes';
const VIDEO_DIR = 'public/notes';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const exportDir = args.find((arg) => !arg.startsWith('--'));

if (!exportDir) {
  console.error('Укажи папку экспорта: bun run notes:import <ChatExport_…>');
  process.exit(1);
}

type Video = { src: string; thumb?: string };

type Note = {
  id: number;
  created: string;
  text: string;
  photos: string[];
  videos: Video[];
  forwarded?: string;
  replyTo?: number;
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** «20 October 2022, 22:04:01» → «2022-10-20T22:04:01» (время как на часах). */
function parseDate(title: string) {
  const match = title.match(/^(\d{1,2}) (\w+) (\d{4}), (\d\d:\d\d:\d\d)/);
  if (!match) throw new Error(`Не разобрал дату: ${title}`);

  const [, day, month, year, time] = match;
  const mm = String(MONTHS.indexOf(month) + 1).padStart(2, '0');

  return `${year}-${mm}-${day.padStart(2, '0')}T${time}`;
}

function decode(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&');
}

/** Простой текст → markdown без случайной разметки. */
function escape(value: string) {
  return decode(value)
    .replace(/([\\`*_[\]])/g, '\\$1')
    .replace(/</g, '&lt;');
}

/** Инлайн-разметка телеграма → markdown. На входе одна строка без <br>. */
function inline(html: string): string {
  let out = '';
  let rest = html;
  const tag = /<(\/?)([a-z]+)([^>]*)>/i;

  const stack: { name: string; href?: string; start: number }[] = [];

  while (rest) {
    const match = rest.match(tag);
    if (!match || match.index === undefined) {
      out += escape(rest);
      break;
    }

    out += escape(rest.slice(0, match.index));
    rest = rest.slice(match.index + match[0].length);

    const [, closing, rawName, attrs] = match;
    const name = rawName.toLowerCase();

    if (!closing) {
      const href = attrs.match(/href="([^"]*)"/)?.[1];
      stack.push({ name, href: href && decode(href), start: out.length });
      continue;
    }

    const open = stack.pop();
    if (!open) continue;

    const inner = out.slice(open.start);
    out = out.slice(0, open.start);

    if (!inner.trim()) {
      out += inner;
      continue;
    }

    switch (name) {
      case 'a':
        if (!open.href) out += inner;
        else if (/[\s()<>]/.test(open.href))
          out += `[${inner}](<${open.href}>)`;
        else out += `[${inner}](${open.href})`;
        break;
      case 'strong':
      case 'b':
        out += `**${inner}**`;
        break;
      case 'em':
      case 'i':
        out += `*${inner}*`;
        break;
      case 's':
      case 'del':
        out += `~~${inner}~~`;
        break;
      case 'code':
        out += '`' + inner.replace(/\\([\\`*_[\]])/g, '$1') + '`';
        break;
      default:
        // <u>, спойлеры и прочее — в markdown нет, оставляем текст.
        out += inner;
    }
  }

  return out;
}

const isListLine = (line: string) => /^\s*(?:[-–•*]|\d+[.)])\s/.test(line);

/** Строки одного абзаца: одиночный <br> в телеграме — настоящий перенос. */
function joinLines(lines: string[]) {
  return lines
    .map((line, i) => {
      const next = lines[i + 1];
      if (next === undefined) return line;
      const hard = !isListLine(line) && !isListLine(next);
      return hard ? `${line}\\` : line;
    })
    .join('\n');
}

function toMarkdown(html: string) {
  const blocks: string[] = [];

  // Цитаты выносим отдельными блоками.
  const parts = html.split(/(<blockquote>[\s\S]*?<\/blockquote>)/);

  for (const part of parts) {
    const quote = part.match(/^<blockquote>([\s\S]*?)<\/blockquote>$/);
    const body = quote ? quote[1] : part;

    const paragraphs = body
      .replace(/\n/g, '<br>')
      .split(/(?:<br>\s*){2,}/)
      .map((p) =>
        p
          .split(/<br>/)
          .map((line) => inline(line).trim())
          .map((line) =>
            line.replace(/^(#+|>)/, '\\$1').replace(/^\+ /, '\\+ '),
          ),
      )
      .map((lines) => lines.filter((line, i) => line || i < lines.length - 1))
      .filter((lines) => lines.some(Boolean))
      .map(joinLines);

    if (quote) {
      blocks.push(
        paragraphs
          .map((p) =>
            p
              .split('\n')
              .map((line) => `> ${line}`)
              .join('\n'),
          )
          .join('\n>\n'),
      );
    } else {
      blocks.push(...paragraphs);
    }
  }

  return blocks.filter(Boolean).join('\n\n');
}

function parse(html: string): Note[] {
  const chunks = html.split('<div class="message ').slice(1);
  const notes: Note[] = [];
  const alias = new Map<number, number>();

  for (const chunk of chunks) {
    if (!chunk.startsWith('default')) continue;

    const id = Number(chunk.match(/id="message(\d+)"/)?.[1]);
    const joined = chunk.startsWith('default clearfix joined');
    const dateTitle = chunk.match(
      /class="pull_right date details" title="([^"]+)"/,
    )?.[1];
    if (!id || !dateTitle) continue;

    const created = parseDate(dateTitle);
    const textHtml =
      chunk.match(/<div class="text">\n([\s\S]*?)\n<\/div>/)?.[1] ?? '';
    const text = toMarkdown(textHtml.trim());

    const photos = [
      ...chunk.matchAll(/class="photo_wrap[^"]*" href="([^"]+)"/g),
    ].map((m) => decode(m[1]));
    const videos = [
      ...chunk.matchAll(
        /class="video_file_wrap[^"]*" href="([^"]+)">(?:<img class="video_file" src="([^"]+)")?/g,
      ),
    ].map((m) => ({ src: decode(m[1]), thumb: m[2] && decode(m[2]) }));

    const forwarded = chunk
      .match(/<div class="forwarded_from details">Forwarded from ([^<]+)/)?.[1]
      ?.trim();
    const replyTo =
      Number(chunk.match(/GoToMessage\((\d+)\)/)?.[1]) || undefined;

    const prev = notes.at(-1);

    // Альбом: следующие сообщения с тем же временем и без своего текста.
    if (joined && prev && prev.created === created && (!text || !prev.text)) {
      prev.text ||= text;
      prev.photos.push(...photos);
      prev.videos.push(...videos);
      alias.set(id, prev.id);
      continue;
    }

    if (!text && !photos.length && !videos.length) continue;

    notes.push({ id, created, text, photos, videos, forwarded, replyTo });
  }

  for (const note of notes) {
    if (note.replyTo) note.replyTo = alias.get(note.replyTo) ?? note.replyTo;
  }

  return notes;
}

/** Видео — в public: Astro их не оптимизирует. Не-mp4 перегоняем в mp4. */
async function copyVideo(
  exportPath: string,
  video: Video,
  id: number,
  index: number,
) {
  const name = `${id}-${index}.mp4`;
  const target = join(VIDEO_DIR, name);
  const source = join(exportPath, video.src);

  if (!dryRun && (force || !existsSync(target))) {
    await mkdir(VIDEO_DIR, { recursive: true });

    if (extname(source).toLowerCase() === '.mp4') {
      await copyFile(source, target);
    } else {
      const res = spawnSync(
        'ffmpeg',
        [
          '-y',
          '-loglevel',
          'error',
          '-i',
          source,
          '-c:v',
          'libx264',
          '-crf',
          '23',
          '-preset',
          'slow',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-movflags',
          '+faststart',
          target,
        ],
        { stdio: 'inherit' },
      );
      if (res.status !== 0) throw new Error(`ffmpeg не справился с ${source}`);
    }
  }

  let poster: string | undefined;
  if (video.thumb) {
    poster = `${id}-${index}.jpg`;
    if (!dryRun && (force || !existsSync(join(VIDEO_DIR, poster)))) {
      await copyFile(join(exportPath, video.thumb), join(VIDEO_DIR, poster));
    }
  }

  return { src: `/notes/${name}`, poster: poster && `/notes/${poster}` };
}

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;

async function writeNote(exportPath: string, note: Note) {
  const year = note.created.slice(0, 4);
  const dir = join(NOTES_DIR, year);
  const file = join(dir, `${note.id}.md`);

  if (existsSync(file) && !force) return 'skip';
  if (dryRun) return 'written';

  await mkdir(join(dir, 'assets'), { recursive: true });

  const photos: string[] = [];
  for (const photo of note.photos) {
    const name = basename(photo);
    await copyFile(join(exportPath, photo), join(dir, 'assets', name));
    photos.push(`./assets/${name}`);
  }

  const videos = await Promise.all(
    note.videos.map((video, i) => copyVideo(exportPath, video, note.id, i)),
  );

  const front = [
    '---',
    `created: ${quote(note.created)}`,
    photos[0] && `image: ${quote(photos[0])}`,
    note.forwarded && `forwarded: ${quote(note.forwarded)}`,
    note.replyTo && `replyTo: ${note.replyTo}`,
    '---',
  ].filter(Boolean);

  // Как в телеграме: сначала медиа, под ним текст.
  const media = [
    photos.length ? photos.map((src) => `![](${src})`).join('\n') : '',
    ...videos.map(
      ({ src, poster }) =>
        `<video controls playsinline preload="none" src="${src}"${poster ? ` poster="${poster}"` : ''}></video>`,
    ),
  ].filter(Boolean);

  const body = [...media, note.text].filter(Boolean).join('\n\n');

  await writeFile(file, `${front.join('\n')}\n\n${body}\n`);

  return 'written';
}

// Большие экспорты телеграм режет на messages.html, messages2.html, …
const pages = (await readdir(exportDir))
  .filter((name) => /^messages\d*\.html$/.test(name))
  .sort(
    (a, b) => (Number(a.match(/\d+/)) || 1) - (Number(b.match(/\d+/)) || 1),
  );
const html = (
  await Promise.all(
    pages.map((name) => readFile(join(exportDir, name), 'utf8')),
  )
).join('\n');
const notes = parse(html);

const stats = { written: 0, skip: 0 };
for (const note of notes) {
  stats[await writeNote(exportDir, note)]++;
}

console.log(
  `Заметок в экспорте: ${notes.length}. ` +
    (dryRun ? 'Записалось бы' : 'Записано') +
    `: ${stats.written}, пропущено (уже есть): ${stats.skip}.`,
);
