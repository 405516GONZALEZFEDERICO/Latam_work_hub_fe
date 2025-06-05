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

  const getErrorMessage = (error: HttpErrorResponse): string => {
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.error?.error && typeof error.error.error === 'string') {
      return error.error.error;
    }
    if (error.message) {
      return error.message;
    }
    if (error.error && typeof error.error === 'string') {
      return error.error;
    }
    switch (error.status) {
      case 0:
        return 'No se pudo conectar al servidor. Verifique su conexión a internet.';
      case 400:
        return 'Solicitud incorrecta. Verifique los datos enviados.';
      case 401:
        return 'No autorizado. Su sesión puede haber expirado.';
      case 403:
        return 'Acceso denegado. No tiene permisos para realizar esta acción.';
      case 404:
        return 'Recurso no encontrado.';
      case 500:
        return 'Error interno del servidor. Intente nuevamente más tarde.';
      case 502:
        return 'El servidor no está disponible temporalmente.';
      case 503:
        return 'Servicio no disponible. Intente nuevamente más tarde.';
      default:
        return `Error ${error.status}: ${error.statusText || 'Error desconocido'}`;
    }
  };

  const shouldSkipSnackBar = (request: HttpRequest<unknown>, error: HttpErrorResponse): boolean => {
    const url = request.url;
    const status = error.status;

    const skipPatterns = [
      '/dashboard',
      '/kpi',
      '/spaces-list',
      '/spaces/search',
      '/uploads/',
      '/static/',
      '/assets/',
      '/images/',
      '/photos/',
      '/api/auth',
      '/verify',
      '/personal-data',
      '/profile-data',
      '/address',
      '/profile'
    ];

    if (skipPatterns.some(pattern => url.includes(pattern))) {
      if (status === 404) {
        return true;
      }
    }

    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|css|js|ico)$/i)) {
      return true;
    }

    if (status === 401 || status === 403) {
      return true;
    }

    if (status === 422 || status === 400) {
      return true;
    }

    if (status === 500) {
      if (url.includes('/spaces-list') || 
          url.includes('/auth/verificar-rol') || 
          url.includes('/dashboard') || 
          url.includes('/kpi') ||
          url.includes('/users/admin') ||
          url.includes('/provider-dashboard') ||
          url.includes('/client-dashboard')) {
        return true;
      }
    }

    return false;
  };

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (shouldSkipSnackBar(request, error)) {
        return throwError(() => error);
      }

      const errorMessage = getErrorMessage(error);

      if (error.status !== 401 && error.status !== 403) {
        snackBar.open(
          errorMessage,
          'Cerrar',
          {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
          }
        );
      }

      return throwError(() => error);
    })
  );
}; 