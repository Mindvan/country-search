import type { CountryResponse } from '../models/country.js';
import { HttpError } from './HttpError.js';

const REQUEST_TIMEOUT_MS = 10_000;

export async function searchCountries(
  query: string,
  signal: AbortSignal,
): Promise<CountryResponse[]> {
  const timeoutController = new AbortController();
  const requestSignal = AbortSignal.any([signal, timeoutController.signal]);
  const timer = setTimeout(() => {
    timeoutController.abort(
      new DOMException('Request timed out', 'TimeoutError'),
    );
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://countries.dev/name/${encodeURIComponent(query)}`,
      { signal: requestSignal },
    );

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new HttpError(response.status);
    }

    return (await response.json()) as CountryResponse[];
  } finally {
    clearTimeout(timer);
  }
}
