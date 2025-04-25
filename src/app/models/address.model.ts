import { City } from './city.model';
import { Country } from './country.model';

export interface Address {
  id?: number;
  streetName: string;
  streetNumber: string;
  floor?: string;
  apartment?: string;
  postalCode: string;
  city: City;
}

export type { City, Country }; 