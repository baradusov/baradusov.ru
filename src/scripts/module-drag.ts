import { closeSound } from './audio';
import { lift, thud } from './drag-sound';

type Slot = { col: string; row: number; span: number };

// Повторяет раскладку .modules из index.astro — менять надо вместе.
const SLOTS: Slot[] = [
  { col: '1', row: 0, span: 1 },
  { col: '1', row: 1, span: 1 },
  { col: '2', row: 0, span: 2 },
  { col: '1 / -1', row: 2, span: 1 },
  { col: '1', row: 3, span: 1 },
  { col: '2', row: 3, span: 1 },
  { col: '1 / -1', row: 4, span: 1 },
];

const ROWS = 5;
const EDGE = 72;
const SPEED = 18;
const WIDE = '(min-width: 701px)';
const EASE = 'transform 180ms ease';

type Box = { left: number; top: number; width: number; height: number };

const layoutBox = (el: HTMLElement): Box => ({
  left: el.offsetLeft,
  top: el.offsetTop,
  width: el.offsetWidth,
  height: el.offsetHeight,
});

const inside = (box: Box, x: number, y: number) =>
  x >= box.left &&
  x <= box.left + box.width &&
  y >= box.top &&
  y <= box.top + box.height;

export const initModuleDrag = () => {
  const grid = document.querySelector<HTMLElement>('[data-modules]');
  if (!grid) return;

  const modules = [...grid.querySelectorAll<HTMLElement>('.module')];
  if (modules.length !== SLOTS.length) return;

  const media = window.matchMedia(WIDE);

  const initial = modules.map((_, index) => index);
  let order = [...initial];

  const untouched = () => order.every((value, index) => value === index);

  const place = () => {
    order.forEach((moduleIndex, slotIndex) => {
      const slot = SLOTS[slotIndex];
      const el = modules[moduleIndex];
      el.style.gridColumn = slot.col;
      el.style.gridRow = `${slot.row + 1} / span ${slot.span}`;
    });
  };

  const unplace = () => {
    modules.forEach((el) => {
      el.style.gridColumn = '';
      el.style.gridRow = '';
      el.style.transform = '';
      el.style.transition = '';
    });
  };

  const glide = (moves: { el: HTMLElement; from: DOMRect }[]) => {
    moves.forEach(({ el }) => {
      el.style.transition = 'none';
      el.style.transform = '';
    });

    const deltas = moves
      .map(({ el, from }) => {
        const now = el.getBoundingClientRect();
        return { el, dx: from.left - now.left, dy: from.top - now.top };
      })
      .filter(({ dx, dy }) => dx || dy);

    deltas.forEach(({ el, dx, dy }) => {
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });

    // Иначе браузер увидит только конечное состояние и анимации не будет.
    void grid.offsetWidth;

    deltas.forEach(({ el }) => {
      el.style.transition = EASE;
      el.style.transform = '';
    });
  };

  const rearrange = (change: () => void, skip?: HTMLElement) => {
    const moves = modules
      .filter((el) => el !== skip)
      .map((el) => ({ el, from: el.getBoundingClientRect() }));

    change();
    place();
    glide(moves);
  };

  let drag: {
    el: HTMLElement;
    index: number;
    grabX: number;
    grabY: number;
    slots: Box[];
    order: number[];
  } | null = null;

  const pointer = { x: 0, y: 0 };
  let frame = 0;

  const update = () => {
    if (!drag) return;

    const gridRect = grid.getBoundingClientRect();
    const x = pointer.x - gridRect.left;
    const y = pointer.y - gridRect.top;

    const from = order.indexOf(drag.index);
    const to = drag.slots.findIndex(
      (box, slotIndex) => slotIndex !== from && inside(box, x, y),
    );

    if (to !== -1) {
      rearrange(() => {
        [order[from], order[to]] = [order[to], order[from]];
      }, drag.el);
    }

    drag.el.style.transform = `translate(${
      x - drag.grabX - drag.el.offsetLeft
    }px, ${y - drag.grabY - drag.el.offsetTop}px)`;
  };

  // Своя докрутка у краёв: сам браузер возит страницу только под нативным
  // drag-and-drop, а у нас перетаскивание на указателе.
  const follow = () => {
    if (!drag) return;

    const above = pointer.y - EDGE;
    const below = pointer.y - (window.innerHeight - EDGE);
    const near = above < 0 ? above : below > 0 ? below : 0;

    if (near) {
      window.scrollBy(0, Math.max(-1, Math.min(1, near / EDGE)) * SPEED);
    }

    update();
    frame = requestAnimationFrame(follow);
  };

  const move = (event: PointerEvent) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  };

  // Тихо роняем, когда перетаскивание сворачивает не человек, а мы сами:
  // смена раскладки на узкую или уход со страницы — это не бросок.
  const drop = (cancelled: boolean, quiet = false) => {
    if (!drag) return;
    if (!quiet) thud();

    const { el, order: before } = drag;
    const lifted = el.getBoundingClientRect();

    el.classList.remove('is-dragging');
    grid.classList.remove('is-dragging');
    cancelAnimationFrame(frame);
    drag = null;

    rearrange(() => {
      if (cancelled) order = before;
      grid.style.gridTemplateRows = '';
    }, el);

    glide([{ el, from: lifted }]);

    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('keydown', onKey);
  };

  const onUp = () => drop(false);
  const onCancel = () => drop(true);
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') drop(true);
  };

  const onDown = (event: PointerEvent) => {
    if (!media.matches || drag) return;
    if (event.button !== 0 || event.pointerType === 'touch') return;

    const target = event.target as HTMLElement | null;
    const el = target
      ?.closest('.section-label')
      ?.closest<HTMLElement>('.module');
    if (!el) return;

    event.preventDefault();
    lift();
    place();

    const slots = order.map((moduleIndex) => layoutBox(modules[moduleIndex]));

    // Высоты строк держим неизменными до конца перетаскивания: иначе после
    // обмена ячейки разъезжаются под курсором и модули прыгают туда-сюда.
    const heights = Array<number>(ROWS).fill(0);
    order.forEach((moduleIndex, slotIndex) => {
      const slot = SLOTS[slotIndex];
      if (slot.span !== 1) return;
      const height = modules[moduleIndex].offsetHeight;
      heights[slot.row] = Math.max(heights[slot.row], height);
    });
    grid.style.gridTemplateRows = heights.map((h) => `${h}px`).join(' ');

    const rect = el.getBoundingClientRect();
    drag = {
      el,
      index: modules.indexOf(el),
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      slots,
      order: [...order],
    };

    pointer.x = event.clientX;
    pointer.y = event.clientY;
    frame = requestAnimationFrame(follow);

    el.style.transition = 'none';
    el.classList.add('is-dragging');
    grid.classList.add('is-dragging');

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);
  };

  const sync = () => {
    if (media.matches) {
      if (!untouched()) place();
      return;
    }
    if (drag) drop(true, true);
    grid.style.gridTemplateRows = '';
    unplace();
  };

  grid.addEventListener('pointerdown', onDown);
  media.addEventListener?.('change', sync);

  document.addEventListener(
    'astro:before-swap',
    () => {
      if (drag) drop(true, true);
      closeSound();
      grid.removeEventListener('pointerdown', onDown);
      media.removeEventListener?.('change', sync);
    },
    { once: true },
  );
};
