export interface ExpiringContractAlert {
  contractId: number;
  spaceName: string;
  tenantName: string;
  expiryDate: string;
  daysUntilExpiry: number;
} 