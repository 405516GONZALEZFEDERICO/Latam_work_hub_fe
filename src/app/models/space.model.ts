export interface Space {
  id: string;
  title: string;
  name?: string;
  description?: string;
  imageUrl: string;
  additionalImages?: string[];
  address: string | AddressEntity;
  hourlyPrice: number;
  monthlyPrice: number;
  capacity: number;
  providerType: 'COMPANY' | 'INDIVIDUAL';
  amenities?: Amenity[];
  type?: string;
  area?: number;
  priceHour?: number;
  priceDay?: number;
  priceMonth?: number;
}

export interface FilterState {
  providerType: string;
  capacity: number;
  hourlyPrice: number;
  monthlyPrice: number;
  address: string;
}

export interface SpaceDto {
  title: string;
  name?: string;
  description?: string;
  address: string | AddressEntity;
  hourlyPrice: number;
  monthlyPrice: number;
  capacity: number;
  providerType: 'COMPANY' | 'INDIVIDUAL';
  amenities?: string[] | Amenity[];
  
  // Campos para compatibilidad con el formulario
  area?: number;
  pricePerHour?: number;
  pricePerDay?: number;
  pricePerMonth?: number;
  uid?: string;
  type?: any;
}

export interface AmenityDto {
  id?: number;
  name: string;
  description?: string;
  price?: number;
}

export interface Amenity {
  name: string;
  price?: string | number;
  icon?: string;
  description?: string;
}

export interface AddressEntity {
  streetName: string;
  streetNumber: string;
  floor?: string;
  apartment?: string;
  postalCode: string;
  cityId?: number;
  countryId?: number;
  cityName?: string;
  countryName?: string;
} 