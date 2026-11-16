import { afterEach, expect, it, vi } from 'vitest';
import { createCachedSearchCountries } from './cachedSearchCountries.js';

afterEach(() => vi.unstubAllGlobals());

it('caches successful results and isolates returned data', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(Response.json([{ name: 'Spain' }]));
  vi.stubGlobal('fetch', fetchMock);
  const search = createCachedSearchCountries();
  const first = await search('spain', new AbortController().signal);
  first.length = 0;
  expect(await search('spain', new AbortController().signal)).toEqual([
    { name: 'Spain' },
  ]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('shares a pending request without sharing caller cancellation', async () => {
  let complete!: (response: Response) => void;
  let networkSignal!: AbortSignal;
  const fetchMock = vi.fn((_url, init: RequestInit) => {
    networkSignal = init.signal as AbortSignal;
    return new Promise<Response>((resolve) => {
      complete = resolve;
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  const search = createCachedSearchCountries();
  const first = new AbortController();
  const second = new AbortController();
  const a = search('spain', first.signal);
  const b = search('spain', second.signal);
  const cancelled = expect(a).rejects.toMatchObject({ name: 'AbortError' });
  first.abort();
  await cancelled;
  expect(networkSignal.aborted).toBe(false);
  complete(Response.json([]));
  await expect(b).resolves.toEqual([]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('aborts the network when all consumers cancel and permits retry', async () => {
  const signals: AbortSignal[] = [];
  const fetchMock = vi.fn((_url, init: RequestInit) => {
    const signal = init.signal as AbortSignal;
    signals.push(signal);
    return new Promise<Response>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), {
        once: true,
      });
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  const search = createCachedSearchCountries();
  const a = new AbortController();
  const b = new AbortController();
  const first = expect(search('spain', a.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
  const second = expect(search('spain', b.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
  a.abort();
  b.abort();
  expect(signals[0]?.aborted).toBe(true);
  fetchMock.mockResolvedValueOnce(Response.json([]));
  await expect(search('spain', new AbortController().signal)).resolves.toEqual(
    [],
  );
  await Promise.all([first, second]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('caches 404 but does not cache failures', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 500 }))
    .mockResolvedValueOnce(new Response('', { status: 404 }));
  vi.stubGlobal('fetch', fetchMock);
  const search = createCachedSearchCountries();
  await expect(
    search('unknown', new AbortController().signal),
  ).rejects.toMatchObject({ status: 500 });
  await expect(
    search('unknown', new AbortController().signal),
  ).resolves.toEqual([]);
  await expect(
    search('unknown', new AbortController().signal),
  ).resolves.toEqual([]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('does not fetch for an already cancelled consumer', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const caller = new AbortController();
  caller.abort();
  await expect(
    createCachedSearchCountries()('spain', caller.signal),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetchMock).not.toHaveBeenCalled();
});
