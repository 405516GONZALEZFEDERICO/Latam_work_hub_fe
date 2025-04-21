import { Country } from './country.model';

// Corresponde al enum DivisionType en el backend
export type DivisionType = 'PROVINCE' | 'STATE' | 'DEPARTMENT' | 'REGION';

export interface City {
  id: number;
  name: string;
  divisionName: string;
  divisionType: DivisionType;
  country: Country;
} 