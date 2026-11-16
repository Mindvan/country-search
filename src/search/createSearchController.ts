import type { Country } from '../models/country.js';
import { searchCountries } from '../api/searchCountries.js';
import { HttpError } from '../api/HttpError.js';
import { mapCountryResponse } from '../mappers/mapCountryResponse.js';
import { debounce } from '../utils/debounce.js';

export interface SearchState {
  status: 'idle' | 'loading' | 'success' | 'empty' | 'error';
  countries: Country[];
  error: 'timeout' | 'http' | 'network' | null;
}

export interface SearchController {
  setQuery(query: string): void;
  retry(): void;
  getState(): SearchState;
  subscribe(listener: (state: SearchState) => void): () => void;
  dispose(): void;
}

export function createSearchController(): SearchController {
  let state: SearchState = { status: 'idle', countries: [], error: null };
  let query = '';
  let active: AbortController | undefined;
  let disposed = false;

  const listeners = new Set<(state: SearchState) => void>();

  function publish(next: SearchState): void {
    state = next;
    for (const listener of listeners) {
      listener(structuredClone(state));
    }
  }

  function cancel(): void {
    active?.abort();
    active = undefined;
  }

  async function search(text: string, request: AbortController): Promise<void> {
    if (request.signal.aborted || disposed) return;
    publish({ status: 'loading', countries: [], error: null });
    try {
      const raw = await searchCountries(text, request.signal);
      if (request.signal.aborted || disposed) return;
      const countries = raw.map(mapCountryResponse);
      publish({
        status: countries.length ? 'success' : 'empty',
        countries,
        error: null,
      });
    } catch (error: unknown) {
      if (request.signal.aborted || disposed) return;
      if (error instanceof Error && error.name === 'AbortError') {
        publish({ status: 'idle', countries: [], error: null });
        return;
      }
      let kind: SearchState['error'] = 'network';
      if (error instanceof Error && error.name === 'TimeoutError') {
        kind = 'timeout';
      } else if (error instanceof HttpError) {
        kind = 'http';
      }
      publish({ status: 'error', countries: [], error: kind });
    } finally {
      if (active === request) active = undefined;
    }
  }

  const scheduleSearch = debounce((text: string, request: AbortController) => {
    void search(text, request);
  }, 300);

  return {
    setQuery(value) {
      if (disposed) return;
      cancel();
      query = value.trim();
      publish({ status: 'idle', countries: [], error: null });
      if (!query) return;
      active = new AbortController();
      scheduleSearch(query, active);
    },
    retry() {
      if (disposed || !query) return;
      cancel();
      active = new AbortController();
      void search(query, active);
    },
    getState() {
      return structuredClone(state);
    },
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      listener(structuredClone(state));
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      disposed = true;
      listeners.clear();
      cancel();
    },
  };
}
