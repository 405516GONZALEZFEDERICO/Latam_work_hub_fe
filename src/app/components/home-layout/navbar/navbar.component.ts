import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth-service/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  @Input() isSidebarOpen: boolean = false;
  @Input() displayName: string = 'Usuario';
  @Input() userRole: string = '';
  @Input() photoUrl: string = '';
  @Output() toggleSidebar = new EventEmitter<void>();
  
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private authService = inject(AuthService);
  
  get userInitial(): string {
    return this.displayName ? this.displayName.charAt(0).toUpperCase() : '?';
  }
  
  getRoleClass(): string {
    return this.userRole ? this.userRole.toLowerCase() : 'default';
  }
  
  toggleSidebarEvent(): void {
    this.toggleSidebar.emit();
  }
  
  openUserMenu(): void {
    // El menú se abre automáticamente con matMenuTriggerFor
  }
  
  navigateToProfile(): void {
    this.router.navigate(['/home/profile/personal']);
  }
  
  navigateToSettings(): void {
    this.router.navigate(['/home/settings']);
  }
  
  navigateToHelp(): void {
    this.router.navigate(['/home/faq']);
  }
  
  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.snackBar.open('Sesión cerrada exitosamente', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      this.snackBar.open('Error al cerrar sesión', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
    }
  }
} 