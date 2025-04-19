export interface Country {
  id?: number;
  name: string;
  code?: string;
}

export interface City {
  id?: number;
  name: string;
  divisionName: string;
  divisionType: 'PROVINCE' | 'STATE' | 'DEPARTMENT' | 'REGION';
  country: Country;
}

export interface Address {
  id?: number;
  streetName: string;
  streetNumber: string;
  floor?: string;
  apartment?: string;
  postalCode: string;
  city: City;
} 