import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AdminDashboardService } from '../../services/dashboard/admin-dashboard.service';
import { AuthService } from '../../services/auth-service/auth.service';
import { SpaceService } from '../../services/space/space.service';
import { AdminSpace, AdminUser } from '../../models/admin.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-users-management',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatSnackBarModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './admin-users-management.component.html',
  styleUrls: ['./admin-users-management.component.css']
})
export class AdminUsersManagementComponent implements OnInit {
  // Variables para el control de tabs
  selectedTab = 0;

  // Datos de usuarios
  allClientUsers: AdminUser[] = [];
  allProviderUsers: AdminUser[] = [];
  loadingUsers = {
    clients: false,
    providers: false
  };
  errorUsers = {
    clients: null as string | null,
    providers: null as string | null
  };

  // Datos de espacios
  allSpaces: AdminSpace[] = [];
  loadingSpaces = false;
  errorSpaces: string | null = null;

  // Columnas de las tablas
  userColumns: string[] = ['firebaseUid', 'name', 'email', 'lastLoginAt', 'registrationDate', 'enabled', 'actions'];
  spaceColumns: string[] = ['id', 'name', 'spaceType', 'address.city', 'capacity', 'pricePerHour', 'active', 'actions'];

  // Filtrado
  userFilter: string = '';
  spaceFilter: string = '';
  filteredClientUsers: AdminUser[] = [];
  filteredProviderUsers: AdminUser[] = [];
  filteredSpaces: AdminSpace[] = [];

  currentUserUid: string | null = null;

  constructor(
    private adminDashboardService: AdminDashboardService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private spaceService: SpaceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Obtener el usuario actual para usar su UID en las operaciones
    const currentUser = this.authService.getCurrentUserSync();
    if (currentUser) {
      this.currentUserUid = currentUser.uid;
    }

    // Cargar los datos iniciales
    this.loadClientUsers();
    this.loadProviderUsers();
    this.loadSpaces();
  }

  loadClientUsers(): void {
    this.loadingUsers.clients = true;
    this.errorUsers.clients = null;

    this.adminDashboardService.getClientUsers().subscribe({
      next: (users: AdminUser[]) => {
        this.allClientUsers = users || [];
        this.filteredClientUsers = [...this.allClientUsers];
        this.loadingUsers.clients = false;
        
        if (this.allClientUsers.length === 0) {
          this.snackBar.open('No se encontraron clientes en el sistema', 'Cerrar', {
            duration: 5000
          });
        }
      },
      error: (error: any) => {
        console.error('Error al cargar los clientes:', error);
        this.loadingUsers.clients = false;
        this.errorUsers.clients = `Error al cargar los clientes: ${error.status} ${error.statusText}`;
        
        this.snackBar.open('Error al cargar los clientes. Revisa la consola para más detalles', 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  loadProviderUsers(): void {
    this.loadingUsers.providers = true;
    this.errorUsers.providers = null;

    this.adminDashboardService.getProviderUsers().subscribe({
      next: (users: AdminUser[]) => {
        this.allProviderUsers = users || [];
        this.filteredProviderUsers = [...this.allProviderUsers];
        this.loadingUsers.providers = false;
        
        if (this.allProviderUsers.length === 0) {
          this.snackBar.open('No se encontraron proveedores en el sistema', 'Cerrar', {
            duration: 5000
          });
        }
      },
      error: (error: any) => {
        console.error('Error al cargar los proveedores:', error);
        this.loadingUsers.providers = false;
        this.errorUsers.providers = `Error al cargar los proveedores: ${error.status} ${error.statusText}`;
        
        this.snackBar.open('Error al cargar los proveedores. Revisa la consola para más detalles', 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  loadSpaces(): void {
    this.loadingSpaces = true;
    this.errorSpaces = null;

    console.log('Iniciando carga de espacios...');
    this.spaceService.getAllSpacesForAdmin().subscribe({
      next: (spaces: AdminSpace[]) => {
        console.log('Espacios cargados con éxito:', spaces);
        this.allSpaces = spaces || [];
        this.filteredSpaces = [...this.allSpaces];
        this.loadingSpaces = false;
        
        if (this.allSpaces.length === 0) {
          this.snackBar.open('No se encontraron espacios en el sistema', 'Cerrar', {
            duration: 5000
          });
        }
      },
      error: (error: any) => {
        console.error('Error al cargar los espacios:', error);
        console.error('Detalles del error:', JSON.stringify(error));
        this.loadingSpaces = false;
        this.errorSpaces = `Error al cargar los espacios: ${error.status} ${error.statusText}`;
        
        this.snackBar.open('Error al cargar los espacios. Revisa la consola para más detalles', 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onTabChange(index: number): void {
    this.selectedTab = index;
  }

  toggleUserStatus(user: AdminUser): void {
    console.log('Intentando cambiar estado del usuario:', user);
    console.log('Firebase UID del usuario:', user.firebaseUid);
    
    if (!user.firebaseUid) {
      console.error('Error: El usuario no tiene un UID de Firebase válido', user);
      this.snackBar.open('Error: El usuario no tiene un identificador válido', 'Cerrar', {
        duration: 5000
      });
      return;
    }
    
    this.adminDashboardService.toggleUserStatus(user).subscribe({
      next: (result) => {
        if (result) {
          // Actualizar estado localmente
          user.enabled = !user.enabled;
          this.snackBar.open('Estado del usuario actualizado correctamente', 'Cerrar', {
            duration: 3000
          });
        } else {
          this.snackBar.open('No se pudo actualizar el estado del usuario', 'Cerrar', {
            duration: 3000
          });
        }
      },
      error: (error) => {
        console.error('Error al actualizar el estado del usuario:', error);
        this.snackBar.open('Error al actualizar el estado del usuario', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  toggleSpaceStatus(space: AdminSpace): void {
    // Asumimos que hay un método en el servicio para activar/desactivar espacios
    this.spaceService.toggleSpaceStatus(space.id, !space.active).subscribe({
      next: (success) => {
        if (success) {
          space.active = !space.active;
          this.snackBar.open('Estado del espacio actualizado correctamente', 'Cerrar', {
            duration: 3000
          });
        } else {
          this.snackBar.open('No se pudo actualizar el estado del espacio', 'Cerrar', {
            duration: 3000
          });
        }
      },
      error: (error) => {
        console.error('Error al actualizar el estado del espacio:', error);
        this.snackBar.open('Error al actualizar el estado del espacio', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  applyUserFilter(): void {
    const filterValue = this.userFilter.trim().toLowerCase();
    
    if (this.selectedTab === 0) {
      this.filteredClientUsers = this.allClientUsers.filter(user => 
        (user?.name?.toLowerCase().includes(filterValue) || false) || 
        (user?.email?.toLowerCase().includes(filterValue) || false)
      );
    } else if (this.selectedTab === 1) {
      this.filteredProviderUsers = this.allProviderUsers.filter(user => 
        (user?.name?.toLowerCase().includes(filterValue) || false) || 
        (user?.email?.toLowerCase().includes(filterValue) || false)
      );
    }
  }

  applySpaceFilter(): void {
    const filterValue = this.spaceFilter.trim().toLowerCase();
    
    this.filteredSpaces = this.allSpaces.filter(space => 
      (space?.name?.toLowerCase().includes(filterValue) || false) || 
      (space?.spaceType?.toLowerCase().includes(filterValue) || false) || 
      (space?.address?.city?.toLowerCase().includes(filterValue) || false)
    );
  }

  formatDateTime(timestamp: number | string | null): string {
    if (!timestamp) {
      return 'N/A';
    }
    
    let date: Date;
    try {
      if (typeof timestamp === 'number') {
        // Si es un timestamp numérico
        date = new Date(timestamp);
      } else if (typeof timestamp === 'string') {
        // Si es un string en formato ISO o similar
        if (timestamp.match(/^\d+$/)) {
          // Si es un string que parece un número, convertirlo a número primero
          date = new Date(parseInt(timestamp, 10));
        } else {
          // Intentar parsear como fecha ISO
          date = new Date(timestamp);
        }
      } else {
        return 'Formato inválido';
      }
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      
      // Formatear fecha para mostrar
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return 'Error en formato';
    }
  }

  formatCurrency(value: number | null): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    
    try {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(value);
    } catch (error) {
      console.error('Error al formatear moneda:', error);
      return 'Error en formato';
    }
  }

  /**
   * Obtiene el nombre del rol de un usuario
   */
  getUserRoleName(user: AdminUser): string {
    if (!user) return 'Desconocido';
    
    console.log('Obteniendo rol para usuario:', user);
    
    // Si no hay rol, devolver el valor por defecto según el contexto
    if (!user.role) {
      if (this.selectedTab === 0) return 'CLIENTE';
      if (this.selectedTab === 1) return 'PROVEEDOR';
      return 'Desconocido';
    }
    
    // Si el rol es un string, devolverlo directamente
    if (typeof user.role === 'string') {
      return user.role;
    }
    
    // Si es un objeto, intentar devolver la propiedad name
    if (user.role && typeof user.role === 'object' && 'name' in user.role) {
      return user.role.name || 'Desconocido';
    }
    
    // Si llegamos aquí, no pudimos determinar el rol correctamente
    console.warn('Formato de rol no reconocido:', user.role);
    
    // Devolver un valor basado en la pestaña actual
    if (this.selectedTab === 0) return 'CLIENTE';
    if (this.selectedTab === 1) return 'PROVEEDOR';
    
    return 'Desconocido';
  }

  /**
   * Muestra detalles completos de un usuario en una notificación
   */
  showUserDetails(user: AdminUser): void {
    // Crear una representación legible de las fechas
    const lastLogin = user.lastLoginAt ? this.formatDateTime(user.lastLoginAt) : 'Nunca';
    const registration = user.registrationDate ? this.formatDateTime(user.registrationDate) : 'Desconocida';
    
    // Mostrar información en una notificación
    const message = `
      ID: ${user.id}
      Nombre: ${user.name}
      Email: ${user.email}
      Rol: ${this.getUserRoleName(user)}
      Estado: ${user.enabled ? 'Activo' : 'Inactivo'}
      Último login: ${lastLogin}
      Fecha registro: ${registration}
    `;
    
    this.snackBar.open(message, 'Cerrar', {
      duration: 10000,
      verticalPosition: 'top'
    });
  }
} 