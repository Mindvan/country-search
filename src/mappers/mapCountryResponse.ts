import type { Country, CountryResponse } from '../models/country.js';

export function mapCountryResponse(raw: CountryResponse): Country {
  void raw;
  throw new Error('mapCountryResponse is not implemented yet');
}
