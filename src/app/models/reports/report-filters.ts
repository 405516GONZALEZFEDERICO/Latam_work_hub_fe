// Filtros para informe de espacios
export interface SpaceReportFilters {
  providerId?: number;
  status?: string;
}

// Filtros para informe de reservas
export interface BookingReportFilters {
  startDate?: string;
  endDate?: string;
  clientId?: number;
  providerId?: number;
  spaceId?: number;
  status?: string;
}

// Filtros para informe de usuarios
export interface UserReportFilters {
  startDate?: string;
  role?: string;
  status?: string;
}

// Filtros para informe de contratos
export interface ContractReportFilters {
  startDate?: string;
  endDate?: string;
  tenantId?: number;   // clientId en frontend
  ownerId?: number;    // providerId en frontend
  status?: string;
}

// Filtros para informe de facturas
export interface InvoiceReportFilters {
  startDate?: string;
  clientId?: number;
  status?: string;
}

// Filtros para alertas de contratos por vencer
export interface ExpiringContractsAlertFilters {
  daysUntilExpiry?: number;
}

// Filtros para alertas de facturas vencidas
export interface OverdueInvoicesAlertFilters {
  minDaysOverdue?: number;
  status?: string;
} 