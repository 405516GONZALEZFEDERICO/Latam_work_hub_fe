import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { UserRole } from '../../models/user';
import { AuthService } from '../../services/auth-service/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface RoleAssignmentRequestDto {
  uid: string;
  roleName: UserRole;
}

@Component({
  selector: 'app-view-select-rol',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './view-select-rol.component.html',
  styleUrls: ['./view-select-rol.component.css'],
})
export class RoleSelectionComponent implements OnInit {
  selectedRole: UserRole | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  
  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}
  
  ngOnInit(): void {
    // Verificar si el usuario ya tiene un rol asignado
    const currentUser = this.authService.getCurrentUserSync();
    if (currentUser && currentUser.role !== 'DEFAULT') {
      // Si ya tiene rol, redirigir a home
      this.router.navigate(['/home']);
    }
  }
  
  selectRole(role: UserRole): void {
    this.selectedRole = role;
    this.errorMessage = null; // Limpiar mensajes de error al cambiar la selección
  }
  
  isRoleSelected(role: string): boolean {
    return this.selectedRole === role;
  }
  
  continue(): void {
    if (!this.selectedRole) {
      this.snackBar.open('Por favor selecciona un rol', 'Cerrar', {
        duration: 3000
      });
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = null;
    
    // Obtener el usuario actual
    const currentUser = this.authService.getCurrentUserSync();
    if (!currentUser) {
      this.handleError('No se pudo identificar al usuario actual');
      this.router.navigate(['/login']);
      return;
    }
    
    console.log(`Actualizando rol a ${this.selectedRole} para el usuario ${currentUser.uid}`);
    
    // Usar el servicio de autenticación para actualizar el rol (que manejará errores)
    this.authService.updateUserRole(currentUser.uid, this.selectedRole as UserRole)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Respuesta de actualización de rol:', response);
          this.snackBar.open('Rol actualizado correctamente', 'Cerrar', {
            duration: 3000
          });
          
          // Asegurarse de que el usuario tiene el rol correcto en localStorage
          const updatedUser = this.authService.getCurrentUserSync();
          if (updatedUser && updatedUser.role !== this.selectedRole) {
            console.log('Actualizando rol manualmente en localStorage');
            updatedUser.role = this.selectedRole as UserRole;
            localStorage.setItem('currentUserData', JSON.stringify(updatedUser));
            localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
          }
          
          // Navegar a la página principal después de un breve retraso
          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 1000);
        },
        error: (error) => {
          console.error('Error al actualizar rol:', error);
          
          // Si ocurrió un error pero el rol se actualizó localmente, continuar
          const updatedUser = this.authService.getCurrentUserSync();
          if (updatedUser && updatedUser.role === this.selectedRole) {
            this.snackBar.open('Rol actualizado localmente (modo offline)', 'Cerrar', {
              duration: 3000
            });
            
            setTimeout(() => {
              this.router.navigate(['/home']);
            }, 1000);
          } else {
            this.handleError('No se pudo actualizar el rol. Intenta nuevamente.');
          }
        }
      });
  }
  
  private handleError(message: string): void {
    this.isLoading = false;
    this.errorMessage = message;
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000
    });
  }
}