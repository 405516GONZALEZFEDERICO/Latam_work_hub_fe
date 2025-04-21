export interface CompanyInfoDto {
  legalName: string;
  name: string;
  taxId: string;
  phone: string;
  email: string;
  website?: string;
  contactPerson?: string;
  country: number;
  providerType?: string;
  ProviderType?: string;
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
  ProviderType?: string;
} 