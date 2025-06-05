import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AuthService } from '../auth-service/auth.service';

// Interfaces para los DTOs del cliente
export interface ClientKpiCardsDto {
  totalBookings: number;
  activeContracts: number;
  completedBookings: number;
  
  // Gastos diferenciados
  totalGrossSpentLast30Days: number | null;    // Gastos brutos (sin descontar reembolsos)
  totalNetSpentLast30Days: number | null;      // Gastos netos (descontando reembolsos)
  totalRefundsLast30Days: number | null;       // Total de reembolsos recibidos
  
  // Para compatibilidad hacia atrás - será igual a totalNetSpentLast30Days
  /** @deprecated Use totalNetSpentLast30Days instead */
  totalSpentLast30Days: number | null;
  
  upcomingBookings: number;
}

export interface ClientMonthlySpendingDto {
  monthYear: string;
  spending: number | null;
}

export interface ClientBookingsByTypeDto {
  spaceTypeName: string;
  bookingCount: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class ClientDashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard-client`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  /**
   * Obtiene los KPIs principales para el dashboard del cliente
   */
  getKpiCards(uid: string): Observable<ClientKpiCardsDto> {
    console.log('ClientDashboardService: getKpiCards llamado con uid:', uid);
    console.log('URL completa:', `${this.apiUrl}/kpi-cards`);
    
    return this.http.get<ClientKpiCardsDto>(`${this.apiUrl}/kpi-cards`, {
      params: { uid }
    }).pipe(
      tap(data => console.log('ClientDashboardService: KPIs recibidos:', data)),
      catchError(error => {
        console.error('ClientDashboardService: Error en getKpiCards:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene los datos de gastos mensuales del cliente
   * @param uid UID del cliente
   * @param months Número de meses a consultar (por defecto 12)
   */
  getMonthlySpending(uid: string, months: number = 12): Observable<ClientMonthlySpendingDto[]> {
    console.log('ClientDashboardService: getMonthlySpending llamado con uid:', uid, 'months:', months);
    console.log('URL completa:', `${this.apiUrl}/monthly-spending`);
    
    return this.http.get<ClientMonthlySpendingDto[]>(`${this.apiUrl}/monthly-spending`, {
      params: { uid, months: months.toString() }
    }).pipe(
      tap(data => console.log('ClientDashboardService: Monthly spending recibidos:', data)),
      catchError(error => {
        console.error('ClientDashboardService: Error en getMonthlySpending:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene las reservas agrupadas por tipo de espacio del cliente
   */
  getBookingsBySpaceType(uid: string): Observable<ClientBookingsByTypeDto[]> {
    console.log('ClientDashboardService: getBookingsBySpaceType llamado con uid:', uid);
    console.log('URL completa:', `${this.apiUrl}/bookings-by-space-type`);
    
    return this.http.get<ClientBookingsByTypeDto[]>(`${this.apiUrl}/bookings-by-space-type`, {
      params: { uid }
    }).pipe(
      tap(data => console.log('ClientDashboardService: Bookings by type recibidos:', data)),
      catchError(error => {
        console.error('ClientDashboardService: Error en getBookingsBySpaceType:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene el UID del usuario actual
   */
  getCurrentUserUid(): string | null {
    const currentUser = this.authService.getCurrentUserSync();
    return currentUser?.uid || null;
  }
} 