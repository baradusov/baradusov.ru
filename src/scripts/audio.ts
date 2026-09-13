// Общий на страницу звук: барабану с именем и перетаскиванию модулей нужен
// один и тот же контекст. Заводим лениво — до жеста браузер звук не пустит.
//
// Всё здесь молча переживает отказ: звук — украшение поверх жеста, и если
// его нет, жест обязан работать как ни в чём не бывало.
type Legacy = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let dead = false;

export const wake = () => {
  if (dead) return null;

  // Контекст мог закрыться сам: например, iOS глушит звук на входящем звонке.
  if (ctx?.state === 'closed') ctx = null;

  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as Legacy).webkitAudioContext;

    if (!Ctor) {
      dead = true;
      return null;
    }

    try {
      ctx = new Ctor();
    } catch {
      // Больше шести контекстов на документ браузер не даёт, а в жёстких
      // настройках приватности звука может не быть вовсе. Второй раз не лезем:
      // на разгоне барабана эта попытка была бы сотней исключений подряд.
      dead = true;
      return null;
    }
  }

  try {
    // Вкладка полежала в фоне, или у Safari это состояние «interrupted».
    if (ctx.state !== 'running') void ctx.resume().catch(() => {});
  } catch {
    // Древним Safari нужен колбэк, промиса оттуда не будет.
  }

  return ctx;
};

export const closeSound = () => {
  const closing = ctx;

  ctx = null;
  shelf = new WeakMap();

  try {
    void closing?.close().catch(() => {});
  } catch {
    // Уже закрыт — и хорошо.
  }
};

// Единственная дверь наружу: что бы ни случилось внутри, до вызывающего кода
// это не долетит. Контекст мог закрыться прямо посреди жеста, узел — не
// создаться, параметр — оказаться нечислом; всё это значит только тишину.
export const play = (make: (audio: AudioContext, now: number) => void) => {
  const audio = wake();
  if (!audio) return;

  try {
    make(audio, audio.currentTime);
  } catch {
    // Молчим.
  }
};

// Шум режем один раз на контекст: генерировать его на каждый звук — впустую
// жечь время прямо в обработчике указателя.
let shelf = new WeakMap<AudioContext, Map<string, AudioBuffer>>();

export const noise = (
  audio: AudioContext,
  key: string,
  seconds: number,
  shape: (progress: number) => number,
) => {
  let made = shelf.get(audio);

  if (!made) {
    made = new Map();
    shelf.set(audio, made);
  }

  const kept = made.get(key);
  if (kept) return kept;

  const frames = Math.max(1, Math.floor(audio.sampleRate * seconds));
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < frames; i += 1) {
    data[i] = (Math.random() * 2 - 1) * shape(i / frames);
  }

  made.set(key, buffer);
  return buffer;
};
