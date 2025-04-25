import { AddressEntity } from './space.model';

export interface SearchSpace {
  id: string;
  title: string;
  imageUrl: string;
  address: string | AddressEntity;
  hourlyPrice: number;
  monthlyPrice: number;
  capacity: number;
  providerType: 'COMPANY' | 'INDIVIDUAL';
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