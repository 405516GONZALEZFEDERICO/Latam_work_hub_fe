import { Component, OnInit, HostListener, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { UserRole } from '../../models/user';
import { AuthService } from '../../services/auth-service/auth.service';
import { ProfileService } from '../../services/profile/profile.service';
import { ProfileData } from '../../models/profile';
import { trigger, state, style, animate, transition } from '@angular/animations';

// Importamos los componentes
import { NavbarComponent } from '../../components/home-layout/navbar/navbar.component';
import { NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-home-layout',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    NavbarComponent,
    RouterOutlet,
    RouterModule
  ],
  templateUrl: './home-layout.component.html',
  styleUrls: ['./home-layout.component.css'],
  animations: [
    trigger('confettiAnimation', [
      state('hidden', style({
        opacity: 0,
        transform: 'translateY(-100%)'
      })),
      state('visible', style({
        opacity: 1,
        transform: 'translateY(0)'
      })),
      transition('hidden => visible', animate('500ms ease-in')),
      transition('visible => hidden', animate('500ms ease-out'))
    ]),
    trigger('completionBadge', [
      state('hidden', style({
        opacity: 0,
        transform: 'scale(0.5)'
      })),
      state('visible', style({
        opacity: 1,
        transform: 'scale(1)'
      })),
      transition('hidden => visible', [
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1.2)' })),
        animate('150ms ease-in', style({ transform: 'scale(1)' }))
      ]),
      transition('visible => hidden', animate('300ms ease-in'))
    ])
  ]
})
export class HomeLayoutComponent implements OnInit, OnDestroy {
  // Inyectando servicios usando inject()
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  isSidebarOpen = false;
  userData: ProfileData = {} as ProfileData;

  // Estado para las animaciones de celebración
  showConfetti = false;
  showCompletionBadge = false;
  confettiState = 'hidden';
  badgeState = 'hidden';
  timerHideConfetti: any;
  timerHideBadge: any;
  confettiItems = Array(50).fill(0).map((_, i) => i);

  // Propiedad para almacenar el título actual
  currentPageTitle: string = 'Bienvenido';

  constructor() {
    console.log('HomeLayoutComponent inicializado');
  }

  ngOnInit(): void {
    // this.loadUserProfile();
    
    // En pantallas grandes, el sidebar comienza abierto
    this.isSidebarOpen = window.innerWidth >= 992;
    
    // Agregar logs para depuración
    console.log('HomeLayoutComponent inicializado');
    console.log('Ruta actual:', this.router.url);
    
    // Suscribirse a eventos de navegación
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        console.log('Navegación completada:', event.url);
      }
    });
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

  // loadUserProfile(): void {
  //   this.profileService.getProfileData().subscribe({
  //     next: (profile: ProfileData) => {
  //       console.log('Profile loaded:', profile);
  //       this.userData = profile;
  //     },
  //     error: (error: any) => {
  //       console.error('Error al cargar el perfil:', error);
  //       // Usar datos por defecto
  //       this.userData = {
  //         displayName: 'Usuario de Prueba',
  //         email: 'usuario@example.com',
  //         role: 'PROVEEDOR' as UserRole
  //       } as ProfileData;
  //     }
  //   });
  // }

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
      'CLIENTE': 'Cliente',
      'PROVEEDOR': 'Proveedor',
      'ADMIN': 'Administrador',
      'DEFAULT': 'Usuario'
    };
    
    return roleMap[this.userData.role] || 'Usuario';
  }
  
  ngOnDestroy(): void {
    // Limpiar timers al destruir el componente
    if (this.timerHideConfetti) {
      clearTimeout(this.timerHideConfetti);
    }
    if (this.timerHideBadge) {
      clearTimeout(this.timerHideBadge);
    }
  }
} 