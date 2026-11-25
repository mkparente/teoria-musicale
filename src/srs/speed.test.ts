import { describe, expect, it } from 'vitest';
import { MIC_EXTRA_MS, SPEED_FROM_BOX, isSlow, targetMs } from './speed';
import { getItem, record } from './srs';

describe('soglie di tempo', () => {
  it('più tempo per le domande che chiedono più note', () => {
    expect(targetMs('rd:n:30:0')).toBe(6000);
    expect(targetMs('iv:find:m3:next')).toBe(8000);
    expect(targetMs('sq:write:major:0')).toBe(23000); // sei note da scrivere
    expect(targetMs('sq:write:pentMinor:5')).toBe(17000); // quattro
    expect(targetMs('fb:find:7')).toBe(25000);
    expect(targetMs('gt:u04-forme')).toBeNull(); // la chitarra si valuta da sé
  });

  it('rispondendo col microfono c’è un margine in più', () => {
    expect(isSlow('iv:build:m3:0', 9000)).toBe(true);
    expect(isSlow('iv:build:m3:0', 9000, true)).toBe(8000 + MIC_EXTRA_MS < 9000);
  });
});

describe('giusta ma lenta', () => {
  it('nelle prime scatole conta solo indovinare; poi una risposta lenta non fa salire', () => {
    const id = 'iv:test:lenta';
    for (let i = 0; i < SPEED_FROM_BOX; i++) expect(record(id, true, 20000, true)).toBe('good');
    expect(getItem(id)!.box).toBe(SPEED_FROM_BOX);
    // Da qui la lentezza pesa: resta nella sua scatola.
    expect(record(id, true, 20000, true)).toBe('hard');
    expect(getItem(id)!.box).toBe(SPEED_FROM_BOX);
    // Rapida: sale.
    expect(record(id, true, 3000, false)).toBe('good');
    expect(getItem(id)!.box).toBe(SPEED_FROM_BOX + 1);
    // Conteggi: 4 giuste misurate, 1 rapida; tutte contano come giuste.
    expect(getItem(id)).toMatchObject({ seen: 4, correct: 4, timed: 4, fast: 1 });
  });

  it('una risposta sbagliata riparte da capo, rapida o lenta', () => {
    const id = 'iv:test:sbagliata';
    record(id, true, 1000);
    record(id, true, 1000);
    expect(record(id, false, 1000)).toBe('again');
    expect(getItem(id)!.box).toBe(0);
  });
});
