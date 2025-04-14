import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { UserRole } from '../../models/user';
import { AuthService } from '../../services/auth-service/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-view-select-rol',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './view-select-rol.component.html',
  styleUrls: ['./view-select-rol.component.scss'],
})
export class RoleSelectionComponent implements OnInit {
  selectedRole: UserRole | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    // Verificar si el usuario ya tiene un rol asignado
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (user && user.role && user.role !== 'DEFAULT') {
          this.redirectBasedOnRole(user.role);
        }
      },
      error: (error) => {
        console.error('Error al obtener el usuario actual:', error);
      }
    });
  }

  selectRole(role: UserRole): void {
    this.selectedRole = role;
  }

  continue(): void {
    if (!this.selectedRole) {
      this.errorMessage = 'Por favor, selecciona un tipo de cuenta para continuar.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (!user || !user.uid) {
          this.errorMessage = 'No hay un usuario autenticado. Por favor, inicia sesión nuevamente.';
          this.isLoading = false;
          return of(null);
        }
        return this.authService.updateUserRole(user.uid, this.selectedRole!);
      }),
      catchError(error => {
        this.isLoading = false;
        this.errorMessage = `Error al actualizar el rol: ${error.message || 'Por favor, intenta de nuevo.'}`;
        console.error('Error al actualizar el rol:', error);
        return throwError(() => error);
      })
    ).subscribe({
      next: () => {
        this.isLoading = false;
        this.redirectBasedOnRole(this.selectedRole!);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = `Error al actualizar el rol: ${error.message || 'Por favor, intenta de nuevo.'}`;
        console.error('Error al actualizar el rol:', error);
      }
    });
  }

  private redirectBasedOnRole(role: UserRole): void {
    switch (role) {
      case 'PROVEEDOR':
        // Redirigir al formulario de registro de empresa cuando es proveedor
        this.router.navigate(['/profile/company']);
        break;
      case 'CLIENTE':
        // Redirigir al formulario de perfil personal cuando es cliente
        this.router.navigate(['/profile/personal']);
        break;
      case 'ADMIN':
        // Redirigir al panel de administración cuando es admin
        this.router.navigate(['/admin']);
        break;
      default:
        // Ruta por defecto
        this.router.navigate(['/home']);
        break;
    }
  }
}