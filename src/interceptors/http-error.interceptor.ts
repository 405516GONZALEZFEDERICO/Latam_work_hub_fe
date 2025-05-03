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
import { AuthService } from '../app/services/auth-service/auth.service';

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
      let showGenericSnackbar = true; // Por defecto, mostrar snackbar

      // URLs donde NO queremos mostrar snackbar si fallan (especialmente por datos no encontrados)
      const suppressSnackbarUrls = [
        '/users/get-personal-data',
        '/companies/my-company',
        '/users/get-provider-type',
        '/location/addresses' // Incluye la carga de dirección
        // Agrega aquí otras URLs de carga inicial si es necesario
      ];

      // Comprobar si la URL actual está en la lista de supresión
      const shouldSuppressSnackbar = suppressSnackbarUrls.some(url => request.url.includes(url));

      if (shouldSuppressSnackbar) {
        console.warn(`Error en URL ${request.url} (status: ${error.status}). Snackbar suprimido para esta ruta.`);
        showGenericSnackbar = false; // No mostrar snackbar para estas rutas
      }

      // No mostrar errores para URLs de recursos estáticos (imágenes, etc.)
      if (request.url.endsWith('.jpg') || request.url.endsWith('.png') || 
          request.url.endsWith('.svg') || request.url.endsWith('.gif')) {
        console.warn('Recurso no encontrado (imagen/estático):', request.url);
        showGenericSnackbar = false; // Tampoco mostrar snackbar para recursos estáticos
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
            if (request.url.includes('/api/auth/login')) {
              errorMsg = 'Las credenciales ingresadas no son válidas';
              showGenericSnackbar = true; // Asegurar mostrar este error específico
              // Propagar el error inmediatamente para este caso
              return throwError(() => error);
            } else if (authRetryAttempts < MAX_AUTH_RETRIES) {
              authRetryAttempts++;
              showGenericSnackbar = false; // Suprimir snackbar durante el reintento
              // Intentar refrescar el token
              return authService.refreshToken().pipe(
                switchMap(token => {
                  if (token) {
                    const newReq = request.clone({
                      setHeaders: { 'Authorization': `Bearer ${token}` }
                    });
                    authRetryAttempts = 0; // Resetear al tener éxito
                    return next(newReq); // Reintentar la petición
                  } else {
                    // No se pudo refrescar, propagar error y se manejará más abajo
                    return throwError(() => new Error('No se pudo refrescar el token'));
                  }
                }),
                catchError(refreshError => {
                  // Error al intentar refrescar, propagar y se manejará más abajo
                  return throwError(() => refreshError);
                })
              );
            } else {
              // Agotados los reintentos o fallo al refrescar
              errorMsg = 'No autorizado. Por favor inicia sesión nuevamente';
              showGenericSnackbar = true; // Mostrar después de agotar reintentos
              authRetryAttempts = 0;
              authService.logout().then(() => router.navigate(['/login']));
              // Propagar el error original después de la lógica de logout
              return throwError(() => error);
            }
            break;
          case 403:
            errorMsg = 'No tienes permisos para acceder a este recurso';
            break;
          case 404:
            // Ya cubierto por la lógica de suppressSnackbarUrls, pero podemos poner un mensaje por defecto
            if (showGenericSnackbar) {
              errorMsg = 'Recurso no encontrado'; 
            }
            break;
          case 500:
            // Para errores de perfil/logout, no mostrar mensajes (ya estaba)
            if (request.url.includes('/users/profile') || request.url.includes('/auth/logout')) {
              console.warn('Error 500 en el servidor para (snackbar suprimido):', request.url);
              showGenericSnackbar = false;
            } else if (showGenericSnackbar) {
              errorMsg = 'Error en el servidor. Intenta nuevamente más tarde';
            }
            break;
          default:
             if (showGenericSnackbar) {
               errorMsg = 'Ocurrió un error inesperado';
             }
        }
      }
      
      // Mostrar snackbar solo si no se suprimió y hay un mensaje
      if (showGenericSnackbar && errorMsg) {
        snackBar.open(errorMsg, 'Cerrar', {
          duration: 5000,
          panelClass: 'error-snackbar',
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
      
      // Propagar el error original para que otros catchError puedan manejarlo si es necesario
      return throwError(() => error);
    })
  );
}; 