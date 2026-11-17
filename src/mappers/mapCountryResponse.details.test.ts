import { expect, it } from 'vitest';
import { mapCountryResponse } from './mapCountryResponse.js';

it('maps country details and keeps nested data independent', () => {
  const raw = {
    name: 'Spain',
    flag: '',
    region: 'Europe',
    population: 1,
    area: 505992,
    borders: ['FRA', 'PRT'],
    currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
  };
  const result = mapCountryResponse(raw);
  expect(result).toMatchObject({
    area: 505992,
    borders: ['FRA', 'PRT'],
    currencies: raw.currencies,
  });
  expect(result.borders).not.toBe(raw.borders);
  expect(result.currencies?.[0]).not.toBe(raw.currencies[0]);
});

it('preserves zero area and empty detail lists', () => {
  const raw = {
    name: 'Test',
    flag: '',
    region: '',
    population: 0,
    area: 0,
    borders: [],
    currencies: [],
  };
  expect(mapCountryResponse(raw)).toMatchObject({
    area: 0,
    borders: [],
    currencies: [],
  });
});
