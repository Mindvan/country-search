export interface CountryResponse {
  name: string;
  flag: string;
  capital?: string;
  region: string;
  population: number;
  languages?: ReadonlyArray<{ readonly name: string }>;
}

export interface Country {
  name: string;
  flag: string;
  capital: string | null;
  region: string;
  population: number;
  languages: string[];
}
