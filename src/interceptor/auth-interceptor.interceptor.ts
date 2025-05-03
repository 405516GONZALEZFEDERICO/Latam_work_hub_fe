import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, from, throwError, of } from 'rxjs';
import { catchError, switchMap, retryWhen, delayWhen, take } from 'rxjs/operators';
import { AuthService } from './../app/services/auth-service/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>, 
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Verificar si la ruta requiere autenticación
  // No añadir token a rutas públicas como login/register
  if (request.url.includes('/auth/login') || 
      request.url.includes('/auth/register') || 
      request.url.includes('/auth/google')) {
    return next(request);
  }
  
  // Obtener el token directamente de Firebase Authentication
  return from(authService.getIdToken()).pipe(
    switchMap(token => {
      if (!token) {
        // Si no hay token, intentar recuperarlo desde localStorage
        const cachedUser = authService.getCurrentUserSync();
        if (cachedUser && cachedUser.idToken) {
          // Usar el token guardado en localStorage mientras se refresca
          request = request.clone({
            setHeaders: {
              'Authorization': `Bearer ${cachedUser.idToken}`
            }
          });
          return next(request).pipe(
            catchError((error: HttpErrorResponse) => {
              if (error.status === 401 || error.status === 403) {
                // Si hay error de autenticación, intentar refrescar el token
                return from(authService.refreshToken()).pipe(
                  switchMap(newToken => {
                    if (newToken) {
                      // Reintentar la solicitud con el nuevo token
                      const newRequest = request.clone({
                        setHeaders: {
                          'Authorization': `Bearer ${newToken}`
                        }
                      });
                      return next(newRequest);
                    } else {
                      // Si no se pudo obtener un nuevo token, redirigir al login
                      authService.logout().then(() => {
                        router.navigate(['/login']);
                      });
                      return throwError(() => error);
                    }
                  })
                );
              }
              return throwError(() => error);
            })
          );
        } else {
          // Si no hay token en caché, proceder sin token (posiblemente fallará)
          return next(request).pipe(
            catchError((error: HttpErrorResponse) => {
              if (error.status === 401 || error.status === 403) {
                // Comprobar si realmente hay un usuario autenticado antes de cerrar sesión
                if (authService.isAuthenticated()) {
                  // Intentar una última vez obtener un token fresco
                  return from(authService.refreshToken()).pipe(
                    switchMap(refreshedToken => {
                      if (refreshedToken) {
                        // Reintentar la solicitud con el token refrescado
                        const newRequest = request.clone({
                          setHeaders: {
                            'Authorization': `Bearer ${refreshedToken}`
                          }
                        });
                        return next(newRequest);
                      } else {
                        // Si definitivamente no hay token, redirigir al login
                        authService.logout().then(() => {
                          router.navigate(['/login']);
                        });
                        return throwError(() => error);
                      }
                    })
                  );
                } else {
                  // Si no hay usuario autenticado, simplemente redirigir
                  router.navigate(['/login']);
                }
              }
              return throwError(() => error);
            })
          );
        }
      }
      
      // Si hay token disponible, añadirlo a la solicitud
      request = request.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Procesar la solicitud con el token
      return next(request).pipe(
        catchError((error: HttpErrorResponse) => {
          // Si hay errores de autenticación (401/403)
          if (error.status === 401 || error.status === 403) {
            // Intentar refrescar el token antes de cerrar sesión
            return from(authService.refreshToken()).pipe(
              switchMap(newToken => {
                if (newToken) {
                  // Reintentar la solicitud con el nuevo token
                  const newRequest = request.clone({
                    setHeaders: {
                      'Authorization': `Bearer ${newToken}`
                    }
                  });
                  return next(newRequest);
                } else {
                  // Si no se pudo refrescar, cerrar sesión
                  authService.logout().then(() => {
                    router.navigate(['/login']);
                  });
                  return throwError(() => error);
                }
              })
            );
          }
          return throwError(() => error);
        })
      );
    })
  );
};