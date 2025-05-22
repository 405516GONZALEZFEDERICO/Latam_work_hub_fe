export interface Space {
  id: string;
  title: string;
  name?: string;
  description?: string;
  imageUrl: string;
  additionalImages?: string[];
  photoUrl?: string[];
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
  spaceType?: { id?: number | string; name?: string } | string;
  pricePerHour?: number;
  pricePerDay?: number;
  pricePerMonth?: number;
}

export interface FilterState {
  providerType: string;
  capacity: number;
  hourlyPrice: number;
  monthlyPrice: number;
  address: string;
}

// Interface ajustada para coincidir con el DTO del backend (propiedades planas)
export interface SpaceDto {
  name: string;
  description: string;
  capacity: number;
  area: number;
  pricePerHour: number;
  pricePerDay: number;
  pricePerMonth: number;
  uid: string;
  amenities: AmenityDto[];
  type: {
    name: string;
  };
  // Propiedades de dirección (planas como requiere el backend)
  cityId: number;
  countryId: number;
  streetName: string;
  streetNumber: string;
  floor?: string;
  apartment?: string;
  postalCode: string;
}

// Nueva interfaz específica para creación/actualización de espacios
export interface SpaceCreationDto {
  name: string;
  description: string;
  capacity: number;
  area: number;
  pricePerHour: number;
  pricePerDay: number;
  pricePerMonth: number;
  uid: string;
  amenities: AmenityDto[];
  type: {
    id: number;
  };
  // Propiedades de dirección (planas como requiere el backend)
  cityId: number;
  countryId: number;
  streetName: string;
  streetNumber: string;
  floor?: string;
  apartment?: string;
  postalCode: string;
}

export interface AmenityDto {
  id?: number;
  name: string;
  description?: string;
  price: number;
}

export interface Amenity {
  id?: number;
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