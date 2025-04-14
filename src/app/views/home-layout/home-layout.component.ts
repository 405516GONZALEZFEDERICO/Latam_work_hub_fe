import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { UserRole } from '../../models/user';
import { AuthService } from '../../services/auth-service/auth.service';
import { ProfileData, ProfileService } from '../../services/profile/profile.service';

// Importamos los componentes
import { NavbarComponent } from '../../components/home-layout/navbar/navbar.component';
import { CompleteProfileComponent } from '../../components/profile/complete-profile/complete-profile.component';

@Component({
  selector: 'app-home-layout',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    NavbarComponent,
    CompleteProfileComponent
  ],
  templateUrl: './home-layout.component.html',
  styleUrls: ['./home-layout.component.scss']
})
export class HomeLayoutComponent implements OnInit {
  // Inyectando servicios usando inject()
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  isSidebarOpen = false;
  userData: ProfileData = {
    displayName: 'Usuario',
    email: '',
    role: 'PROVIDER' as UserRole, // Por defecto asignamos el rol de proveedor para pruebas
    profileCompletion: 40
  };

  constructor() {
    console.log('HomeLayoutComponent inicializado');
  }

  ngOnInit(): void {
    this.loadUserProfile();
    
    // En pantallas grandes, el sidebar comienza abierto
    this.isSidebarOpen = window.innerWidth >= 992;
  }

  // Detector de cambio de tamaño de ventana
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    // En móvil, cerramos el sidebar automáticamente
    if (window.innerWidth < 768 && this.isSidebarOpen) {
      this.isSidebarOpen = false;
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  loadUserProfile(): void {
    this.profileService.getProfileData().subscribe({
      next: (profile) => {
        console.log('Profile loaded:', profile);
        this.userData = profile;
      },
      error: (error) => {
        console.error('Error al cargar el perfil:', error);
        // Usar datos por defecto
        this.userData = {
          displayName: 'Usuario de Prueba',
          email: 'usuario@example.com',
          role: 'PROVIDER' as UserRole,
          profileCompletion: 40
        };
      }
    });
  }

  logout(): void {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    }).catch(error => {
      console.error('Error al cerrar sesión:', error);
      // Redirigir de todos modos
      this.router.navigate(['/login']);
    });
  }

  getRoleDisplayName(): string {
    const roleMap: Record<string, string> = {
      'CLIENT': 'Cliente',
      'PROVIDER': 'Proveedor',
      'ADMIN': 'Administrador',
      'DEFAULT': 'Usuario'
    };
    
    return roleMap[this.userData.role] || 'Usuario';
  }
} 