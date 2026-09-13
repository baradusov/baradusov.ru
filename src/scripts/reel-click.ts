import { closeSound, noise, play, wake } from './audio';

// Щелчок собираем на лету: короткий шумовой всплеск через полосовой фильтр.
// Так не нужен файл — ни запроса, ни лицензии в репозитории, а высота каждого
// щелчка чуть разная, поэтому на разгоне это не звучит зацикленным сэмплом.
const BURST = 0.03;
const MIN_GAP = 0.015;
const TONE = 2200;

// Крутое затухание превращает шум в сухой стук, а не в шипение.
const knock = (progress: number) => (1 - progress) ** 8;

export const createClicker = () => {
  let last = 0;

  const click = (force = 1) =>
    play((audio, now) => {
      if (now - last < MIN_GAP) return;
      last = now;

      const source = audio.createBufferSource();
      source.buffer = noise(audio, 'knock', BURST, knock);
      source.playbackRate.value = 0.9 + Math.random() * 0.2;

      const band = audio.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = TONE;
      band.Q.value = 1.2;

      // Нечисло здесь уронило бы setValueAtTime, а звать нас могут из расчёта
      // скорости — там нулевой промежуток времени даёт NaN.
      const safe = Number.isFinite(force) ? force : 1;

      const gain = audio.createGain();
      gain.gain.setValueAtTime(Math.min(1, Math.max(0.15, safe)) * 0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + BURST);

      source.connect(band).connect(gain).connect(audio.destination);
      source.start(now);
      source.stop(now + BURST);
    });

  return { wake, click, close: closeSound };
};
