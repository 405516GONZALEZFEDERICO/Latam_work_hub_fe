import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../app/services/auth.service'; // Update path as needed
import { catchError, switchMap, throwError } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = <T>(req: HttpRequest<T>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const cookieService = inject(CookieService);
  const router = inject(Router);
  
  // Skip interceptor for auth endpoints or refresh token
  if (req.url.includes('/login') || req.url.includes('/register') || 
      req.url.includes('/google') || req.url.includes('/refresh')) {
    return next(req);
  }
  
  // Get token and role from cookies
  const idToken = cookieService.get('idToken');
  const userRole = cookieService.get('role'); // Cambiado de 'roles' a 'role'
  
  console.log('Token actual:', idToken);
  console.log('Rol del usuario:', userRole);
  
  if (idToken && !authService.isTokenExpired(idToken)) {
    req = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${idToken}`
      }
    });
    return next(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          authService.logout();
          cookieService.delete('idToken', '/');
          cookieService.delete('role', '/'); // Cambiado de 'roles' a 'role'
          router.navigate(['/login']);
        }
        if (error.status === 403) {
          console.log('Error 403: Usuario no tiene permisos necesarios');
          router.navigate(['/unauthorized']);
        }
        return throwError(() => error);
      })
    );
  } else if (idToken && authService.isTokenExpired(idToken)) {
    // Token exists but is expired, try to refresh
    return authService.refreshToken().pipe(
      switchMap(() => {
        // After refresh, get the new token and add it to request
        const newToken = authService.getIdToken();
        if (!newToken) {
          throw new Error('No se pudo obtener un nuevo token');
        }
        
        const clonedReq = req.clone({
          setHeaders: {
            'Authorization': `Bearer ${newToken}`
          }
        });

        // Establecer las cookies con el tiempo de expiración correcto
        const expirationDays = 30; // o el valor que prefieras
        cookieService.set('idToken', newToken, expirationDays, '/');
        if (userRole) {
          cookieService.set('role', userRole, expirationDays, '/');
        }

        return next(clonedReq);
      }),
      catchError(error => {
        console.error('Token refresh failed in interceptor:', error);
        // If refresh fails, log out
        authService.logout();
        cookieService.delete('idToken', '/');
        cookieService.delete('role', '/'); // Cambiado de 'roles' a 'role'
        router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }
  
  // No token available
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout();
        cookieService.delete('idToken', '/');
        cookieService.delete('role', '/'); // Cambiado de 'roles' a 'role'
        router.navigate(['/login']);
      }
      if (error.status === 403) {
        console.log('Error 403: Usuario no tiene permisos necesarios');
        router.navigate(['/unauthorized']);
      }
      return throwError(() => error);
    })
  );
};