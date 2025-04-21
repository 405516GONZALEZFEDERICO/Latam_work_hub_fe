import { City } from './city.model';

export interface Address {
  id?: number;
  streetName: string;
  streetNumber: string;
  floor?: string;
  apartment?: string;
  postalCode: string;
  city: City;
} 