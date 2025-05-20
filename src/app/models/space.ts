export interface Space {
  id: number | string;
  name: string;
  description: string;
  status: string;
  price: number;
  capacity: number;
  type: string;
  active: boolean;
  available: boolean;
  imageUrl: string;
  additionalImages?: string[];
  area?: number;
  priceDay?: number;
  priceMonth?: number;
  priceHour?: number;
  pricePerHour?: number;
  pricePerDay?: number;
  pricePerMonth?: number;
  userId?: string;
  address?: any;
  createdAt?: string;
  updatedAt?: string;
  amenities?: Amenity[];
  // Propiedades necesarias para la gestión de administrador
  ownerName?: string;
  ownerUid?: string;
  spaceTypeName?: string;
  cityName?: string;
  countryName?: string;
  mainImage?: string;
}

export interface Amenity {
  name: string;
  price: string;
  icon?: string;
  description?: string;
}

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
  cityId: number;
  countryId: number;
  streetName: string;
  streetNumber: string;
  floor?: string;
  apartment?: string;
  postalCode: string;
}

export interface AmenityDto {
  name: string;
  price: number;
}

export interface SpaceTypeDto {
  name: string;
}

export interface AddressEntity {
  streetName: string;
  streetNumber: string;
  floor?: string;
  apartment?: string;
  postalCode: string;
  cityId: number;
  countryId: number;
}