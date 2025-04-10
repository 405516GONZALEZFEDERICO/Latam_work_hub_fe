import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, map, take } from 'rxjs';

export interface IRoute {
  requiredRole: string;
}

export const securityWardGuard: CanActivateFn = (
  route,
  state
): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Obtener el rol requerido para la ruta
  const requiredRole = (route.data as IRoute)?.requiredRole;
  
  // Si no hay rol requerido, permitir acceso
  if (!requiredRole) {
    return true;
  }
  
  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      // Si no hay usuario, redirigir al login
      if (!user) {
        console.log('No hay usuario autenticado. Redirigiendo a login...');
        return router.createUrlTree(['/login']);
      }
      
      // Verificar si el usuario tiene el permiso necesario
      const userRole = user.role as string;
      
      if (!userRole || userRole !== requiredRole) {
        console.log(`Usuario no tiene rol requerido. Rol requerido: ${requiredRole}, Rol del usuario: ${userRole || 'no definido'}`);
        // Redirigimos a home por defecto
        return router.createUrlTree(['/home']);
      }
      
      return true;
    })
  );
};