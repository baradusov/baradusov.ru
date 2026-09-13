/**
 * Разовик: находит фильмы в TMDB и раскладывает постеры в public/movies.
 *
 *   TMDB_API_KEY=... bun run scripts/fetch-posters.ts
 *   TMDB_API_KEY=... bun run scripts/fetch-posters.ts --dry-run
 *   TMDB_API_KEY=... bun run scripts/fetch-posters.ts --force
 *
 * Ключ берётся с themoviedb.org/settings/api — подходит и v3 (api_key),
 * и v4 (Bearer, начинается с «eyJ»).
 *
 * Скрипт идемпотентен: фильмы, у которых posterUrl уже есть и файл на месте,
 * пропускаются. Что не нашлось — печатается списком в конце, такие постеры
 * кладём в public/movies руками и дописываем posterUrl.
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

/**
 * Поиск берёт первый результат с постером, и на неоднозначных названиях
 * промахивается: находит одноимённый мусор с недавним id вместо нужного кино.
 * Здесь — выверенные вручную id по ключу «originalTitle|releaseYear».
 */
const OVERRIDES: Record<string, { kind: 'movie' | 'tv'; id: number }> = {
  // Вонг Карвай, 墮落天使 — поиск давал одноимённый фильм-однодневку.
  'Fallen Angels|1995': { kind: 'movie', id: 11220 },
  // Сериал, а не фильм.
  'Wayne|2019': { kind: 'tv', id: 84231 },
  'Normal People|2020': { kind: 'tv', id: 89905 },
  // В данных стоит 2005, у Нила Армфилда с Хитом Леджером — 2006.
  'Candy|2005': { kind: 'movie', id: 4441 },
  // Аниме Осиямы, а не одноимённый триллер «Don't Look Back».
  'Look Back|2024': { kind: 'movie', id: 1244492 },
  // Сериал Apple TV+, а не одноимённый инди-фильм того же года.
  'Severance|2022': { kind: 'tv', id: 95396 },
  // Фильм Шан Хидер вышел в 2021-м, и на 2020-й приходится другая «Кода».
  'CODA|2020': { kind: 'movie', id: 776503 },
  // Фильм Маккарти вышел в 2021-м, а на 2020-й попадает мультсериал про панду.
  'Stillwater|2020': { kind: 'movie', id: 616651 },
};

/** Для сравнения названий: регистр, пунктуация и пробелы не в счёт. */
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

/**
 * JSON.stringify по объекту выкладывает ключи-числа по возрастанию, и годы
 * переворачиваются. Пишем вручную: сначала разделы с именем («Смотрю»),
 * затем годы от свежих к старым — как в файле и заведено.
 */
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

  /*
   * Короткие английские названия («Lamb», «Enemy», «Tetris») выдают кучу
   * однофамильцев, и первый результат сплошь и рядом не тот. Поэтому сперва
   * ищем точные совпадения названия и только потом соглашаемся на первое
   * попавшееся.
   */
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

/**
 * Пробуем по очереди: оригинальное название с годом, русское с годом,
 * то же самое как сериал, и уже под конец — без года.
 */
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

  /* «1997-2002» в поиск не годится — берём первый год. */
  const year = movie.releaseYear.slice(0, 4);

  /* Диапазон лет или «(1 сезон)» в названии — это сериал, его и ищем первым. */
  const isSeries =
    movie.releaseYear.includes('-') || /сезон/i.test(movie.title);
  const kinds: ('movie' | 'tv')[] = isSeries ? ['tv', 'movie'] : ['movie', 'tv'];
  const queries = [orig, ru].filter((q): q is string => Boolean(q));

  /*
   * Проходы от строгого к вольному: точное совпадение с годом, точное без
   * года, и только под конец — первый попавшийся результат.
   */
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

    /*
     * Одноимённых работ бывает несколько: «Severance» — сериал Apple TV+ и
     * инди-фильм того же года, «Виновный» — датский оригинал и американский
     * ремейк, «Чёрное зеркало» — сериал и полнометражный «Бандерснэтч».
     */
    if (pass.strict) {
      const ours = Number(year);

      /* Меньше — лучше; сравниваем по порядку. */
      const rank = (c: Found): number[] => [
        /* У сериала берём сериал: одноимённый фильм рядом бывает всегда. */
        isSeries && c.kind !== 'tv' ? 1 : 0,
        /*
         * Год отсекает ремейки, но у сериала TMDB отдаёт год первого сезона,
         * а у нас может стоять год седьмого — там сверять нечего. Запись без
         * даты выхода — обычно мусорный дубль, и её надо штрафовать, а не
         * засчитывать как точное попадание.
         */
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

/**
 * Сверка: по id из имени файла спрашиваем у TMDB, что это за кино,
 * и сравниваем с нашими названиями. Ничего не качает и не пишет.
 */
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

      /*
       * У сериала TMDB отдаёт год первого сезона, а в списке может стоять год
       * седьмого — сверять тут нечего.
       */
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

/** Один и тот же фильм в разных годах (пересмотры) ищем и качаем один раз. */
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

  /* Постеры, на которые больше никто не ссылается, в репозитории не нужны. */
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
