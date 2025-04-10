import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../app/services/auth.service'; // Update path as needed
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = <T>(req: HttpRequest<T>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  
  // Skip interceptor for auth endpoints or refresh token
  if (req.url.includes('/login') || req.url.includes('/register') || 
      req.url.includes('/google') || req.url.includes('/refresh')) {
    return next(req);
  }
  
  // Get token from cookie via service
  const idToken = authService.getIdToken();
  
  // Check if token exists and is not expired
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
        const clonedReq = req.clone({
          setHeaders: {
            'Authorization': `Bearer ${newToken}`
          }
        });
        return next(clonedReq);
      }),
      catchError(error => {
        console.error('Token refresh failed in interceptor:', error);
        // If refresh fails, log out
        authService.logout();
        return throwError(() => error);
      })
    );
  }
  
  // No token available
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};