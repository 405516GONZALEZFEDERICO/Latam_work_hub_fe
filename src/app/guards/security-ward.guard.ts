import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth-service/auth.service';
import { UserRole } from '../models/user';

interface IRoute {
  allowedRoles?: UserRole[];
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityWardGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    const routeData = route.data as IRoute;
    const allowedRoles = routeData?.allowedRoles;
    const currentUser = this.authService.getCurrentUserSync();

    // Si la ruta es select-role, solo permitir acceso si el usuario tiene rol DEFAULT
    if (state.url.includes('/select-role')) {
      if (!currentUser) {
        this.router.navigate(['/login']);
        return false;
      }
      if (currentUser.role && currentUser.role !== 'DEFAULT') {
        this.router.navigate(['/home']);
        return false;
      }
      return true;
    }

    // Si la ruta NO tiene allowedRoles, permitir acceso
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    // Si hay usuario y tiene rol permitido, permite acceso inmediato
    if (currentUser) {
      if (this.hasAllowedRole(currentUser.role, allowedRoles)) {
        return true;
      }
      if (currentUser.role === 'DEFAULT') {
        this.router.navigate(['/select-role']);
        return false;
      }
      return false;
    }

    // Si no hay usuario, verificar con el observable
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (!user) {
          this.router.navigate(['/login']);
          return false;
        }
        if (this.hasAllowedRole(user.role, allowedRoles)) {
          return true;
        }
        if (user.role === 'DEFAULT') {
          this.router.navigate(['/select-role']);
          return false;
        }
        return false;
      }),
      catchError(() => {
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }

  private hasAllowedRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
    if (allowedRoles.includes('DEFAULT')) {
      return true;
    }
    return allowedRoles.includes(userRole);
  }
}


