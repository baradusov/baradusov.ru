const W = 480;
const H = 800;

const INK = '#000000';
const PAPER = '#ffffff';

const DRAFT = 'postcards.draft.v1';
const MINE = 'postcards.mine.v1';
const MINE_TTL = 30 * 24 * 60 * 60 * 1000;

const API =
  import.meta.env.PUBLIC_POSTCARDS_API?.replace(/\/$/, '') ??
  'http://localhost:4400';

const TEXT = {
  emptyBox: 'Здесь пока пусто.',
  boxFailed: 'Не получилось загрузить записки. Попробуй обновить страницу.',

  tooOften: (wait: string) => `Слишком много записок. Попробуй ${wait}.`,
  tooOftenSoon: 'Слишком много записок. Попробуй попозже.',
  queueFull: 'У меня скопилась очередь. Попробуй завтра.',
  tooLarge: 'Рисунок слишком тяжёлый. Попробуй попроще.',
  invalid: 'Что-то не так с рисунком.',
  sendFailed: 'Не получилось отправить. Попробуй ещё раз.',
  offline: 'Не получилось отправить. Проверь интернет.',

  inAMinute: 'через минуту',
  inAnHour: 'через час',
  inTime: (amount: number, unit: string) => `через ${amount} ${unit}`,
  minutes: ['минуту', 'минуты', 'минут'],
  hours: ['час', 'часа', 'часов'],

  cardLabel: (message: string) => `Открытка: ${message}`,
  cardLabelBlank: 'Открытка без подписи',
  pendingNote: 'На модерации',
  cardPending: (label: string, note: string) => `${label} — ${note}`,
} as const;

const MESSAGE_MAX = 70;

type Tool = 'pen' | 'eraser';

type Stroke = {
  tool: Tool;
  size: number;
  points: number[];
};

type Card = {
  id: string;
  pending?: boolean;
  message: string;
  link: string;
  createdAt: number;
  strokes: Stroke[];
};

const canAnimate = () => typeof Element.prototype.animate === 'function';

const calm = () =>
  !canAnimate() ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function paintStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  upTo = Infinity,
) {
  const p = stroke.points;
  const count = Math.min(p.length / 2, upTo);
  if (count < 1) return;

  const color = stroke.tool === 'eraser' ? PAPER : INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke.size;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  if (count === 1) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);

  if (count === 2) {
    ctx.lineTo(p[2], p[3]);
  } else {
    for (let i = 1; i < count - 1; i++) {
      const cx = p[i * 2];
      const cy = p[i * 2 + 1];
      ctx.quadraticCurveTo(
        cx,
        cy,
        (cx + p[i * 2 + 2]) / 2,
        (cy + p[i * 2 + 3]) / 2,
      );
    }
    ctx.lineTo(p[(count - 1) * 2], p[(count - 1) * 2 + 1]);
  }

  ctx.stroke();
}

function paintAll(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  for (const stroke of strokes) paintStroke(ctx, stroke);
}

function safeUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return '';

  try {
    const url = new URL(
      /^[a-z]+:\/\//i.test(value) ? value : `https://${value}`,
    );
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : '';
  } catch {
    return '';
  }
}

const prettyLink = (raw: string) =>
  raw.replace(/^https?:\/\//, '').replace(/\/$/, '');

function fillCaption(box: Element, item: Card) {
  const link = box.querySelector<HTMLAnchorElement>('.pc-caption-link');
  const plain = box.querySelector<HTMLElement>('.pc-caption-plain');
  if (!link || !plain) return;

  const label = item.message || prettyLink(item.link);

  if (item.link && label) {
    link.href = item.link;
    link.textContent = label;
    link.hidden = false;
    plain.textContent = '';
  } else {
    link.hidden = true;
    link.removeAttribute('href');
    link.textContent = '';
    plain.textContent = label;
  }
}

function fit(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round((rect.width || W) * dpr));
  const h = Math.max(1, Math.round((rect.height || H) * dpr));

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('нет 2d-контекста');
  ctx.setTransform(w / W, 0, 0, h / H, 0, 0);
  return ctx;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function init() {
  const root = document.querySelector<HTMLElement>('[data-postcard]');
  if (!root) return;

  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel);

  const card = $<HTMLElement>('.pc-card');
  const canvas = $<HTMLCanvasElement>('.pc-canvas');
  const messageInput = $<HTMLInputElement>('.pc-message');
  const linkInput = $<HTMLInputElement>('.pc-link');
  const sendButton = $<HTMLButtonElement>('.pc-send');
  const undoButton = $<HTMLButtonElement>('[data-act="undo"]');
  const redoButton = $<HTMLButtonElement>('[data-act="redo"]');
  const clearButton = $<HTMLButtonElement>('[data-act="clear"]');
  const gallery = $<HTMLElement>('.pc-gallery');
  const itemTemplate = $<HTMLTemplateElement>('.pc-item-tpl');
  const statusNote = $<HTMLElement>('.pc-status');
  const emptyNote = $<HTMLElement>('.pc-empty');
  const dialog = $<HTMLDialogElement>('.pc-viewer');

  if (
    !card ||
    !canvas ||
    !messageInput ||
    !linkInput ||
    !sendButton ||
    !undoButton ||
    !redoButton ||
    !clearButton ||
    !gallery ||
    !dialog ||
    !itemTemplate
  ) {
    return;
  }

  const bin = new AbortController();
  const { signal } = bin;
  document.addEventListener('astro:before-swap', () => bin.abort(), {
    once: true,
  });

  let strokes: Stroke[] = load<Stroke[]>(DRAFT, []);
  let undone: Stroke[] = [];
  let live: Stroke | null = null;
  let tool: Tool = 'pen';
  let size = 7;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const done = document.createElement('canvas');
  const doneCtx = done.getContext('2d');
  if (!doneCtx) return;

  function syncDone() {
    done.width = canvas!.width;
    done.height = canvas!.height;
    doneCtx!.setTransform(done.width / W, 0, 0, done.height / H, 0, 0);
    paintAll(doneCtx!, strokes);
  }

  function repaint() {
    ctx!.save();
    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    ctx!.drawImage(done, 0, 0, canvas!.width, canvas!.height);
    ctx!.restore();
    if (live) paintStroke(ctx!, live);
  }

  function relayout() {
    fit(canvas!);
    syncDone();
    repaint();
  }

  function syncButtons() {
    undoButton!.disabled = strokes.length === 0;
    redoButton!.disabled = undone.length === 0;
    clearButton!.disabled = strokes.length === 0;
    sendButton!.disabled = strokes.length === 0;
  }

  function commitDraft() {
    save(DRAFT, strokes);
    syncButtons();
  }

  const at = (e: PointerEvent): [number, number] => {
    const r = canvas!.getBoundingClientRect();
    return [
      ((e.clientX - r.left) / r.width) * W,
      ((e.clientY - r.top) / r.height) * H,
    ];
  };

  function push(rawX: number, rawY: number) {
    if (!live) return;

    const x = Math.round(rawX);
    const y = Math.round(rawY);

    const p = live.points;
    if (p.length >= 2) {
      const dx = x - p[p.length - 2];
      const dy = y - p[p.length - 1];
      if (dx * dx + dy * dy < 2.25) return;
    }
    p.push(x, y);
  }

  canvas.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      showStatus('');
      canvas.setPointerCapture(e.pointerId);
      live = { tool, size: tool === 'eraser' ? size * 3 : size, points: [] };
      const [x, y] = at(e);
      push(x, y);
      repaint();
      e.preventDefault();
    },
    { signal },
  );

  canvas.addEventListener(
    'pointermove',
    (e) => {
      if (!live) return;
      const batch = e.getCoalescedEvents?.() ?? [];
      for (const point of batch.length ? batch : [e]) {
        const [x, y] = at(point);
        push(x, y);
      }
      repaint();
      e.preventDefault();
    },
    { signal },
  );

  const endStroke = () => {
    if (!live) return;
    paintStroke(doneCtx, live);
    strokes.push(live);
    live = null;
    undone = [];
    repaint();
    commitDraft();
  };

  canvas.addEventListener('pointerup', endStroke, { signal });
  canvas.addEventListener('pointercancel', endStroke, { signal });

  for (const button of root.querySelectorAll<HTMLButtonElement>(
    '[data-tool]',
  )) {
    button.addEventListener(
      'click',
      () => {
        tool = button.dataset.tool as Tool;
        for (const other of root.querySelectorAll('[data-tool]')) {
          other.setAttribute('aria-pressed', String(other === button));
        }
      },
      { signal },
    );
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>(
    '[data-size]',
  )) {
    button.addEventListener(
      'click',
      () => {
        size = Number(button.dataset.size);
        for (const other of root.querySelectorAll('[data-size]')) {
          other.setAttribute('aria-pressed', String(other === button));
        }
      },
      { signal },
    );
  }

  undoButton.addEventListener(
    'click',
    () => {
      const last = strokes.pop();
      if (!last) return;
      undone.push(last);
      syncDone();
      repaint();
      commitDraft();
    },
    { signal },
  );

  redoButton.addEventListener(
    'click',
    () => {
      const next = undone.pop();
      if (!next) return;
      strokes.push(next);
      paintStroke(doneCtx, next);
      repaint();
      commitDraft();
    },
    { signal },
  );

  clearButton.addEventListener(
    'click',
    () => {
      undone = strokes.slice().reverse().concat(undone);
      strokes = [];
      syncDone();
      repaint();
      commitDraft();
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      if (dialog.open) return;
      e.preventDefault();
      (e.shiftKey ? redoButton : undoButton).click();
    },
    { signal },
  );

  window.addEventListener('resize', relayout, { signal });

  let cards: Card[] = [];
  let mine: Card[] = load<Card[]>(MINE, []).filter(
    (item) => Date.now() - item.createdAt < MINE_TTL,
  );

  async function dropDecided() {
    if (!mine.length) return;

    const ids = mine.map((item) => item.id).join(',');
    const response = await fetch(
      `${API}/api/postcards/status?ids=${encodeURIComponent(ids)}`,
    );
    if (!response.ok) return;

    const { statuses } = (await response.json()) as {
      statuses: Record<string, string>;
    };
    mine = mine.filter(
      (item) => (statuses[item.id] ?? 'pending') === 'pending',
    );
    save(MINE, mine);
  }

  async function loadGallery() {
    try {
      await dropDecided().catch(() => {});

      const response = await fetch(`${API}/api/postcards?limit=60`);
      if (!response.ok) throw new Error(String(response.status));

      const data = (await response.json()) as { postcards: Card[] };
      const published = new Set(data.postcards.map((item) => item.id));

      cards = [
        ...mine
          .filter((item) => !published.has(item.id))
          .map((item) => ({ ...item, pending: true })),
        ...data.postcards,
      ];

      renderGallery();
      showEmpty(cards.length === 0 ? TEXT.emptyBox : '');
    } catch {
      cards = mine.map((item) => ({ ...item, pending: true }));
      renderGallery();
      showEmpty(cards.length ? '' : TEXT.boxFailed);
    }
  }

  function showEmpty(text: string) {
    if (!emptyNote) return;
    emptyNote.textContent = text;
    emptyNote.hidden = !text;
  }

  function renderGallery(highlight?: string) {
    gallery!.replaceChildren();

    for (const [index, item] of cards.entries()) {
      const li = itemTemplate!.content.firstElementChild?.cloneNode(true);
      if (!(li instanceof HTMLElement)) continue;

      const button = li.querySelector('button');
      const thumb = li.querySelector('canvas');
      if (!button || !thumb) continue;

      if (item.id === highlight) li.classList.add('is-new');
      if (item.pending) li.classList.add('is-pending');

      fillCaption(li, item);

      const note = li.querySelector<HTMLElement>('.pc-caption-note');
      if (note) {
        note.textContent = TEXT.pendingNote;
        note.hidden = !item.pending;
      }

      const label = item.message
        ? TEXT.cardLabel(item.message)
        : TEXT.cardLabelBlank;
      button.setAttribute(
        'aria-label',
        item.pending ? TEXT.cardPending(label, TEXT.pendingNote) : label,
      );
      button.addEventListener('click', () => openViewer(index), { signal });

      gallery!.append(li);

      paintAll(fit(thumb), item.strokes);
    }
  }

  const viewCanvas =
    dialog.querySelector<HTMLCanvasElement>('.pc-viewer__canvas');
  const viewWho = dialog.querySelector<HTMLElement>('.pc-viewer__who');
  const prevButton =
    dialog.querySelector<HTMLButtonElement>('.pc-viewer__prev');
  const nextButton =
    dialog.querySelector<HTMLButtonElement>('.pc-viewer__next');

  let viewing = 0;

  function show(index: number) {
    if (!viewCanvas || !viewWho || !prevButton || !nextButton) return;

    viewing = Math.max(0, Math.min(cards.length - 1, index));
    const item = cards[viewing];
    if (!item) return;

    paintAll(fit(viewCanvas), item.strokes);
    fillCaption(viewWho, item);

    prevButton.disabled = viewing === 0;
    nextButton.disabled = viewing === cards.length - 1;
  }

  const openDialog = () => {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
  };

  const closeDialog = () => {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    document.body.style.overflow = '';
  };

  function openViewer(index: number) {
    openDialog();
    show(index);
  }

  prevButton?.addEventListener('click', () => show(viewing - 1), { signal });
  nextButton?.addEventListener('click', () => show(viewing + 1), { signal });

  dialog.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'ArrowLeft') show(viewing - 1);
      else if (e.key === 'ArrowRight') show(viewing + 1);
    },
    { signal },
  );

  let swipeFrom: number | null = null;
  viewCanvas?.addEventListener(
    'pointerdown',
    (e) => {
      swipeFrom = e.clientX;
    },
    { signal },
  );
  viewCanvas?.addEventListener(
    'pointerup',
    (e) => {
      if (swipeFrom === null) return;
      const dx = e.clientX - swipeFrom;
      swipeFrom = null;
      if (Math.abs(dx) > 40) show(viewing + (dx < 0 ? 1 : -1));
    },
    { signal },
  );

  dialog.addEventListener(
    'click',
    (e) => {
      if (e.target === dialog) closeDialog();
    },
    { signal },
  );

  dialog
    .querySelector('.pc-viewer__close')
    ?.addEventListener('click', () => closeDialog(), { signal });

  function bezier(
    t: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
  ) {
    const u = 1 - t;
    return {
      x: u * u * ax + 2 * u * t * bx + t * t * cx,
      y: u * u * ay + 2 * u * t * by + t * t * cy,
    };
  }

  function firstCell() {
    const first = gallery!.querySelector('.pc-item');
    if (first) return first.getBoundingClientRect();

    const box = gallery!.getBoundingClientRect();
    const column =
      parseFloat(getComputedStyle(gallery!).gridTemplateColumns) || box.width;
    return { left: box.left, top: box.top, width: column };
  }

  async function fly(onLift: () => void) {
    const target = firstCell();
    const start = card!.getBoundingClientRect();

    const flyer = card!.cloneNode(true) as HTMLElement;
    flyer.classList.add('pc-card--flying');
    const copy = flyer.querySelector('canvas');
    if (copy) {
      copy.width = canvas!.width;
      copy.height = canvas!.height;
      copy.getContext('2d')?.drawImage(canvas!, 0, 0);
    }
    Object.assign(flyer.style, {
      left: `${start.left}px`,
      top: `${start.top}px`,
      width: `${start.width}px`,
      height: `${start.height}px`,
    });
    document.body.append(flyer);
    onLift();

    const dx = target.left + target.width / 2 - (start.left + start.width / 2);
    const dy =
      target.top +
      (target.width * (H / W)) / 2 -
      (start.top + start.height / 2);
    const end = target.width / start.width;

    const frames: Keyframe[] = [];
    const steps = 36;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = bezier(t, 0, 0, dx * 0.5, dy * 0.5 - 120, dx, dy);
      const tilt = -14 * Math.sin(Math.PI * t);
      frames.push({
        transform: `translate(${p.x}px, ${p.y}px) rotate(${tilt}deg) scale(${1 + (end - 1) * t})`,
      });
    }

    try {
      await flyer.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.03) rotate(-1.5deg)' },
        ],
        { duration: 170, easing: 'ease-out', fill: 'forwards' },
      ).finished;

      await flyer.animate(frames, {
        duration: 850,
        easing: 'cubic-bezier(.4,0,.5,1)',
        fill: 'forwards',
      }).finished;
    } catch {}

    return flyer;
  }

  function showStatus(text: string, kind: 'ok' | 'error' = 'ok') {
    if (!statusNote) return;
    statusNote.textContent = text;
    statusNote.hidden = !text;
    statusNote.dataset.kind = kind;
  }

  const excuses: Record<string, string> = {
    'queue-full': TEXT.queueFull,
    'too-large': TEXT.tooLarge,
    invalid: TEXT.invalid,
  };

  const plural = (n: number, forms: readonly string[]) => {
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return forms[2]!;
    const mod10 = n % 10;
    if (mod10 === 1) return forms[0]!;
    if (mod10 >= 2 && mod10 <= 4) return forms[1]!;
    return forms[2]!;
  };

  function waitFor(seconds: number) {
    const minutes = Math.ceil(seconds / 60);
    if (minutes <= 1) return TEXT.inAMinute;
    if (minutes < 60)
      return TEXT.inTime(minutes, plural(minutes, TEXT.minutes));

    const hours = Math.ceil(minutes / 60);
    if (hours === 1) return TEXT.inAnHour;
    return TEXT.inTime(hours, plural(hours, TEXT.hours));
  }

  async function send(draft: {
    message: string;
    link: string;
    strokes: Stroke[];
  }): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
    try {
      const response = await fetch(`${API}/api/postcards`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      });

      if (response.ok) {
        const { id } = (await response.json()) as { id: string };
        return { ok: true, id };
      }

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        retryAfter?: number;
      } | null;

      if (body?.error === 'too-many-from-ip') {
        const seconds =
          body.retryAfter ?? Number(response.headers.get('retry-after')) ?? 0;
        return {
          ok: false,
          message: seconds
            ? TEXT.tooOften(waitFor(seconds))
            : TEXT.tooOftenSoon,
        };
      }

      return {
        ok: false,
        message: excuses[body?.error ?? ''] ?? TEXT.sendFailed,
      };
    } catch {
      return { ok: false, message: TEXT.offline };
    }
  }

  sendButton.addEventListener(
    'click',
    async () => {
      if (!strokes.length || sendButton.disabled) return;
      sendButton.disabled = true;

      for (const stuck of document.querySelectorAll('.pc-card--flying')) {
        stuck.remove();
      }

      showStatus('');

      const sent = {
        message: messageInput.value.trim().slice(0, MESSAGE_MAX),
        link: safeUrl(linkInput.value),
        strokes,
      };

      const clearBoard = () => {
        strokes = [];
        undone = [];
        messageInput.value = '';
        linkInput.value = '';
        syncDone();
        repaint();
        commitDraft();
      };

      const request = send(sent);

      const fresh: Card = {
        ...sent,
        id: `local-${Date.now().toString(36)}`,
        createdAt: Date.now(),
        pending: true,
      };

      let flyer: HTMLElement | undefined;
      try {
        if (calm()) {
          clearBoard();
          if (canAnimate()) {
            card.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], {
              duration: 400,
            });
          }
        } else {
          flyer = await fly(clearBoard);
        }

        cards = [fresh, ...cards];
        renderGallery(fresh.id);
        showEmpty('');
      } finally {
        flyer?.remove();
      }

      syncButtons();

      const outcome = await request;
      if (outcome.ok) {
        fresh.id = outcome.id;
        mine = [fresh, ...mine];
        save(MINE, mine);
      } else {
        cards = cards.filter((item) => item !== fresh);
        renderGallery();
        showEmpty(cards.length === 0 ? TEXT.emptyBox : '');

        strokes = sent.strokes;
        undone = [];
        messageInput.value = sent.message;
        linkInput.value = sent.link;
        syncDone();
        repaint();
        commitDraft();
        showStatus(outcome.message, 'error');
      }

      syncButtons();
    },
    { signal },
  );

  relayout();
  syncButtons();
  void loadGallery();
}

document.addEventListener('astro:page-load', init);
