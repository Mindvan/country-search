import type { Country, CountryResponse } from '../models/country.js';

export function mapCountryResponse(raw: CountryResponse): Country {
  return {
    name: raw.name,
    flag: raw.flag,
    capital: raw.capital || null,
    region: raw.region,
    population: raw.population,
    languages: raw.languages?.map((language) => language.name) ?? [],
    ...(raw.area !== undefined ? { area: raw.area } : {}),
    ...(raw.borders ? { borders: [...raw.borders] } : {}),
    ...(raw.currencies
      ? { currencies: raw.currencies.map((currency) => ({ ...currency })) }
      : {}),
  };
}
