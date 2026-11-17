import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from './HttpError.js';
import { searchCountries } from './searchCountries.js';

const countries = [
  {
    name: 'Spain',
    capital: 'Madrid',
    region: 'Europe',
    population: 47351567,
    flag: 'https://countries.dev/flags/es.svg',
    languages: [{ name: 'Spanish' }],
  },
];

describe('searchCountries', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let controller: AbortController;

  beforeEach(() => {
    controller = new AbortController();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the country array from a successful JSON response', async () => {
    fetchMock.mockResolvedValue(Response.json(countries));

    await expect(searchCountries('spain', controller.signal)).resolves.toEqual(
      countries,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://countries.dev/name/spain',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('encodes the query as a single URL path segment', async () => {
    fetchMock.mockResolvedValue(Response.json([]));

    await searchCountries('a/b ?#é', controller.signal);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://countries.dev/name/a%2Fb%20%3F%23%C3%A9',
      expect.anything(),
    );
  });

  it('returns an empty array for 404 without requiring a JSON body', async () => {
    fetchMock.mockResolvedValue(new Response('Not found', { status: 404 }));

    await expect(
      searchCountries('unknown', controller.signal),
    ).resolves.toEqual([]);
  });

  it.each([400, 401, 429, 500, 503])(
    'rejects HTTP %i with HttpError',
    async (status) => {
      fetchMock.mockResolvedValue(new Response('Failure', { status }));

      const result = searchCountries('spain', controller.signal);

      await expect(result).rejects.toBeInstanceOf(HttpError);
      await expect(result).rejects.toMatchObject({ status });
    },
  );

  it('preserves network failures', async () => {
    const error = new TypeError('Failed to fetch');
    fetchMock.mockRejectedValue(error);

    await expect(searchCountries('spain', controller.signal)).rejects.toBe(
      error,
    );
  });

  it('rejects malformed JSON in a successful response', async () => {
    fetchMock.mockResolvedValue(new Response('invalid JSON', { status: 200 }));

    await expect(
      searchCountries('spain', controller.signal),
    ).rejects.toBeInstanceOf(SyntaxError);
  });

  it('propagates caller cancellation to the actual fetch signal', async () => {
    let requestSignal: AbortSignal | null | undefined;
    fetchMock.mockImplementation((_input, init) => {
      requestSignal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        if (requestSignal?.aborted) {
          reject(requestSignal.reason);
          return;
        }
        requestSignal?.addEventListener(
          'abort',
          () => reject(requestSignal?.reason),
          { once: true },
        );
      });
    });
    const result = searchCountries('spain', controller.signal);
    const rejection = expect(result).rejects.toMatchObject({
      name: 'AbortError',
    });

    controller.abort();

    await rejection;
    expect(requestSignal?.aborted).toBe(true);
  });
});
