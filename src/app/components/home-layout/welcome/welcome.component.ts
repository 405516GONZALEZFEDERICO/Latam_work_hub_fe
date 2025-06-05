import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../../services/auth-service/auth.service';
import { User } from '../../../models/user';
import { Subject, takeUntil, distinctUntilChanged, filter } from 'rxjs';

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
  styleUrls: ['./welcome.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WelcomeComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();
  private isInitialized = false;
  private _cachedActions: any[] | null = null;
  private _lastRole: string | null = null;

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Primero intentar obtener el usuario de forma síncrona para evitar parpadeo inicial
    const syncUser = this.authService.getCurrentUserSync();
    if (syncUser) {
      this.currentUser = syncUser;
      this.isInitialized = true;
      this.cdr.detectChanges();
    }

    // Luego suscribirse a cambios, pero solo si el usuario cambia realmente
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged((prev, curr) => {
        // Solo actualizar si realmente cambió el usuario o su rol
        if (!prev && !curr) return true;
        if (!prev || !curr) return false;
        return prev.uid === curr.uid && prev.role === curr.role;
      }),
      filter(user => {
        // Solo procesar si no está inicializado o si el usuario es diferente
        return !this.isInitialized || (user?.uid !== this.currentUser?.uid || user?.role !== this.currentUser?.role);
      })
    ).subscribe(user => {
      this.currentUser = user;
      this.isInitialized = true;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // TrackBy function para optimizar el renderizado de las cards
  trackByAction(index: number, action: any): string {
    return action.title || index;
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
    
    // Cache para evitar recálculos innecesarios
    if (this._cachedActions && this._lastRole === this.currentUser.role) {
      return this._cachedActions;
    }

    let actions: any[];
    
    switch (this.currentUser.role) {
      case 'ADMIN':
        actions = [
          { title: 'Panel de Control', icon: 'dashboard', route: '/home/admin-panel', description: 'Gestionar usuarios y sistema' },
          { title: 'Analytics', icon: 'analytics', route: '/home/dashboard', description: 'Ver estadísticas' },
          { title: 'Informes', icon: 'bar_chart', route: '/home/reports', description: 'Generar reportes' },
          { title: 'Configuración', icon: 'settings', route: '/home/settings', description: 'Ajustes del sistema' }
        ];
        break;
      case 'CLIENTE':
        actions = [
          { title: 'Mi Dashboard', icon: 'analytics', route: '/home/client-dashboard', description: 'Ver mis estadísticas' },
          { title: 'Buscar Espacios', icon: 'search', route: '/home/search-spaces', description: 'Encuentra el espacio perfecto' },
          { title: 'Mis Reservas', icon: 'event', route: '/home/reservas', description: 'Gestiona tus reservas' },
          { title: 'Mi Perfil', icon: 'person', route: '/home/profile/personal', description: 'Completar información' },
          { title: 'Ayuda', icon: 'help_center', route: '/home/faq', description: 'Preguntas frecuentes' }
        ];
        break;
      case 'PROVEEDOR':
        actions = [
          { title: 'Mi Dashboard', icon: 'analytics', route: '/home/provider-dashboard', description: 'Ver mis estadísticas' },
          { title: 'Mis Espacios', icon: 'business', route: '/home/spaces', description: 'Gestiona tus espacios' },
          { title: 'Nuevo Espacio', icon: 'add_business', route: '/home/spaces/create', description: 'Publicar nuevo espacio' },
          { title: 'Mi Perfil', icon: 'person', route: '/home/profile/personal', description: 'Perfil empresarial' },
          { title: 'Ayuda', icon: 'help_center', route: '/home/faq', description: 'Guía para proveedores' }
        ];
        break;
      default:
        actions = [
          { title: 'Mi Perfil', icon: 'person', route: '/home/profile/personal', description: 'Completar información' },
          { title: 'Ayuda', icon: 'help_center', route: '/home/faq', description: 'Preguntas frecuentes' }
        ];
        break;
    }
    
    // Guardar en cache
    this._cachedActions = actions;
    this._lastRole = this.currentUser.role;
    
    return actions;
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