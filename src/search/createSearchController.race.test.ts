import { afterEach, expect, it, vi } from 'vitest';
import { createSearchController } from './createSearchController.js';
import type { SearchController } from './createSearchController.js';

let controller: SearchController | undefined;

afterEach(() => {
  controller?.dispose();
  controller = undefined;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('really aborts the older request and keeps the latest results when responses arrive in reverse order', async () => {
  vi.useFakeTimers();
  const responses: string[] = [];
  const cancellations: Array<{ query: string; reason: unknown }> = [];
  const signals = new Map<string, AbortSignal>();
  const spain = {
    name: 'Spain',
    flag: 'spain.svg',
    capital: 'Madrid',
    region: 'Europe',
    population: 47_000_000,
    languages: [{ name: 'Spanish' }],
  };
  const fetchMock = vi.fn<typeof fetch>((input, init) => {
    const query = String(input).split('/').at(-1)!;
    const signal = init?.signal;
    if (!signal) throw new Error('Expected a real cancellation signal');
    signals.set(query, signal);

    return new Promise<Response>((resolve, reject) => {
      const abort = () => {
        cancellations.push({ query, reason: signal.reason });
        reject(signal.reason);
      };
      if (signal.aborted) {
        abort();
        return;
      }
      signal.addEventListener('abort', abort, { once: true });

      setTimeout(
        () => {
          signal.removeEventListener('abort', abort);
          responses.push(query);
          resolve(
            Response.json(
              query === 'spain'
                ? [spain]
                : [{ ...spain, name: 'Stale result' }],
            ),
          );
        },
        query === 'sp' ? 1000 : 100,
      );
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  controller = createSearchController();

  controller.setQuery('sp');
  await vi.advanceTimersByTimeAsync(300);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  controller.setQuery('spain');
  expect(signals.get('sp')?.aborted).toBe(true);
  expect(cancellations).toEqual([
    { query: 'sp', reason: expect.objectContaining({ name: 'AbortError' }) },
  ]);
  await vi.advanceTimersByTimeAsync(300);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(signals.get('spain')?.aborted).toBe(false);
  expect(controller.getState().status).toBe('loading');

  await vi.advanceTimersByTimeAsync(100);
  const expected = {
    status: 'success',
    countries: [{ ...spain, languages: ['Spanish'] }],
    error: null,
  };
  expect(responses).toEqual(['spain']);
  expect(controller.getState()).toEqual(expected);

  await vi.advanceTimersByTimeAsync(600);
  expect(responses).toEqual(['spain', 'sp']);
  expect(controller.getState()).toEqual(expected);
});
