import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AdminUser } from '../../models/admin.model';
import { map } from 'rxjs/operators';

// Interfaces para los DTOs
export interface KpiCardsDto {
  activeClients: number;
  activeProviders: number;
  publishedSpaces: number;
  reservationsThisMonth: number;
  totalRevenueLast30Days: number;
  activeContracts: number;
  contractsExpiringSoon: number;
}

export interface MonthlyRevenueDto {
  monthYear: string;
  revenue: number;
}

export interface ReservationsBySpaceTypeDto {
  spaceTypeName: string;
  reservationCount: number;
}

export interface PeakHoursDto {
  hourOfDay: number;
  reservationCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard-admin`;
  private usersUrl = `${environment.apiUrl}/users`;
  private spacesUrl = `${environment.apiUrl}/spaces`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene los KPIs principales para el dashboard
   */
  getKpiCards(): Observable<KpiCardsDto> {
    return this.http.get<KpiCardsDto>(`${this.apiUrl}/kpi-cards`);
  }

  /**
   * Obtiene los datos de ingresos mensuales
   * @param months Número de meses a consultar (por defecto 12)
   */
  getMonthlyRevenue(months: number = 12): Observable<MonthlyRevenueDto[]> {
    return this.http.get<MonthlyRevenueDto[]>(`${this.apiUrl}/monthly-revenue`, {
      params: { months: months.toString() }
    });
  }

  /**
   * Obtiene las reservas agrupadas por tipo de espacio
   */
  getReservationsBySpaceType(): Observable<ReservationsBySpaceTypeDto[]> {
    return this.http.get<ReservationsBySpaceTypeDto[]>(`${this.apiUrl}/reservations-by-space-type`);
  }

  /**
   * Obtiene las horas pico de reservas durante el día
   */
  getPeakReservationHours(): Observable<PeakHoursDto[]> {
    return this.http.get<PeakHoursDto[]>(`${this.apiUrl}/peak-reservation-hours`);
  }

  /**
   * Obtiene la lista de usuarios según el rol especificado
   * @param roleName Rol de los usuarios a buscar (CLIENTE, PROVEEDOR, etc.)
   */
  getUsersList(roleName: string): Observable<AdminUser[]> {
    return this.http.get<any[]>(`${this.usersUrl}/get-user-list`, {
      params: { roleName }
    }).pipe(
      map(users => {
        if (!users) return [];
        return users.map(user => this.mapToAdminUser(user));
      })
    );
  }

  /**
   * Obtiene la lista de usuarios con rol cliente
   */
  getClientUsers(): Observable<AdminUser[]> {
    return this.getUsersList('CLIENTE');
  }

  /**
   * Obtiene la lista de usuarios con rol proveedor
   */
  getProviderUsers(): Observable<AdminUser[]> {
    return this.getUsersList('PROVEEDOR');
  }

  /**
   * Función auxiliar para mapear un usuario a AdminUser
   */
  private mapToAdminUser(user: any): AdminUser {
    return {
      id: user.id || 0,
      name: user.name || 'Sin nombre',
      email: user.email || '',
      firebaseUid: user.firebaseUid || '',
      birthDay: user.birthDay || null,
      documentType: user.documentType || '',
      documentNumber: user.documentNumber || '',
      jobTitle: user.jobTitle || '',
      department: user.department || '',
      role: user.role || { name: 'Desconocido' },
      enabled: user.enabled !== undefined ? user.enabled : true,
      // Estas propiedades podrían venir de Firebase o del backend
      lastLoginAt: user.lastLoginAt || null,
      registrationDate: user.registrationDate || null
    };
  }

  /**
   * Activa o desactiva un usuario según su estado actual
   */
  toggleUserStatus(userData: AdminUser): Observable<boolean> {
    if (userData.enabled) {
      return this.deactivateUser(userData.firebaseUid);
    } else {
      return this.activateUser(userData.firebaseUid);
    }
  }

  /**
   * Activa un usuario
   * @param userUid ID del usuario
   */
  activateUser(userUid: string): Observable<boolean> {
    return this.http.patch<boolean>(`${this.usersUrl}/activate-account/${userUid}`, {});
  }

  /**
   * Desactiva un usuario
   * @param userUid ID del usuario
   */
  deactivateUser(userUid: string): Observable<boolean> {
    return this.http.patch<boolean>(`${this.usersUrl}/desactivate-account/${userUid}`, {});
  }
} 