// Interfaces para el panel de administración

export interface AdminSpace {
  id: number | string;
  name: string;
  description: string;
  pricePerHour: number;
  pricePerDay: number;
  pricePerMonth: number;
  capacity: number;
  area: number;
  active: boolean;
  available?: boolean;
  address?: {
    city: string;
    country: string;
    streetName: string;
    streetNumber: string;
    apartment: string;
    floor: string;
    postalCode: string;
  };
  spaceType: string;
  photoUrl?: string[];
  amenities?: Array<{id: number | null, name: string, price?: number}>;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  firebaseUid: string;
  birthDay?: string;
  documentType?: string;
  documentNumber?: string;
  jobTitle?: string;
  role?: string | {
    id?: number;
    name?: string;
  };
  department?: string;
  enabled: boolean;
  lastLoginAt?: string | number;
  registrationDate?: string | number;
  totalSpaces?: number | null;
  activeContracts?: number | null;
  totalRevenue?: number | null;
  totalBookings?: number | null;
  totalSpending?: number | null;
}

export interface AmenityAdmin {
  id?: number;
  name: string;
  description?: string;
}

export interface SpaceTypeAdmin {
  id: number;
  name: string;
  description?: string;
} 