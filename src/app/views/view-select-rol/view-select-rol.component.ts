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
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface RoleAssignmentRequestDto {
  uid: string;
  roleName: UserRole;
  adminKey?: string; // Campo opcional para la clave de administrador
}

@Component({
  selector: 'app-view-select-rol',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './view-select-rol.component.html',
  styleUrls: ['./view-select-rol.component.css'],
})
export class RoleSelectionComponent implements OnInit {
  selectedRole: UserRole | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  adminKey: string = ''; // Propiedad para almacenar la clave de administrador
  
  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}
  
  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUserSync();
    if (currentUser && currentUser.role !== 'DEFAULT') {
      this.router.navigate(['/home']);
    }
  }
  
  selectRole(role: UserRole): void {
    this.selectedRole = role;
    this.errorMessage = null;
    
    // Si cambia de rol y no es ADMIN, limpiar la clave
    if (role !== 'ADMIN') {
      this.adminKey = '';
    }
  }
  
  isRoleSelected(role: string): boolean {
    return this.selectedRole === role;
  }
  
  // Método para validar si el rol seleccionado es válido para continuar
  isRoleValid(): boolean {
    if (!this.selectedRole) return false;
    
    // Si es ADMIN, verificar que haya ingresado una clave
    if (this.selectedRole === 'ADMIN') {
      return this.adminKey.trim().length > 0;
    }
    
    return true; // Para otros roles, solo verificar que haya un rol seleccionado
  }
  
  continue(): void {
    if (!this.isRoleValid()) {
      if (this.selectedRole === 'ADMIN' && !this.adminKey) {
        this.snackBar.open('Por favor ingresa la clave de administrador', 'Cerrar', {
          duration: 3000
        });
      } else {
        this.snackBar.open('Por favor selecciona un rol', 'Cerrar', {
          duration: 3000
        });
      }
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
    
    // Crear el objeto de solicitud
    const requestData: RoleAssignmentRequestDto = {
      uid: currentUser.uid,
      roleName: this.selectedRole as UserRole
    };
    
    // Si es ADMIN, agregar la clave al objeto de solicitud
    if (this.selectedRole === 'ADMIN') {
      requestData.adminKey = this.adminKey;
    }
    
    // Usar el servicio de autenticación para actualizar el rol
    this.authService.updateUserRole(currentUser.uid, this.selectedRole as UserRole, this.adminKey)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.snackBar.open('Rol actualizado correctamente', 'Cerrar', {
            duration: 3000
          });
          
          // Asegurarse de que el usuario tiene el rol correcto en localStorage
          const updatedUser = this.authService.getCurrentUserSync();
          if (updatedUser) {
            if (updatedUser.role !== this.selectedRole) {
              updatedUser.role = this.selectedRole as UserRole;
            }
            // Asegurar que siempre se guarde en localStorage
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
          
          if (this.selectedRole === 'ADMIN' && error?.error?.message === 'Clave de administrador incorrecta') {
            this.handleError('Clave de administrador incorrecta. Inténtalo nuevamente.');
            return;
          }
          
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