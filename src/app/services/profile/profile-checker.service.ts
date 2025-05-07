import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable, filter, BehaviorSubject, switchMap, of, takeUntil, Subject } from 'rxjs';
import { ProfileValidationService } from './profile-validation.service';
import { AuthService } from '../auth-service/auth.service';
import { UserRole } from '../../models/user';

@Injectable({
  providedIn: 'root'
})
export class ProfileCheckerService {
  // Rutas que requieren perfil completo para PROVEEDOR
  private providerRestrictedRoutes: string[] = [
    '/home/spaces/create',
    '/home/spaces'
  ];

  // Rutas que requieren perfil completo para CLIENTE
  private clientRestrictedRoutes: string[] = [
    '/home/search-spaces',
    '/home/space-details'
  ];

  // Sujeto para trackear si el perfil está completo
  private profileComplete$ = new BehaviorSubject<boolean>(false);
  
  // Sujeto para limpiar suscripciones
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private profileValidationService: ProfileValidationService,
    private authService: AuthService
  ) {}

  /**
   * Inicializa el servicio para verificar la navegación
   */
  initialize(): void {
    // Suscribirse a los eventos de navegación
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
      this.checkProfileForCurrentRoute(event.url);
    });
  }

  /**
   * Verifica si la ruta actual requiere un perfil completo y redirige si es necesario
   */
  private checkProfileForCurrentRoute(url: string): void {
    // Obtener el usuario actual
    const currentUser = this.authService.getCurrentUserSync();
    if (!currentUser) return;

    const userRole = currentUser.role;
    
    // Verificar si la ruta actual requiere perfil completo según el rol
    const requiresCompleteProfile = this.doesRouteRequireCompleteProfile(url, userRole);
    
    if (requiresCompleteProfile) {
      // Verificar si el perfil está completo
      this.profileValidationService.isProfileComplete().pipe(
        takeUntil(this.destroy$)
      ).subscribe(isComplete => {
        this.profileComplete$.next(isComplete);
        
        if (!isComplete) {
          // Redirigir al perfil con parámetros para mostrar alerta
          this.router.navigate(['/home/profile/personal'], {
            queryParams: {
              incomplete: true,
              redirect: url
            }
          });
        }
      });
    }
  }

  /**
   * Determina si una ruta requiere perfil completo según el rol del usuario
   */
  private doesRouteRequireCompleteProfile(url: string, role: UserRole): boolean {
    if (role === 'PROVEEDOR') {
      return this.providerRestrictedRoutes.some(route => url.startsWith(route));
    } else if (role === 'CLIENTE') {
      return this.clientRestrictedRoutes.some(route => url.startsWith(route));
    }
    return false;
  }

  /**
   * Retorna un Observable que indica si el perfil está completo
   */
  isProfileComplete(): Observable<boolean> {
    return this.profileComplete$.asObservable();
  }

  /**
   * Limpia las suscripciones al destruir el servicio
   */
  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 