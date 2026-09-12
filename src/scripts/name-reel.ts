const NAMES = ['Нуриль', 'Нурик', 'Юрий', 'Николай'];
const EASE = '180ms ease';

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
  let pointer = 0;

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
    const span = shift < 0 ? forward() : back();
    const current = widthAt(index);
    const target = widthAt(shift < 0 ? index + 1 : index - 1);
    const progress = span ? Math.min(1, Math.abs(shift) / span) : 0;

    host.style.width = `${current + (target - current) * progress}px`;
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

      paint();
    }
  };

  const onMove = (event: PointerEvent) => {
    shift += event.clientX - pointer;
    pointer = event.clientX;
    normalize();
    render();
  };

  const stop = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  };

  const onUp = () => {
    stop();

    shift =
      shift <= -forward() / 2 ? -forward() : shift >= back() / 2 ? back() : 0;

    host.style.transition = `width ${EASE}`;
    slide.style.transition = `transform ${EASE}`;
    render();

    settling = window.setTimeout(() => {
      host.style.transition = 'none';
      slide.style.transition = 'none';
      normalize();
      shift = 0;
      render();
      // Класс снимаем только теперь: он держит окно-маску и соседние имена,
      // без неё слово на доводке уезжает поверх соседних слов.
      host.classList.remove('is-dragging');
      host.style.width = '';
      host.style.transition = '';
      slide.style.transition = '';
    }, 200);
  };

  const onDown = (event: PointerEvent) => {
    if (event.button !== 0 || event.pointerType === 'touch') return;

    event.preventDefault();
    clearTimeout(settling);
    stop();
    measure();

    host.style.transition = 'none';
    slide.style.transition = 'none';
    host.classList.add('is-dragging');

    pointer = event.clientX;
    render();

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  host.addEventListener('pointerdown', onDown);
  paint();

  document.addEventListener(
    'astro:before-swap',
    () => {
      clearTimeout(settling);
      stop();
      host.removeEventListener('pointerdown', onDown);
    },
    { once: true },
  );
};
