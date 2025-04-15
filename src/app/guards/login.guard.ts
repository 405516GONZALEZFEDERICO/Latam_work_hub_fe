import { CanActivate, Router } from '@angular/router';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth-service/auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        // Si el usuario ya está autenticado, redirigir según su rol
        if (user) {
          console.log('Usuario autenticado:', user);
          if (!user.role || user.role === 'DEFAULT') {
            // Si no tiene un rol asignado, redirigir a selección de rol
            console.log('Redirigiendo a select-role');
            this.router.navigate(['/select-role']);
          } else {
            // Si tiene rol, redirigir a la página principal correspondiente
            console.log('Redirigiendo a home con rol:', user.role);
            this.router.navigate(['/home']);
          }
          return false; // No permitir acceso a la página de login
        }
        
        // Si no está autenticado, permitir acceso a la página de login
        return true;
      }),
      catchError(() => {
        // En caso de error, permitir acceso a la página de login
        return of(true);
      })
    );
  }
} 