import { createClicker } from './reel-click';

const NAMES = ['Нуриль', 'Нурик', 'Юрий', 'Николай', 'Нурсултан'];
const EASE = '180ms ease';
const FRICTION = 0.94;
const MAX_SPEED = 3;
const MIN_SPEED = 0.05;
const CALM = window.matchMedia('(prefers-reduced-motion: reduce)');

export const initNameReel = () => {
  const host = document.querySelector<HTMLElement>('[data-name]');
  if (!host) return;

  let index = NAMES.indexOf(host.textContent?.trim() ?? '');
  if (index === -1) return;

  // Видимое имя — обычный текст, соседние по бокам рисуют псевдоэлементы:
  // их нет в DOM, поэтому они не попадают ни в копирование, ни в скринридер.
  const slide = document.createElement('span');
  slide.className = 'name__slide';

  host.textContent = '';
  host.append(slide);
  host.classList.add('is-live');

  let widths: number[] = [];
  let gap = 0;
  let shift = 0;
  let settling = 0;
  let spinning = 0;
  let pointer = 0;
  let speed = 0;
  let moment = 0;
  let quiet = false;

  const clicker = createClicker();

  // Чем быстрее идёт барабан, тем громче зубец, — как у настоящей трещотки.
  const knock = () => {
    if (quiet) return;
    clicker.click(0.35 + Math.min(1, Math.abs(speed) / 1.5) * 0.65);
  };

  const wrap = (position: number) =>
    ((position % NAMES.length) + NAMES.length) % NAMES.length;

  const nameAt = (position: number) => NAMES[wrap(position)];
  const widthAt = (position: number) => widths[wrap(position)] ?? 0;

  const paint = () => {
    slide.textContent = nameAt(index);
    slide.dataset.prev = nameAt(index - 1);
    slide.dataset.next = nameAt(index + 1);
  };

  const measure = () => {
    const probe = document.createElement('span');
    probe.style.cssText =
      'position:absolute;visibility:hidden;white-space:nowrap';
    host.append(probe);

    widths = NAMES.map((name) => {
      probe.textContent = name;
      return probe.getBoundingClientRect().width;
    });

    probe.remove();

    gap = Math.round(parseFloat(getComputedStyle(host).fontSize) / 2);
    host.style.setProperty('--reel-gap', `${gap}px`);
  };

  const forward = () => widthAt(index) + gap;
  const back = () => widthAt(index - 1) + gap;

  const render = () => {
    slide.style.transform = `translateX(${shift}px)`;
  };

  const normalize = () => {
    for (let guard = 0; guard < NAMES.length * 4; guard += 1) {
      if (shift <= -forward()) {
        shift += forward();
        index += 1;
      } else if (shift >= back()) {
        shift -= back();
        index -= 1;
      } else {
        return;
      }

      knock();
      paint();
    }
  };

  const onMove = (event: PointerEvent) => {
    const now = performance.now();
    const step = event.clientX - pointer;
    const passed = now - moment;

    if (passed > 0) {
      const last = step / passed;
      speed = passed > 100 ? last : speed * 0.3 + last * 0.7;
    }

    moment = now;
    shift += step;
    pointer = event.clientX;
    normalize();
    render();
  };

  const stop = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
  };

  const settle = () => {
    const landing =
      shift <= -forward() / 2
        ? index + 1
        : shift >= back() / 2
          ? index - 1
          : index;

    shift = landing > index ? -forward() : landing < index ? back() : 0;

    // Барабан встаёт в паз — последний щелчок тише остальных.
    if (landing !== index) clicker.click(0.3);

    // Ширину меняем следом за доводкой, а не вместе с ней.
    slide.style.transition = `transform ${EASE}`;
    host.style.transition = `width ${EASE} 180ms`;
    host.style.width = `${widthAt(landing)}px`;
    render();

    settling = window.setTimeout(() => {
      host.style.transition = 'none';
      slide.style.transition = 'none';
      // Доводку уже озвучили выше, второй раз щёлкать нечем.
      quiet = true;
      normalize();
      quiet = false;
      shift = 0;
      render();
      // Класс снимаем только теперь: он держит окно-маску и соседние имена,
      // без неё слово на доводке уезжает поверх соседних слов.
      host.classList.remove('is-dragging');
      host.style.width = '';
      host.style.transition = '';
      slide.style.transition = '';
    }, 400);
  };

  const spin = () => {
    const now = performance.now();
    const passed = Math.min(now - moment, 50);

    moment = now;
    shift += speed * passed;
    speed *= FRICTION ** (passed / 16.7);
    normalize();
    render();

    if (Math.abs(speed) < MIN_SPEED) {
      settle();
      return;
    }

    spinning = requestAnimationFrame(spin);
  };

  const onUp = () => {
    stop();

    if (CALM.matches || Math.abs(speed) < MIN_SPEED) {
      settle();
      return;
    }

    speed = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, speed));
    moment = performance.now();
    spinning = requestAnimationFrame(spin);
  };

  // Отмену шлёт браузер, когда забирает жест себе, — крутить уже нечего.
  const onCancel = () => {
    speed = 0;
    onUp();
  };

  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;

    event.preventDefault();
    clearTimeout(settling);
    cancelAnimationFrame(spinning);
    stop();
    measure();

    speed = 0;
    moment = performance.now();
    // Контекст заводим по нажатию: до жеста браузер звук не пустит.
    clicker.wake();

    // Окно замирает на текущей ширине: пока крутим, текст справа не двигается.
    host.style.transition = 'none';
    slide.style.transition = 'none';
    host.style.width = `${widthAt(index)}px`;
    host.classList.add('is-dragging');

    pointer = event.clientX;
    render();

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  host.addEventListener('pointerdown', onDown);
  paint();

  document.addEventListener(
    'astro:before-swap',
    () => {
      clearTimeout(settling);
      cancelAnimationFrame(spinning);
      stop();
      clicker.close();
      host.removeEventListener('pointerdown', onDown);
    },
    { once: true },
  );
};
