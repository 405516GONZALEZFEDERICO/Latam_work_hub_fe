import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, map, of, take, catchError, switchMap } from 'rxjs';
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
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    const routeData = route.data as IRoute;
    const allowedRoles = routeData?.allowedRoles;
    
    // Si no hay restricciones de roles, permitir acceso
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    // Verificar primero si hay un usuario en la memoria
    const currentUser = this.authService.getCurrentUserSync();
    
    // Si tenemos un usuario en memoria con rol permitido, permite acceso inmediato
    if (currentUser && this.hasAllowedRole(currentUser.role, allowedRoles)) {
      return true;
    }
    
    // Si no hay usuario en memoria o no tiene rol permitido, verificar con el Observable
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (!user) {
          console.log('SecurityWardGuard: No hay usuario autenticado, redirigiendo al login');
          this.router.navigate(['/login']);
          return false;
        }
        
        // Verificar si el rol del usuario está en la lista de permitidos
        if (this.hasAllowedRole(user.role, allowedRoles)) {
          return true;
        }
        
        // Si el usuario tiene DEFAULT pero se requiere otro rol
        if (user.role === 'DEFAULT') {
          console.log('SecurityWardGuard: Usuario sin rol, redirigiendo a selección de rol');
          this.router.navigate(['/select-role']);
          return false;
        }
        
        // Para cualquier otro caso, enviar a unauthorized
        console.log('SecurityWardGuard: Usuario no autorizado', user.role, allowedRoles);
        this.router.navigate(['/unauthorized']);
        return false;
      }),
      catchError(error => {
        console.error('Error en el guard de seguridad:', error);
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
  
  // Método auxiliar para verificar si el rol está en la lista de permitidos
  private hasAllowedRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
    // Si DEFAULT está en los roles permitidos, cualquier usuario puede acceder
    if (allowedRoles.includes('DEFAULT')) {
      return true;
    }
    
    // Verificar si el rol específico está permitido
    return allowedRoles.includes(userRole);
  }

  // Método auxiliar para asignar rol y redirigir a home
  assignRoleAndRedirect(role: UserRole): void {
    const currentUser = this.authService.getCurrentUserSync();
    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Actualizar el rol en el servicio
    this.authService.updateUserRole(currentUser.uid, role).subscribe({
      next: () => {
        console.log('Rol actualizado correctamente a:', role);
        this.router.navigate(['/home']);
      },
      error: (error) => {
        console.error('Error actualizando rol:', error);
        // Navegar a home de todas formas
        this.router.navigate(['/home']);
      }
    });
  }
}
