import type { Country } from '../models/country.js';

export interface SearchState {
  status: 'idle' | 'loading' | 'success' | 'empty' | 'error';
  countries: Country[];
  error: 'timeout' | 'http' | 'network' | null;
}

export interface SearchController {
  setQuery(query: string): void;
  retry(): void;
  getState(): SearchState;
  dispose(): void;
}

// Contract only: implementation belongs in the next TDD commit.
export function createSearchController(): SearchController {
  throw new Error('Not implemented');
}
