import { noise, play } from './audio';

// Модуль под курсором — картонка на бумаге, отсюда и пара звуков. Падение и
// поднятие сделаны зеркально: у падения есть низ и шум глохнет, у поднятия
// низа нет вовсе и шум, наоборот, светлеет. По этой паре ухо и читает
// «вниз» и «вверх», ничего специально «поднимающегося» выдумывать не нужно.
const TAIL = 0.2;
const flat = () => 1;

export const lift = () =>
  play((audio, now) => {
    const source = audio.createBufferSource();
    source.buffer = noise(audio, 'flat', TAIL, flat);

    // Полоса уезжает вверх: картонка отлипает от стола.
    const band = audio.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 0.8;
    band.frequency.setValueAtTime(900, now);
    band.frequency.exponentialRampToValueAtTime(2600, now + 0.06);

    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    source.connect(band).connect(gain).connect(audio.destination);
    source.start(now);
    source.stop(now + 0.09);
  });

export const thud = () =>
  play((audio, now) => {
    // Низ — «тук» тела: короткий тон, съезжающий вниз.
    const body = audio.createOscillator();
    body.frequency.setValueAtTime(160, now);
    body.frequency.exponentialRampToValueAtTime(70, now + 0.09);

    const weight = audio.createGain();
    weight.gain.setValueAtTime(0.0001, now);
    weight.gain.exponentialRampToValueAtTime(0.3, now + 0.005);
    weight.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    body.connect(weight).connect(audio.destination);
    body.start(now);
    body.stop(now + 0.14);

    // Верх — тот самый «пуф» воздуха: шум, который на глазах темнеет.
    const air = audio.createBufferSource();
    air.buffer = noise(audio, 'flat', TAIL, flat);

    const lid = audio.createBiquadFilter();
    lid.type = 'lowpass';
    lid.frequency.setValueAtTime(1800, now);
    lid.frequency.exponentialRampToValueAtTime(400, now + 0.1);

    const puff = audio.createGain();
    puff.gain.setValueAtTime(0.0001, now);
    puff.gain.exponentialRampToValueAtTime(0.22, now + 0.004);
    puff.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    air.connect(lid).connect(puff).connect(audio.destination);
    air.start(now);
    air.stop(now + 0.13);
  });
