import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, map, take } from 'rxjs';
import { IRoute } from '../models/user';

export const securityWardGuard: CanActivateFn = (route, state): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRole = (route.data as IRoute)?.requiredRole;
  console.log('Guard - Rol requerido:', requiredRole);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      console.log('Guard - Usuario actual:', user);
      
      if (!user) {
        console.log('No hay usuario autenticado. Redirigiendo a login...');
        return router.createUrlTree(['/login']);
      }

      console.log('Guard - Usuario autenticado con rol:', user.role);

      // Si no se requiere rol específico y el usuario está autenticado, permitir acceso
      if (!requiredRole) {
        console.log('No se requiere rol específico, permitiendo acceso');
        return true;
      }

      const userRole = user.role;
      console.log('Guard - Comparando roles:', { userRole, requiredRole });

      // Si el usuario tiene rol DEFAULT y está intentando acceder a select-role, permitir
      if (userRole === 'DEFAULT' && requiredRole === 'DEFAULT') {
        console.log('Usuario DEFAULT accediendo a select-role, permitiendo acceso');
        return true;
      }

      // Si el rol del usuario no coincide con el requerido
      if (userRole !== requiredRole) {
        console.log(`Rol incorrecto. Requiere: ${requiredRole}, pero tiene: ${userRole}`);
        if (userRole === 'DEFAULT') {
          console.log('Usuario DEFAULT, redirigiendo a select-role');
          return router.createUrlTree(['/select-role']);
        }
        console.log('Redirigiendo a acceso denegado');
        return router.createUrlTree(['/acceso-denegado']);
      }

      console.log('Acceso permitido');
      return true;
    })
  );
};
