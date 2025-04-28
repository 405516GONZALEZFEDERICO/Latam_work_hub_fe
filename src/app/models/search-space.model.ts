import { AddressEntity } from './space.model';

export interface SearchSpace {
  id: string;
  title: string;
  name?: string;
  imageUrl: string;
  address: string | AddressEntity;
  hourlyPrice: number;
  monthlyPrice: number;
  capacity: number;
  providerType: 'COMPANY' | 'INDIVIDUAL';
  photoUrl?: string[];
  photos?: Array<{url: string} | string>;
  pricePerHour?: number;
  pricePerDay?: number;
  pricePerMonth?: number;
  description?: string;
}

export interface FilterState {
  pricePerHour: number | null;
  pricePerDay: number | null;
  pricePerMonth: number | null;
  area: number | null;
  capacity: number | null;
  spaceTypeId: number | null;
  cityId: number | null;
  countryId: number | null;
  amenityIds: number[] | null;
  address?: string;
} 