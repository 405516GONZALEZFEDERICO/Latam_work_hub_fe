export interface CompanyInfoDto {
  id?: number;
  name: string;
  legalName: string;
  taxId: string;
  phone: string;
  email: string;
  website?: string;
  contactPerson?: string;
  country?: number;
  providerType?: 'INDIVIDUAL' | 'COMPANY';
  active?: boolean;
  registrationDate?: string;
}

export interface CompanyInfoResponse {
  legalName: string;
  name: string;
  taxId: string;
  phone: string;
  email: string;
  website?: string;
  contactPerson?: string;
  country: number;
  providerType?: string;
}