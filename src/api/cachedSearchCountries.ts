import type { CountryResponse } from '../models/country.js';
import { searchCountries } from './searchCountries.js';

interface PendingRequest {
  controller: AbortController;
  promise: Promise<CountryResponse[]>;
  consumers: number;
}

export function createCachedSearchCountries() {
  const cache = new Map<string, CountryResponse[]>();
  const pending = new Map<string, PendingRequest>();

  return async function cachedSearchCountries(
    query: string,
    signal: AbortSignal,
  ): Promise<CountryResponse[]> {
    signal.throwIfAborted();
    const key = query.trim();
    const cached = cache.get(key);
    if (cached) return structuredClone(cached);

    let request = pending.get(key);
    if (!request) {
      const controller = new AbortController();
      const entry: PendingRequest = {
        controller,
        consumers: 0,
        promise: searchCountries(key, controller.signal),
      };
      entry.promise = entry.promise
        .then((countries) => {
          controller.signal.throwIfAborted();
          cache.set(key, structuredClone(countries));
          return countries;
        })
        .finally(() => {
          if (pending.get(key) === entry) pending.delete(key);
        });
      pending.set(key, entry);
      request = entry;
    }

    const shared = request;
    shared.consumers += 1;
    return new Promise<CountryResponse[]>((resolve, reject) => {
      let finished = false;
      function release(): boolean {
        if (finished) return false;
        finished = true;
        signal.removeEventListener('abort', onAbort);
        shared.consumers -= 1;
        return true;
      }
      function onAbort(): void {
        if (!release()) return;
        reject(signal.reason);
        if (shared.consumers === 0) {
          if (pending.get(key) === shared) pending.delete(key);
          shared.controller.abort();
        }
      }
      signal.addEventListener('abort', onAbort, { once: true });
      shared.promise.then(
        (countries) => {
          if (release()) resolve(structuredClone(countries));
        },
        (error: unknown) => {
          if (release()) reject(error);
        },
      );
      if (signal.aborted) onAbort();
    });
  };
}
