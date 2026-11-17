import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchCountries } from './searchCountries.js';

describe('searchCountries timeout', () => {
  let requestSignal: AbortSignal;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockImplementation((_input, init) => {
        requestSignal = init?.signal as AbortSignal;
        return new Promise<Response>((_resolve, reject) => {
          if (requestSignal.aborted) {
            reject(requestSignal.reason);
            return;
          }
          requestSignal.addEventListener(
            'abort',
            () => reject(requestSignal.reason),
            { once: true },
          );
        });
      }),
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aborts a pending request after ten seconds with TimeoutError', async () => {
    const caller = new AbortController();
    const result = searchCountries('spain', caller.signal);
    const rejection = expect(result).rejects.toMatchObject({
      name: 'TimeoutError',
    });

    await vi.advanceTimersByTimeAsync(9999);
    expect(requestSignal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    await rejection;
    expect(requestSignal.aborted).toBe(true);
    expect(caller.signal.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves caller cancellation as AbortError and clears the timer', async () => {
    const caller = new AbortController();
    const result = searchCountries('spain', caller.signal);
    const rejection = expect(result).rejects.toMatchObject({
      name: 'AbortError',
    });

    caller.abort();

    await rejection;
    expect(requestSignal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('handles an already cancelled caller', async () => {
    const caller = new AbortController();
    caller.abort();

    await expect(searchCountries('spain', caller.signal)).rejects.toMatchObject(
      {
        name: 'AbortError',
      },
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the timeout after a successful response', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json([]));

    await expect(
      searchCountries('spain', new AbortController().signal),
    ).resolves.toEqual([]);

    expect(vi.getTimerCount()).toBe(0);
  });
});
