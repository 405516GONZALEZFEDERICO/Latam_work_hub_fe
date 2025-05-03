import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { UserRole } from '../../models/user';
import { AuthService } from '../../services/auth-service/auth.service';
import { ProfileService } from '../../services/profile/profile.service';
import { ProfileData } from '../../models/profile';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { NavbarComponent } from '../../components/home-layout/navbar/navbar.component';
import { inject } from '@angular/core';

@Component({
  selector: 'app-home-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    NavbarComponent,
    RouterLink
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
  // Injecting services using inject()
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  isSidebarOpen = false;
  userData: ProfileData = {} as ProfileData;

  // Animation states
  showConfetti = false;
  showCompletionBadge = false;
  confettiState = 'hidden';
  badgeState = 'hidden';
  timerHideConfetti: any;
  timerHideBadge: any;
  confettiItems = Array(50).fill(0).map((_, i) => i);

  // Current page title
  currentPageTitle: string = 'Bienvenido';


  ngOnInit(): void {
    this.loadUserProfile();
    
    // On large screens, sidebar starts open
    this.isSidebarOpen = window.innerWidth >= 992;
    
    
    // Subscribe to navigation events
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
      }
    });
    
    // Button to manually change to PROVEEDOR role (testing only)
    // @ts-ignore
    window.setProviderRole = () => {
      this.userData.role = 'PROVEEDOR';
    };
  }

  // Window resize detector
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    // On mobile, close sidebar automatically
    if (window.innerWidth < 768 && this.isSidebarOpen) {
      this.isSidebarOpen = false;
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  loadUserProfile(): void {
    // Try to get profile data from service
    this.profileService.getProfileData().subscribe({
      next: (profile: ProfileData) => {
        this.userData = profile;
      },
      error: (error: any) => {
        console.error('Error al cargar el perfil:', error);
        // Use default temporary data if there's an error
        this.userData = {
          displayName: 'Usuario de Prueba',
          email: 'usuario@example.com',
          role: 'PROVEEDOR' as UserRole
        } as ProfileData;
        
        // Try to get user role from auth service
        this.authService.currentUser$.subscribe(user => {
          if (user) {
            this.userData.role = user.role;
          }
        });
      }
    });
  }

  logout(): void {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    }).catch(error => {
      console.error('Error al cerrar sesión:', error);
      // Redirect anyway
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
    // Clean up timers when destroying component
    if (this.timerHideConfetti) {
      clearTimeout(this.timerHideConfetti);
    }
    if (this.timerHideBadge) {
      clearTimeout(this.timerHideBadge);
    }
  }
}