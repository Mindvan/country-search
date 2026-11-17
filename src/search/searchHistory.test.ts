import { afterEach, expect, it, vi } from 'vitest';
import { readSearchHistory, saveSearchHistory } from './searchHistory.js';

afterEach(() => vi.unstubAllGlobals());

it('persists recent queries and moves repeats to the front', () => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  let history = saveSearchHistory([], 'spain');
  history = saveSearchHistory(history, 'france');
  saveSearchHistory(history, ' spain ');
  expect(readSearchHistory()).toEqual(['spain', 'france']);
});

it('keeps only ten entries and ignores blank queries', () => {
  vi.stubGlobal('localStorage', { setItem: vi.fn() });
  let history: string[] = [];
  for (let i = 0; i < 12; i++) history = saveSearchHistory(history, String(i));
  expect(history).toHaveLength(10);
  expect(history[0]).toBe('11');
  expect(saveSearchHistory(history, ' ')).toEqual(history);
});

it.each(['invalid json', '{}', '[null, 5, " spain ", "spain", ""]'])(
  'handles invalid stored data: %s',
  (stored) => {
    vi.stubGlobal('localStorage', { getItem: () => stored });
    expect(readSearchHistory()).toEqual(
      stored.startsWith('[') ? ['spain'] : [],
    );
  },
);

it('continues working when storage is blocked', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('Blocked');
    },
    setItem: () => {
      throw new Error('Blocked');
    },
  });
  expect(readSearchHistory()).toEqual([]);
  expect(saveSearchHistory([], 'spain')).toEqual(['spain']);
});
