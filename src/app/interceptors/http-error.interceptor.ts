import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent
} from '@angular/common/http';
import { catchError, switchMap, retry } from 'rxjs/operators';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, throwError, of } from 'rxjs';
import { AuthService } from '../services/auth-service/auth.service';

// Variable para llevar el registro de los reintentos de autenticación
let authRetryAttempts = 0;
const MAX_AUTH_RETRIES = 2;

export const httpErrorInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const snackBar = inject(MatSnackBar);
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMsg = '';
      
      // No mostrar errores para URLs de recursos estáticos (imágenes, etc.)
      if (request.url.endsWith('.jpg') || request.url.endsWith('.png') || 
          request.url.endsWith('.svg') || request.url.endsWith('.gif')) {
        console.warn('Recurso no encontrado:', request.url);
        return throwError(() => error);
      }
      
      if (error.error instanceof ErrorEvent) {
        // Error del lado del cliente
        errorMsg = `Error: ${error.error.message}`;
      } else {
        // Error del lado del servidor
        switch(error.status) {
          case 400:
            errorMsg = error.error?.message || 'Solicitud incorrecta';
            break;
          case 401:
            // Manejar errores de autorización con reintentos
            if (authRetryAttempts < MAX_AUTH_RETRIES) {
              authRetryAttempts++;
              console.log(`Intento ${authRetryAttempts} de recuperar autenticación`);
              
              // Intentar refrescar el token
              return authService.refreshToken().pipe(
                switchMap(token => {
                  if (token) {
                    // Si se pudo obtener un nuevo token, reintentar la solicitud
                    const newReq = request.clone({
                      setHeaders: {
                        'Authorization': `Bearer ${token}`
                      }
                    });
                    // Reiniciar el contador de intentos para la próxima vez
                    authRetryAttempts = 0;
                    return next(newReq);
                  } else {
                    // Si no hay token, redirigir al login
                    errorMsg = 'No autorizado. Por favor inicia sesión nuevamente';
                    router.navigate(['/login']);
                    return throwError(() => error);
                  }
                }),
                catchError(() => {
                  // Si hay error al refrescar el token, redirigir al login
                  errorMsg = 'La sesión ha expirado. Por favor inicia sesión nuevamente';
                  router.navigate(['/login']);
                  return throwError(() => error);
                })
              );
            } else {
              // Si ya se han agotado los reintentos, mostrar mensaje y redirigir
              errorMsg = 'No autorizado. Por favor inicia sesión nuevamente';
              // Reiniciar contador para futuras peticiones
              authRetryAttempts = 0;
              // Cerrar sesión y redirigir al login
              authService.logout().then(() => {
                router.navigate(['/login']);
              });
            }
            break;
          case 403:
            errorMsg = 'No tienes permisos para acceder a este recurso';
            break;
          case 404:
            errorMsg = 'Recurso no encontrado';
            break;
          case 500:
            // Para errores de perfil, no mostrar mensajes
            if (request.url.includes('/users/profile') || request.url.includes('/auth/logout')) {
              console.warn('Error en el servidor para:', request.url);
              return throwError(() => error);
            }
            errorMsg = 'Error en el servidor. Intenta nuevamente más tarde';
            break;
          default:
            errorMsg = 'Ocurrió un error inesperado';
        }
      }
      
      if (errorMsg) {
        // Mostrar mensaje de error solo para errores significativos
        snackBar.open(errorMsg, 'Cerrar', {
          duration: 5000
        });
      }
      
      return throwError(() => error);
    })
  );
}; 