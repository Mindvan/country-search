export interface Currency {
  code?: string;
  name: string;
  symbol?: string;
}

export interface CountryDetails {
  area?: number;
  borders?: readonly string[];
  currencies?: ReadonlyArray<Currency>;
}

export interface CountryResponse extends CountryDetails {
  name: string;
  flag: string;
  capital?: string;
  region: string;
  population: number;
  languages?: ReadonlyArray<{ readonly name: string }>;
}

export interface Country extends CountryDetails {
  name: string;
  flag: string;
  capital: string | null;
  region: string;
  population: number;
  languages: string[];
}
