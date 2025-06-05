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
  
  // Ingresos diferenciados
  totalGrossRevenueLast30Days: number;  // Ingresos brutos (sin descontar reembolsos)
  totalNetRevenueLast30Days: number;    // Ingresos netos (descontando reembolsos)
  totalRefundsLast30Days: number;       // Total de reembolsos
  
  // Para compatibilidad hacia atrás - será igual a totalNetRevenueLast30Days
  /** @deprecated Use totalNetRevenueLast30Days instead */
  totalRevenueLast30Days: number;
  
  activeContracts: number;
  contractsExpiringSoon: number;        // Contratos próximos a vencer (ej. 30 días)
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

export interface TopSpacesDto {
  spaceName: string;
  rentalCount: number;
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
   * Obtiene el top 5 de espacios con más reservas y alquileres
   */
  getTop5Spaces(): Observable<TopSpacesDto[]> {
    return this.http.get<TopSpacesDto[]>(`${this.apiUrl}/top-5-spaces`);
  }

  /**
   * Obtiene los contratos de alquiler agrupados por tipo de espacio
   */
  getRentalContractsBySpaceType(): Observable<ReservationsBySpaceTypeDto[]> {
    return this.http.get<ReservationsBySpaceTypeDto[]>(`${this.apiUrl}/rental-contracts-by-space-type`);
  }

  /**
   * Obtiene la lista de usuarios según el rol especificado
   * @param roleName Rol de los usuarios a buscar (CLIENTE, PROVEEDOR, etc.)
   */
  getUsersList(roleName: string): Observable<AdminUser[]> {
    // Usar el endpoint de reportes que tiene datos completos incluyendo fechas
    const reportsUrl = `${environment.apiUrl}/reports-admin/users`;
    
    return this.http.get<any>(reportsUrl).pipe(
      switchMap(response => {
        // Extraer el array de usuarios desde la propiedad content de la respuesta paginada
        if (!response || !response.content || !Array.isArray(response.content)) {
          console.error('Respuesta inesperada de la API de reportes:', response);
          return of([]);
        }
        
        const users = response.content;
        
        // Si se especificó un rol, filtrar por ese rol
        const filteredUsers = roleName ? users.filter((user: any) => user.role === roleName) : users;
        
        // Obtener los firebaseUids del endpoint /get-user-list para los usuarios que no lo tengan
        const usersUrl = `${this.usersUrl}/get-user-list`;
        const params = new HttpParams().set('roleName', roleName);
        
        return this.http.get<any[]>(usersUrl, { params }).pipe(
          map(disableUserList => {
            // Crear un mapa de email -> firebaseUid para hacer el cruce
            const uidMap = new Map<string, string>();
            disableUserList.forEach(user => {
              if (user.email && user.firebaseUid) {
                uidMap.set(user.email, user.firebaseUid);
              }
            });
            
            return filteredUsers.map((user: any) => ({
              id: user.userId,
              name: user.name || 'Sin nombre',
              email: user.email || '',
              firebaseUid: user.firebaseUid || uidMap.get(user.email) || '', // Usar el del reporte o buscar en el mapa
              birthDay: user.birthDay || null,
              documentType: user.documentType || '',
              documentNumber: user.documentNumber || '',
              jobTitle: user.jobTitle || '',
              department: user.department || '',
              role: user.role || '',
              enabled: user.status === 'Activo',
              lastLoginAt: user.lastLoginDate, // Mantener las fechas del reporte
              registrationDate: user.registrationDate, // Mantener las fechas del reporte
              totalSpaces: user.totalSpaces,
              activeContracts: user.activeContracts,
              totalRevenue: user.totalRevenue,
              totalBookings: user.totalBookings,
              totalSpending: user.totalSpending
            } as AdminUser));
          })
        );
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
      return throwError(() => new Error('No se proporcionó un firebaseUid de usuario válido'));
    }
    
    if (userData.enabled) {
      return this.deactivateUser(userData.firebaseUid);
    } else {
      return this.activateUser(userData.firebaseUid);
    }
  }

  /**
   * Activa un usuario usando su UID de Firebase
   * @param userUid UID de Firebase del usuario
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
   * Desactiva un usuario usando su UID de Firebase
   * @param userUid UID de Firebase del usuario
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
    
          console.log('Desactivando usuario actual');
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
    
          console.log('Activando usuario actual');
    return this.activateUser(currentUser.uid);
  }
} 