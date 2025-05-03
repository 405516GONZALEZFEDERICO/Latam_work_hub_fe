import { CanActivate, Router } from '@angular/router';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';
import { AuthService } from '../app/services/auth-service/auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(): Observable<boolean> | boolean {
    // Obtener el usuario de forma sincrónica primero para evitar verificaciones innecesarias
    const currentUser = this.authService.getCurrentUserSync();
    
    // Si ya tenemos el usuario en memoria, hacemos la redirección basada en esa información
    if (currentUser) {
      if (!currentUser.role || currentUser.role === 'DEFAULT') {
        this.router.navigate(['/select-role']);
      } else {
        this.router.navigate(['/home']);
      }
      return false; // No permitir acceso a login
    }
    
    // Si no hay usuario en memoria, permitir acceso a login sin verificar con el backend
    return true;
  }
} 