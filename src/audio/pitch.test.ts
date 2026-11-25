import { describe, expect, it } from 'vitest';
import { NoteTracker, detectPitch, midiToFreq, toHeard } from './pitch';

const SR = 48000;
const N = 2048;

/** Un suono simile a una corda pizzicata: fondamentale con armonici forti. */
function pluck(freq: number, amp = 0.3, harmonics = [1, 0.8, 0.6, 0.4, 0.3, 0.2], offset = 0): Float32Array {
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = (i + offset) / SR;
    let v = 0;
    harmonics.forEach((a, k) => (v += a * Math.sin(2 * Math.PI * freq * (k + 1) * t + k)));
    buf[i] = (amp * v) / harmonics.length;
  }
  return buf;
}

const heardMidi = (buf: Float32Array) => {
  const p = detectPitch(buf, SR);
  return p ? toHeard(p).midi : null;
};

describe('riconoscimento della nota', () => {
  it('tutte le corde a vuoto e qualche nota acuta', () => {
    // Mi2 La2 Re3 Sol3 Si3 Mi4, poi La4, Mi5 (12° tasto del cantino), La5 (17°)
    for (const midi of [40, 45, 50, 55, 59, 64, 69, 76, 81]) {
      expect(heardMidi(pluck(midiToFreq(midi))), `MIDI ${midi}`).toBe(midi);
    }
  });

  it('ogni semitono sulla 6ª corda, dal tasto 0 al 12', () => {
    for (let fret = 0; fret <= 12; fret++) expect(heardMidi(pluck(midiToFreq(40 + fret)))).toBe(40 + fret);
  });

  it('non scambia la nota con l\'ottava anche se il 2° armonico è più forte', () => {
    expect(heardMidi(pluck(midiToFreq(45), 0.3, [0.6, 1, 0.5, 0.3]))).toBe(45);
  });

  it('corda un po\' scordata: la nota giusta con lo scarto in centesimi', () => {
    const p = detectPitch(pluck(midiToFreq(50.2)), SR)!;
    expect(toHeard(p)).toMatchObject({ midi: 50 });
    expect(toHeard(p).cents).toBeGreaterThan(10);
    expect(toHeard(p).cents).toBeLessThan(30);
  });

  it('silenzio e rumore non sono note', () => {
    expect(detectPitch(new Float32Array(N), SR)).toBeNull();
    let seed = 1;
    const noise = new Float32Array(N).map(() => {
      seed = (seed * 16807) % 2147483647;
      return (seed / 2147483647 - 0.5) * 0.5;
    });
    const p = detectPitch(noise, SR);
    expect(p === null || p.clarity < 0.88).toBe(true);
  });
});

describe('note suonate in sequenza', () => {
  const h = (midi: number, rms = 0.1) => ({ midi, cents: 0, clarity: 0.97, rms });

  it('una nota conta quando è stabile, una volta sola', () => {
    const t = new NoteTracker(3);
    const out = [h(45), h(45), h(45), h(45), h(45)].map((x) => t.push(x));
    expect(out).toEqual([null, null, 45, null, null]);
  });

  it('un arpeggio: tre note diverse una dopo l\'altra', () => {
    const t = new NoteTracker(3);
    const seq = [45, 45, 45, 48, 48, 48, 52, 52, 52].map((m) => t.push(h(m)));
    expect(seq.filter((x) => x !== null)).toEqual([45, 48, 52]);
  });

  it('un tocco accidentale breve non conta', () => {
    const t = new NoteTracker(3);
    const seq = [47, 45, 45, 45].map((m) => t.push(h(m)));
    expect(seq.filter((x) => x !== null)).toEqual([45]);
  });

  it('la stessa nota conta di nuovo dopo una pausa o una nuova pennata', () => {
    const t = new NoteTracker(3);
    const seq: (number | null)[] = [];
    // attacco che cresce, poi la nota che si spegne piano: una sola nota
    for (const rms of [0.05, 0.1, 0.2, 0.25, 0.22, 0.2, 0.18]) seq.push(t.push(h(45, rms)));
    expect(seq.filter((x) => x !== null)).toEqual([45]);
    // nuova pennata
    for (const rms of [0.4, 0.4, 0.4]) seq.push(t.push(h(45, rms)));
    // pausa e ancora
    seq.push(t.push(null));
    for (let i = 0; i < 3; i++) seq.push(t.push(h(45)));
    expect(seq.filter((x) => x !== null)).toEqual([45, 45, 45]);
  });
});
