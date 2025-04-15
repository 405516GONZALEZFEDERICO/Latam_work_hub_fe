import { UserRole } from './user';
import { Address } from './address.model';

export interface ProfileData {
    displayName?: string;
    fullName?: string;
    email: string;
    photoUrl?: string;
    birthDate?: Date;
    documentType?: string;
    documentNumber?: string;
    jobTitle?: string;
    department?: string;
    role: UserRole;
    companyData?: CompanyData;
    providerType?: 'INDIVIDUAL' | 'COMPANY';
    address?: Address;
    profileCompletion?: number;
}
  
export interface CompanyData {
    name: string;
    legalName: string;
    taxId: string;
    phone: string;
    email: string;
    website?: string;
    description?: string;
    contactPerson?: string;
    country?: any;
    operatingCountries?: string[];
    logo?: string;
    address?: string; // Mantener por compatibilidad con código existente
}