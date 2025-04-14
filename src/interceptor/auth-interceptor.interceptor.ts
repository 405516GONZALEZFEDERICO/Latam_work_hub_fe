import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, from, throwError, of } from 'rxjs';
import { catchError, switchMap, mergeMap } from 'rxjs/operators';
import { AuthService } from './../app/services/auth-service/auth.service';

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>, 
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);

  // Comprobar primero si el token está por expirar
  return from(authService.checkTokenExpiration()).pipe(
    mergeMap((isExpiring) => {
      // Si el token está por expirar, renovarlo primero
      if (isExpiring) {
        return authService.refreshToken().pipe(
          switchMap((token) => addTokenAndContinue(token, request, next, authService))
        );
      }
      
      // Si no está por expirar, continuar normalmente
      return from(authService.getIdToken()).pipe(
        switchMap(token => addTokenAndContinue(token, request, next, authService))
      );
    })
  );
};

// Función auxiliar para añadir el token y continuar con la solicitud
function addTokenAndContinue(
  token: string | null, 
  request: HttpRequest<unknown>, 
  next: HttpHandlerFn,
  authService: AuthService
): Observable<HttpEvent<unknown>> {
  // Si tenemos un token, lo agregamos a la solicitud
  if (token) {
    request = request.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Continuar con la solicitud y manejar posibles errores 401/403
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si recibimos un error 401 (No autorizado) o 403 (Prohibido)
      if (error.status === 401 || error.status === 403) {
        // Intentar renovar el token y reintentar la solicitud
        return authService.refreshToken().pipe(
          switchMap(newToken => {
            if (newToken) {
              // Tenemos un nuevo token, reintentar la solicitud
              const retryRequest = request.clone({
                setHeaders: {
                  'Authorization': `Bearer ${newToken}`
                }
              });
              return next(retryRequest);
            } else {
              // No pudimos renovar el token, la sesión ha expirado
              // Redirigir al login
              authService.logout();
              return throwError(() => new Error('La sesión ha expirado. Por favor, inicie sesión nuevamente.'));
            }
          }),
          catchError(refreshError => {
            // Error al renovar el token
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }
      
      // Para otros errores, simplemente propagar
      return throwError(() => error);
    })
  );
}