import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AdminUser } from '../../models/admin.model';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { AuthService } from '../auth-service/auth.service';

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

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

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
    // Usar la URL correcta para obtener usuarios de la API
    const url = `${environment.apiUrl}/reports-admin/users`;
    
    return this.http.get<any>(url).pipe(
      map(response => {
        // Extraer el array de usuarios desde la propiedad content de la respuesta paginada
        if (!response || !response.content || !Array.isArray(response.content)) {
          console.error('Respuesta inesperada de la API:', response);
          return [];
        }
        
        const users = response.content;
        
        // Si se especificó un rol, filtrar por ese rol
        const filteredUsers = roleName ? users.filter((user: any) => user.role === roleName) : users;
        
        return filteredUsers.map((user: any) => ({
          id: user.userId,
          name: user.name || 'Sin nombre',
          email: user.email || '',
          firebaseUid: user.firebaseUid || '',
          birthDay: user.birthDay || null,
          documentType: user.documentType || '',
          documentNumber: user.documentNumber || '',
          jobTitle: user.jobTitle || '',
          department: user.department || '',
          role: user.role || '',
          enabled: user.status === 'Activo',
          lastLoginAt: user.lastLoginDate, // Usar los nombres exactos del backend
          registrationDate: user.registrationDate, // Usar los nombres exactos del backend
          totalSpaces: user.totalSpaces,
          activeContracts: user.activeContracts,
          totalRevenue: user.totalRevenue,
          totalBookings: user.totalBookings,
          totalSpending: user.totalSpending
        }));
      }),
      catchError(error => {
        console.error('Error al obtener usuarios:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene la lista de usuarios con rol cliente
   */
  getClientUsers(): Observable<AdminUser[]> {
    // Obtener todos los usuarios y filtrar por rol CLIENTE
    return this.getUsersList('CLIENTE');
  }

  /**
   * Obtiene la lista de usuarios con rol proveedor
   */
  getProviderUsers(): Observable<AdminUser[]> {
    // Obtener todos los usuarios y filtrar por rol PROVEEDOR
    return this.getUsersList('PROVEEDOR');
  }

  /**
   * Activa o desactiva un usuario según su estado actual
   */
  toggleUserStatus(userData: AdminUser): Observable<boolean> {
    if (!userData || !userData.firebaseUid) {
      return throwError(() => new Error('No se proporcionó un UID de usuario válido'));
    }
    
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
    if (!userUid) {
      return throwError(() => new Error('UID no válido para activar la cuenta'));
    }
    
    const url = `${this.usersUrl}/activate-account/${userUid}`;
    return this.http.patch<boolean>(url, {}).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Desactiva un usuario
   * @param userUid ID del usuario
   */
  deactivateUser(userUid: string): Observable<boolean> {
    if (!userUid) {
      return throwError(() => new Error('UID no válido para desactivar la cuenta'));
    }
    
    const url = `${this.usersUrl}/desactivate-account/${userUid}`;
    return this.http.patch<boolean>(url, {}).pipe(
      catchError(error => {
        if (error.status === 404) {
          // Si hay un 404, intentar con la ortografía alternativa
          return this.http.patch<boolean>(`${this.usersUrl}/deactivate-account/${userUid}`, {});
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Desactiva el usuario actual basado en el UID del AuthService
   */
  deactivateCurrentUser(): Observable<boolean> {
    const currentUser = this.authService.getCurrentUserSync();
    if (!currentUser || !currentUser.uid) {
      console.error('Error: No hay un usuario autenticado');
      return throwError(() => new Error('No hay un usuario autenticado'));
    }
    
    console.log('Desactivando usuario actual con UID:', currentUser.uid);
    return this.deactivateUser(currentUser.uid);
  }

  /**
   * Activa el usuario actual basado en el UID del AuthService
   */
  activateCurrentUser(): Observable<boolean> {
    const currentUser = this.authService.getCurrentUserSync();
    if (!currentUser || !currentUser.uid) {
      console.error('Error: No hay un usuario autenticado');
      return throwError(() => new Error('No hay un usuario autenticado'));
    }
    
    console.log('Activando usuario actual con UID:', currentUser.uid);
    return this.activateUser(currentUser.uid);
  }
} 