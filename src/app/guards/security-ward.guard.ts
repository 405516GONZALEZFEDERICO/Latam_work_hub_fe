import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthService } from '../services/auth-service/auth.service';
import { User, UserRole } from '../models/user';

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

    return this.authService.getCurrentUser().pipe(
      map(user => {
        // Si no hay usuario, redirigir al login
        if (!user) {
          this.router.navigate(['/login']);
          return false;
        }

        // Si DEFAULT está en los roles permitidos, cualquier usuario puede acceder
        if (allowedRoles.includes('DEFAULT')) {
          return true;
        }
        
        // Verificar si el rol del usuario está en la lista de permitidos
        if (allowedRoles.includes(user.role)) {
          return true;
        }

        // Si el usuario tiene DEFAULT pero se requiere otro rol
        if (user.role === 'DEFAULT') {
          this.router.navigate(['/select-role']);
          return false;
        } 
        
        // Para cualquier otro caso, enviar a unauthorized o a home dependiendo de la situación
        this.router.navigate(['/unauthorized']);
        return false;
      })
    );
  }
}
