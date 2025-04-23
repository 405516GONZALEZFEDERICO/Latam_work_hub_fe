export interface Space {
  id: number;
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
  userId?: string;
  address?: any;
  createdAt?: string;
  updatedAt?: string;
  amenities?: Amenity[];
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
  type: SpaceTypeDto;
  address: AddressEntity;
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