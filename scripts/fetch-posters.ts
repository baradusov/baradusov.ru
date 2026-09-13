/**
 * Постеры из TMDB в public/movies. Ключ — с themoviedb.org/settings/api.
 * Флаги: --dry-run, --force, --audit. Без флагов берёт только новое.
 */

import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const MOVIES_JSON = 'src/content/movies/movies.json';
const POSTERS_DIR = 'public/movies';
const POSTER_SIZE = 'w342';

const API_KEY = process.env.TMDB_API_KEY;
const dryRun = process.argv.includes('--dry-run');
const audit = process.argv.includes('--audit');
const force = process.argv.includes('--force');

if (!API_KEY) {
  console.error('Нет TMDB_API_KEY. Ключ: themoviedb.org/settings/api');
  process.exit(1);
}

const isBearer = API_KEY.startsWith('eyJ');

type Movie = {
  title: string;
  originalTitle?: string;
  releaseYear: string;
  posterUrl?: string;
};

type Found = {
  id: number;
  kind: 'movie' | 'tv';
  posterPath: string;
  popularity: number;
  year: number;
};

/** Выверенные руками id там, где поиск промахивается. */
const OVERRIDES: Record<string, { kind: 'movie' | 'tv'; id: number }> = {
  // Вонг Карвай, а не однодневка.
  'Fallen Angels|1995': { kind: 'movie', id: 11220 },
  // Сериал, а не фильм.
  'Wayne|2019': { kind: 'tv', id: 84231 },
  'Normal People|2020': { kind: 'tv', id: 89905 },
  // В данных 2005, у фильма с Леджером — 2006.
  'Candy|2005': { kind: 'movie', id: 4441 },
  // Аниме Осиямы, а не «Don't Look Back».
  'Look Back|2024': { kind: 'movie', id: 1244492 },
  // Сериал Apple TV+, а не инди-фильм.
  'Severance|2022': { kind: 'tv', id: 95396 },
  // Фильм 2021-го, на 2020-й приходится другая «Кода».
  'CODA|2020': { kind: 'movie', id: 776503 },
  // Фильм 2021-го, на 2020-й — мультсериал про панду.
  'Stillwater|2020': { kind: 'movie', id: 616651 },
};

/** Регистр, пунктуация и пробелы не в счёт. */
function norm(value: string) {
  return stripSeason(value)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/** «Конь БоДжек (1 сезон)» → «Конь БоДжек». */
function stripSeason(title: string) {
  return title.replace(/\s*\([^)]*сезон[^)]*\)\s*$/i, '').trim();
}

/** JSON.stringify перевернул бы годы: ключи-числа он сортирует по возрастанию. */
function serialize(data: Record<string, Movie[]>) {
  const years = Object.keys(data).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    const aNamed = Number.isNaN(na);
    const bNamed = Number.isNaN(nb);

    if (aNamed !== bNamed) return aNamed ? -1 : 1;
    if (aNamed) return 0;

    return nb - na;
  });

  const body = years
    .map((year) => {
      const list = JSON.stringify(data[year], null, 2).replace(/\n/g, '\n  ');

      return `  ${JSON.stringify(year)}: ${list}`;
    })
    .join(',\n');

  return `{\n${body}\n}\n`;
}

async function tmdb(path: string, params: Record<string, string>) {
  const url = new URL(`https://api.themoviedb.org/3${path}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  if (!isBearer) {
    url.searchParams.set('api_key', API_KEY!);
  }

  const response = await fetch(url, {
    headers: isBearer ? { Authorization: `Bearer ${API_KEY}` } : {},
  });

  if (!response.ok) {
    throw new Error(`TMDB ${response.status} на ${path}`);
  }

  return response.json();
}

async function search(
  kind: 'movie' | 'tv',
  query: string,
  year?: string,
  strict = true,
): Promise<Found[]> {
  const yearKey =
    kind === 'movie' ? 'primary_release_year' : 'first_air_date_year';
  const data = await tmdb(`/search/${kind}`, {
    query,
    language: 'ru-RU',
    include_adult: 'false',
    ...(year ? { [yearKey]: year } : {}),
  });

  type Result = {
    id: number;
    poster_path?: string;
    popularity?: number;
    release_date?: string;
    first_air_date?: string;
    title?: string;
    original_title?: string;
    name?: string;
    original_name?: string;
  };

  const results: Result[] = (data.results ?? []).filter(
    (r: Result) => r.poster_path,
  );

  /* У «Lamb» или «Tetris» первый результат обычно не тот — нужно точное. */
  const target = norm(query);
  const exact = results.filter((r) =>
    [r.title, r.original_title, r.name, r.original_name]
      .filter((t): t is string => Boolean(t))
      .some((t) => norm(t) === target),
  );

  const picked = exact.length ? exact : strict ? [] : results.slice(0, 1);

  return picked.map((r) => ({
    id: r.id,
    kind,
    posterPath: r.poster_path!,
    popularity: r.popularity ?? 0,
    year: Number((r.release_date ?? r.first_air_date ?? '').slice(0, 4)),
  }));
}

/** Ищет фильм: подмены, потом поиск от строгого к вольному. */
async function find(movie: Movie): Promise<Found | null> {
  const override =
    OVERRIDES[`${movie.originalTitle ?? movie.title}|${movie.releaseYear}`];

  if (override) {
    const data = await tmdb(`/${override.kind}/${override.id}`, {
      language: 'ru-RU',
    });

    if (data.poster_path) {
      return {
        id: override.id,
        kind: override.kind,
        posterPath: data.poster_path,
        popularity: data.popularity ?? 0,
        year: Number(
          (data.release_date ?? data.first_air_date ?? '').slice(0, 4),
        ),
      };
    }
  }

  const ru = stripSeason(movie.title);
  const orig = movie.originalTitle ? stripSeason(movie.originalTitle) : null;

  /* «1997-2002» не годится — берём первый год. */
  const year = movie.releaseYear.slice(0, 4);

  /* Диапазон лет или «сезон» в названии — сериал. */
  const isSeries =
    movie.releaseYear.includes('-') || /сезон/i.test(movie.title);
  const kinds: ('movie' | 'tv')[] = isSeries ? ['tv', 'movie'] : ['movie', 'tv'];
  const queries = [orig, ru].filter((q): q is string => Boolean(q));

  /* Точное с годом, точное без года, и лишь потом первое попавшееся. */
  const passes: { year?: string; strict: boolean }[] = [
    { year, strict: true },
    { strict: true },
    { year, strict: false },
    { strict: false },
  ];

  for (const pass of passes) {
    const found: Found[] = [];

    for (const kind of kinds) {
      for (const query of queries) {
        found.push(...(await search(kind, query, pass.year, pass.strict)));
      }
    }

    if (!found.length) continue;

    /* Точных совпадений бывает несколько: сериал и фильм, оригинал и ремейк. */
    if (pass.strict) {
      const ours = Number(year);

      /* Меньше — лучше, сравниваем по порядку. */
      const rank = (c: Found): number[] => [
        /* Сериалу — сериал. */
        isSeries && c.kind !== 'tv' ? 1 : 0,
        /* Год отсекает ремейки. У сериала он врёт, без даты — мусорный дубль. */
        isSeries ? 0 : c.year ? Math.abs(c.year - ours) : 50,
        -c.popularity,
      ];

      return found.reduce((a, b) => {
        const [ra, rb] = [rank(a), rank(b)];

        for (let i = 0; i < ra.length; i++) {
          if (ra[i] !== rb[i]) return rb[i] < ra[i] ? b : a;
        }

        return a;
      });
    }

    return found[0];
  }

  return null;
}

async function download(found: Found, file: string) {
  const response = await fetch(
    `https://image.tmdb.org/t/p/${POSTER_SIZE}${found.posterPath}`,
  );

  if (!response.ok) {
    throw new Error(`Постер не скачался: ${response.status}`);
  }

  await writeFile(file, new Uint8Array(await response.arrayBuffer()));
}

const byYear: Record<string, Movie[]> = JSON.parse(
  await Bun.file(MOVIES_JSON).text(),
);

/** Сверка: что за кино под этим id. Ничего не качает и не пишет. */
if (audit) {
  const checked = new Set<string>();
  const bad: string[] = [];

  for (const movies of Object.values(byYear)) {
    for (const movie of movies) {
      const parsed = movie.posterUrl?.match(/\/movies\/(movie|tv)-(\d+)\.jpg$/);

      if (!parsed) {
        bad.push(`${movie.title} — нет постера`);
        continue;
      }

      const [, kind, id] = parsed;

      if (checked.has(`${kind}-${id}`)) continue;

      checked.add(`${kind}-${id}`);

      const [ru, en] = await Promise.all([
        tmdb(`/${kind}/${id}`, { language: 'ru-RU' }),
        tmdb(`/${kind}/${id}`, { language: 'en-US' }),
      ]);

      const theirs = [
        ru.title,
        ru.name,
        ru.original_title,
        ru.original_name,
        en.title,
        en.name,
      ]
        .filter(Boolean)
        .map(norm);

      const ours = [movie.title, movie.originalTitle]
        .filter((v): v is string => Boolean(v))
        .map(norm);
      const titleOk = ours.some((o) => theirs.some((t) => t === o));

      const date = ru.release_date ?? ru.first_air_date ?? '';
      const theirYear = Number(date.slice(0, 4));
      const ourYear = Number(movie.releaseYear.slice(0, 4));

      /* У сериала TMDB отдаёт год первого сезона — сверять нечего. */
      const isSeries =
        movie.releaseYear.includes('-') || /сезон/i.test(movie.title);
      const yearOk =
        isSeries || !theirYear || !ourYear || Math.abs(theirYear - ourYear) <= 1;

      if (!titleOk || !yearOk) {
        const what = [!titleOk && 'название', !yearOk && 'год']
          .filter(Boolean)
          .join(' и ');

        bad.push(
          `${movie.title} (${movie.releaseYear}) → ${kind}-${id} ` +
            `«${ru.title ?? ru.name}» (${theirYear || '?'}) — не сходится ${what}`,
        );
      }

      await Bun.sleep(40);
    }
  }

  console.log(`Проверено: ${checked.size}, под вопросом: ${bad.length}\n`);
  for (const line of bad) console.log(`  ${line}`);

  process.exit(0);
}

await mkdir(POSTERS_DIR, { recursive: true });

/** Пересмотры ищем и качаем один раз. */
const seen = new Map<string, string | null>();
const missing: string[] = [];
const changed: string[] = [];
let downloaded = 0;
let skipped = 0;

for (const [year, movies] of Object.entries(byYear)) {
  for (const movie of movies) {
    if (movie.posterUrl && !force) {
      if (existsSync(`public${movie.posterUrl}`)) {
        skipped++;
        continue;
      }
    }

    const key = `${movie.originalTitle ?? movie.title}|${movie.releaseYear}`;

    if (seen.has(key)) {
      const cached = seen.get(key);

      if (cached) movie.posterUrl = cached;

      continue;
    }

    const label = `${movie.title} (${movie.releaseYear}), ${year}`;

    try {
      const found = await find(movie);

      if (!found) {
        seen.set(key, null);
        missing.push(label);
        console.log(`— не найден: ${label}`);
        continue;
      }

      const name = `${found.kind}-${found.id}.jpg`;
      const posterUrl = `/movies/${name}`;

      if (!dryRun && (force || !existsSync(`${POSTERS_DIR}/${name}`))) {
        await download(found, `${POSTERS_DIR}/${name}`);
      }

      const prev = movie.posterUrl;

      movie.posterUrl = posterUrl;
      seen.set(key, posterUrl);
      downloaded++;

      if (prev && prev !== posterUrl) {
        changed.push(`${label}: ${prev.split('/').pop()} → ${name}`);
        console.log(`~ ${label} → ${name} (было ${prev.split('/').pop()})`);
      } else {
        console.log(`+ ${label} → ${name}`);
      }
    } catch (error) {
      seen.set(key, null);
      missing.push(label);
      console.log(`! ошибка на «${label}»: ${(error as Error).message}`);
    }

    await Bun.sleep(60);
  }
}

if (!dryRun) {
  await writeFile(MOVIES_JSON, serialize(byYear));

  /* Постеры, на которые больше не ссылаются. */
  const used = new Set(
    Object.values(byYear)
      .flat()
      .map((m) => m.posterUrl?.split('/').pop())
      .filter(Boolean),
  );

  for (const file of new Bun.Glob('*.jpg').scanSync(POSTERS_DIR)) {
    if (!used.has(file)) {
      await unlink(`${POSTERS_DIR}/${file}`);
      console.log(`− убран лишний ${file}`);
    }
  }
}

console.log(
  `\nГотово. Новых: ${downloaded}, пропущено: ${skipped}, не найдено: ${missing.length}`,
);

if (changed.length) {
  console.log(`\nПоменялся постер (${changed.length}) — проверить глазами:`);
  for (const line of changed) console.log(`  ${line}`);
}

if (missing.length) {
  console.log('\nДобить руками:');
  for (const label of missing) console.log(`  ${label}`);
}
