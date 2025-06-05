import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AuthService } from '../auth-service/auth.service';

// Interfaces para los DTOs del proveedor
export interface ProviderKpiCardsDto {
  totalSpaces: number;
  activeContracts: number;
  reservationsThisMonth: number;
  
  // Ingresos diferenciados
  totalGrossRevenueLast30Days: number | null;  // Ingresos brutos (sin descontar reembolsos)
  totalNetRevenueLast30Days: number | null;    // Ingresos netos (descontando reembolsos)
  totalRefundsLast30Days: number | null;       // Total de reembolsos
  
  // Para compatibilidad hacia atrás - será igual a totalNetRevenueLast30Days
  /** @deprecated Use totalNetRevenueLast30Days instead */
  totalRevenueLast30Days: number | null;
  
  spacesOccupied: number;
  spacesAvailable: number;
  occupancyRate: number | null;
}

export interface ProviderMonthlyRevenueDto {
  monthYear: string;
  revenue: number | null;  // Ingresos netos mensuales (descontando reembolsos)
}

export interface ProviderSpacePerformanceDto {
  spaceName: string;
  totalBookings: number;
  totalContracts: number;
  totalRevenue: number | null;
  occupancyRate: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class ProviderDashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard-provider`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  /**
   * Obtiene los KPIs principales para el dashboard del proveedor
   */
  getKpiCards(uid: string): Observable<ProviderKpiCardsDto> {
    return this.http.get<ProviderKpiCardsDto>(`${this.apiUrl}/kpi-cards`, {
      params: { uid }
    });
  }

  /**
   * Obtiene los datos de ingresos mensuales del proveedor
   * NOTA: El backend debe devolver ingresos NETOS (descontando reembolsos) para ser consistente con las KPI cards
   * @param uid UID del proveedor
   * @param months Número de meses a consultar (por defecto 12)
   * @returns Ingresos mensuales (deben ser netos)
   */
  getMonthlyRevenue(uid: string, months: number = 12): Observable<ProviderMonthlyRevenueDto[]> {
    return this.http.get<ProviderMonthlyRevenueDto[]>(`${this.apiUrl}/monthly-revenue`, {
      params: { uid, months: months.toString() }
    });
  }

  /**
   * Obtiene el rendimiento de los espacios del proveedor
   */
  getSpacePerformance(uid: string): Observable<ProviderSpacePerformanceDto[]> {
    return this.http.get<ProviderSpacePerformanceDto[]>(`${this.apiUrl}/space-performance`, {
      params: { uid }
    });
  }

  /**
   * Obtiene el UID del usuario actual
   */
  getCurrentUserUid(): string | null {
    const currentUser = this.authService.getCurrentUserSync();
    return currentUser?.uid || null;
  }
} 