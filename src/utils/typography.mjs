// Русская микротипографика. Отдельно от remark-плагина: посты идут через
// плагин, тексты в .astro и json — мимо, а правила должны быть одни.

const NBSP = ' ';

function quotes(value) {
  let depth = 0;

  return value.replace(/"/g, () => {
    const open = depth % 2 === 0;
    const pair = depth < 2 ? ['«', '»'] : ['„', '“'];

    depth += open ? 1 : -1;

    return open ? pair[0] : pair[1];
  });
}

function typographize(value) {
  let s = value;

  s = s.replace(/ {2,}/g, ' ');

  s = s.replace(/\.{3,}/g, '…');

  s = s.replace(/(\s)-{1,2}(\s)/g, '$1—$2');

  s = s.replace(/(\d)\s*-\s*(?=\d)/g, '$1–');

  s = s.replace(/[“]/g, '«').replace(/[”]/g, '»');

  s = quotes(s);

  s = s.replace(/(\p{L})'(\p{L})/gu, '$1’$2');

  // Предлоги в один-два знака. Лукбехайнд, иначе в «и в лесу»
  // второй остался бы без неразрывного.
  s = s.replace(
    /(?<=^|[\s(«„—-])([а-яёa-z]{1,2}) (?=[«„(]?\p{L})/giu,
    `$1${NBSP}`,
  );

  // «5 км», «2026 году».
  s = s.replace(/(\d) (?=\p{L})/gu, `$1${NBSP}`);

  // № и § не в конце строки.
  s = s.replace(/([№§]) *(?=\d)/g, `$1${NBSP}`);

  // Тире и стрелка не начинают строку.
  s = s.replace(/(\S) ([—→])/g, `$1${NBSP}$2`);

  return s;
}

/** То же по строке с разметкой: теги не трогает, но видит сквозь них. */
function typographizeHtml(html) {
  const flat = html.replace(/\s+/g, ' ').trim();

  let s = flat
    .split(/(<[^>]+>)/)
    .map((part, i) => (i % 2 ? part : typographize(part)))
    .join('');

  // Предлог перед тегом: «в <s>Самаре</s>».
  s = s.replace(
    /(?<=^|[\s(«„—-])([а-яёa-z]{1,2}) (?=(?:<[^>]+>)+[«„(]?\p{L})/giu,
    `$1${NBSP}`,
  );

  s = s.replace(/(<\/[^>]+>) ([—→])/g, `$1${NBSP}$2`);

  return s;
}

export { typographize, typographizeHtml };
