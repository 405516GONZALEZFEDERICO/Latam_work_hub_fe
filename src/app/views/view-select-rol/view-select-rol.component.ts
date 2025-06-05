import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth-service/auth.service';
import { Router } from '@angular/router';
import { UserRole } from '../../models/user';
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
    MatProgressBarModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './view-select-rol.component.html',
  styleUrl: './view-select-rol.component.css'
})
export class ViewSelectRolComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isLoading = false;
  selectedRole: UserRole | null = null;
  adminKey: string = ''; // Propiedad para almacenar la clave de administrador
  errorMessage: string = ''; // Error message for template

  ngOnInit() {
    this.validateUserState();
  }

  private async validateUserState() {
    try {
      const currentUser = this.authService.getCurrentUserSync();
      
      if (!currentUser) {
        this.router.navigate(['/login']);
        return;
      }

      if (currentUser.role && currentUser.role !== 'DEFAULT') {
        this.router.navigate(['/home']);
        return;
      }
    } catch (error) {
      this.router.navigate(['/login']);
    }
  }

  selectRole(role: UserRole) {
    this.selectedRole = role;
    this.adminKey = '';
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

  async confirmRole() {
    if (!this.selectedRole) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = ''; // Clear previous errors

    try {
      const currentUser = this.authService.getCurrentUserSync();
      
      if (!currentUser?.uid) {
        throw new Error('No se pudo obtener la información del usuario');
      }

      await this.authService.updateUserRole(
        currentUser.uid,
        this.selectedRole
      ).toPromise();

      this.router.navigate(['/home']);
    } catch (error) {
      this.isLoading = false;
      this.errorMessage = error instanceof Error ? error.message : 'Error al asignar el rol';
    }
  }

  // Method called by template
  continue() {
    this.confirmRole();
  }

  getRoleDescription(role: UserRole): string {
    switch (role) {
      case 'CLIENTE':
        return 'Busca y reserva espacios para trabajar';
      case 'PROVEEDOR':
        return 'Ofrece espacios de trabajo a clientes';
      default:
        return '';
    }
  }

  getRoleIcon(role: UserRole): string {
    switch (role) {
      case 'CLIENTE':
        return 'person_search';
      case 'PROVEEDOR':
        return 'business';
      default:
        return 'help';
    }
  }

  getSelectedRoleTitle(): string {
    if (!this.selectedRole) return '';
    
    switch (this.selectedRole) {
      case 'CLIENTE':
        return 'Cliente';
      case 'PROVEEDOR':
        return 'Proveedor';
      default:
        return '';
    }
  }
}