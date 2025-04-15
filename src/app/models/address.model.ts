export interface Country {
  id?: number;
  name: string;
}

export interface City {
  id?: number;
  name: string;
  divisionName: string;
  divisionType: string;
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