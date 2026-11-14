import { describe, expect, it } from 'vitest';
import type { CountryResponse } from '../models/country.js';
import { mapCountryResponse } from './mapCountryResponse.js';

// Fixture follows https://countries.dev/docs; tests never access the network.
const countryFixture = {
  name: 'United States of America',
  alpha2Code: 'US',
  capital: 'Washington, D.C.',
  region: 'Americas',
  population: 329484123,
  languages: [{ name: 'English' }],
  flag: 'https://countries.dev/flags/us.svg',
};

describe('mapCountryResponse', () => {
  it('maps the API response to card data without unrelated API fields', () => {
    expect(mapCountryResponse(countryFixture)).toEqual({
      name: 'United States of America',
      flag: 'https://countries.dev/flags/us.svg',
      capital: 'Washington, D.C.',
      region: 'Americas',
      population: 329484123,
      languages: ['English'],
    });
  });

  it('extracts every language name in the original order', () => {
    const raw = {
      ...countryFixture,
      languages: [{ name: 'English' }, { name: 'French' }],
    };

    expect(mapCountryResponse(raw).languages).toEqual(['English', 'French']);
  });

  it('represents a missing capital as null', () => {
    const raw: CountryResponse = { ...countryFixture };
    delete raw.capital;

    expect(mapCountryResponse(raw).capital).toBeNull();
  });

  it('represents an empty capital as null', () => {
    expect(
      mapCountryResponse({ ...countryFixture, capital: '' }).capital,
    ).toBeNull();
  });

  it('returns an empty list when languages are absent', () => {
    const raw: CountryResponse = { ...countryFixture };
    delete raw.languages;

    expect(mapCountryResponse(raw).languages).toEqual([]);
  });

  it('supports an empty languages list', () => {
    expect(
      mapCountryResponse({ ...countryFixture, languages: [] }).languages,
    ).toEqual([]);
  });

  it('preserves a zero population', () => {
    expect(
      mapCountryResponse({ ...countryFixture, population: 0 }).population,
    ).toBe(0);
  });

  it('does not mutate the input, including nested language objects', () => {
    const raw = Object.freeze({
      ...countryFixture,
      languages: Object.freeze([Object.freeze({ name: 'English' })]),
    });
    const before = structuredClone(raw);

    mapCountryResponse(raw);

    expect(raw).toEqual(before);
  });

  it('returns independent data on repeated calls', () => {
    const first = mapCountryResponse(countryFixture);
    const second = mapCountryResponse(countryFixture);

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    first.languages.push('French');
    first.name = 'Changed';
    expect(second.languages).toEqual(['English']);
    expect(second.name).toBe('United States of America');
    expect(countryFixture.languages).toEqual([{ name: 'English' }]);
  });
});
