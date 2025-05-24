import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../../services/auth-service/auth.service';
import { User } from '../../../models/user';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit {
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.cdr.detectChanges();
    });
  }
  
  getUserRoleDisplay(): string {
    if (!this.currentUser || !this.currentUser.role) {
      return 'Usuario';
    }
    
    const roleMap: Record<string, string> = {
      'CLIENTE': 'Cliente',
      'PROVEEDOR': 'Proveedor',
      'ADMIN': 'Administrador',
      'DEFAULT': 'Usuario'
    };
    
    return roleMap[this.currentUser.role as string] || 'Usuario';
  }

  getRoleIcon(): string {
    if (!this.currentUser?.role) return 'person';
    
    const iconMap: Record<string, string> = {
      'CLIENTE': 'person',
      'PROVEEDOR': 'business',
      'ADMIN': 'admin_panel_settings',
      'DEFAULT': 'person'
    };
    
    return iconMap[this.currentUser.role as string] || 'person';
  }

  getRoleColor(): string {
    if (!this.currentUser?.role) return '#6c757d';
    
    const colorMap: Record<string, string> = {
      'CLIENTE': '#007bff',
      'PROVEEDOR': '#28a745',
      'ADMIN': '#dc3545',
      'DEFAULT': '#6c757d'
    };
    
    return colorMap[this.currentUser.role as string] || '#6c757d';
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  // Role-specific quick actions
  getQuickActions() {
    if (!this.currentUser?.role) return [];

    switch (this.currentUser.role) {
      case 'ADMIN':
        return [
          { title: 'Panel de Control', icon: 'dashboard', route: '/home/admin-panel', description: 'Gestionar usuarios y sistema' },
          { title: 'Analytics', icon: 'analytics', route: '/home/dashboard', description: 'Ver estadísticas' },
          { title: 'Informes', icon: 'bar_chart', route: '/home/reports', description: 'Generar reportes' },
          { title: 'Configuración', icon: 'settings', route: '/home/settings', description: 'Ajustes del sistema' }
        ];
      case 'CLIENTE':
        return [
          { title: 'Buscar Espacios', icon: 'search', route: '/home/search-spaces', description: 'Encuentra el espacio perfecto' },
          { title: 'Mis Reservas', icon: 'event', route: '/home/reservas', description: 'Gestiona tus reservas' },
          { title: 'Mi Perfil', icon: 'person', route: '/home/profile/personal', description: 'Completar información' },
          { title: 'Ayuda', icon: 'help_center', route: '/home/faq', description: 'Preguntas frecuentes' }
        ];
      case 'PROVEEDOR':
        return [
          { title: 'Mis Espacios', icon: 'business', route: '/home/spaces', description: 'Gestiona tus espacios' },
          { title: 'Nuevo Espacio', icon: 'add_business', route: '/home/spaces/create', description: 'Publicar nuevo espacio' },
          { title: 'Mi Perfil', icon: 'person', route: '/home/profile/personal', description: 'Perfil empresarial' },
          { title: 'Ayuda', icon: 'help_center', route: '/home/faq', description: 'Guía para proveedores' }
        ];
      default:
        return [
          { title: 'Mi Perfil', icon: 'person', route: '/home/profile/personal', description: 'Completar información' },
          { title: 'Ayuda', icon: 'help_center', route: '/home/faq', description: 'Preguntas frecuentes' }
        ];
    }
  }

  // Role-specific welcome message
  getRoleWelcomeMessage(): string {
    if (!this.currentUser?.role) return 'Bienvenido a LATAM Work Hub';

    switch (this.currentUser.role) {
      case 'ADMIN':
        return 'Panel de Administración - LATAM Work Hub';
      case 'CLIENTE':
        return 'Encuentra tu espacio de trabajo ideal';
      case 'PROVEEDOR':
        return 'Gestiona y promociona tus espacios';
      default:
        return 'Bienvenido a LATAM Work Hub';
    }
  }
} 