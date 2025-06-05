// Filtros para informe de espacios
export interface SpaceReportFilters {
  status?: string;
}

// Filtros para informe de reservas
export interface BookingReportFilters {
  startDate?: string;
  endDate?: string;
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
  contractStartDate?: string;
  contractEndDate?: string;
  status?: string;
}

// Filtros para informe de facturas
export interface InvoiceReportFilters {
  startDate?: string;
  status?: string;
}

// Filtros para alertas de contratos por vencer
export interface ExpiringContractsAlertFilters {
  daysUntilExpiry?: number;
}

// Filtros para alertas de facturas vencidas
export interface OverdueInvoicesAlertFilters {
  minDaysOverdue?: number;
} 