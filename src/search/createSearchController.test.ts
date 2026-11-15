import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearchController } from './createSearchController.js';
import type { SearchController } from './createSearchController.js';

const spain = {
  name: 'Spain',
  flag: 'spain.svg',
  capital: 'Madrid',
  region: 'Europe',
  population: 47_000_000,
  languages: [{ name: 'Spanish' }],
};

describe('search controller', () => {
  let controller: SearchController | undefined;
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    controller?.dispose();
    controller = undefined;
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function pendingRequest(): () => AbortSignal {
    let signal: AbortSignal;
    fetchMock.mockImplementation((_input, init) => {
      signal = init?.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) => {
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        signal.addEventListener('abort', () => reject(signal.reason), {
          once: true,
        });
      });
    });
    return () => signal;
  }

  it('starts idle and does not request an empty or whitespace query', async () => {
    controller = createSearchController();
    expect(controller.getState()).toEqual({
      status: 'idle',
      countries: [],
      error: null,
    });
    controller.setQuery('   ');
    await vi.advanceTimersByTimeAsync(300);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(controller.getState().status).toBe('idle');
  });

  it('debounces input for 300 ms and maps only the latest query results', async () => {
    fetchMock.mockResolvedValue(Response.json([spain]));
    controller = createSearchController();
    controller.setQuery('sp');
    await vi.advanceTimersByTimeAsync(200);
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(299);
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://countries.dev/name/spain',
      expect.anything(),
    );
    expect(controller.getState()).toEqual({
      status: 'success',
      countries: [{ ...spain, languages: ['Spanish'] }],
      error: null,
    });
  });

  it('shows loading and immediately aborts on input before the next debounce', async () => {
    const signal = pendingRequest();
    controller = createSearchController();
    controller.setQuery('sp');
    await vi.advanceTimersByTimeAsync(300);
    expect(controller.getState().status).toBe('loading');
    const previous = signal();
    controller.setQuery('spain');
    expect(previous.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(controller.getState().error).toBeNull();
    expect(controller.getState().status).not.toBe('error');
  });

  it('clears results and cancels a scheduled search when input is cleared', async () => {
    fetchMock.mockResolvedValue(Response.json([spain]));
    controller = createSearchController();
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(300);
    controller.setQuery('france');
    controller.setQuery('');
    await vi.advanceTimersByTimeAsync(300);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toEqual({
      status: 'idle',
      countries: [],
      error: null,
    });
  });

  it('aborts an active request when cleared without displaying an error', async () => {
    const signal = pendingRequest();
    controller = createSearchController();
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(300);
    controller.setQuery('');
    expect(signal().aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(300);
    expect(controller.getState()).toEqual({
      status: 'idle',
      countries: [],
      error: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([200, 404])(
    'treats an empty HTTP %i response as no matches',
    async (status) => {
      fetchMock.mockResolvedValue(
        status === 404
          ? new Response('Not found', { status })
          : Response.json([]),
      );
      controller = createSearchController();
      controller.setQuery('unknown');
      await vi.advanceTimersByTimeAsync(300);
      expect(controller.getState()).toEqual({
        status: 'empty',
        countries: [],
        error: null,
      });
    },
  );

  it.each(['http', 'network'] as const)('reports a %s error', async (error) => {
    if (error === 'http') {
      fetchMock.mockResolvedValue(new Response('Failure', { status: 500 }));
    } else {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    }
    controller = createSearchController();
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(300);
    expect(controller.getState()).toEqual({
      status: 'error',
      countries: [],
      error,
    });
  });

  it('reports TimeoutError as a real error distinct from caller cancellation', async () => {
    pendingRequest();
    controller = createSearchController();
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(10_300);
    expect(controller.getState()).toEqual({
      status: 'error',
      countries: [],
      error: 'timeout',
    });
  });

  it('retries the latest input immediately and cancels its pending debounce', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Offline'));
    controller = createSearchController();
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(300);
    fetchMock.mockResolvedValue(Response.json([]));
    controller.setQuery('france');
    controller.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://countries.dev/name/france',
      expect.anything(),
    );
    await vi.advanceTimersByTimeAsync(300);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(controller.getState().error).toBeNull();
  });
});
