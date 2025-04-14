import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  @Input() isSidebarOpen = false;
  @Input() displayName = '';
  @Input() userRole = '';
  @Output() toggleSidebar = new EventEmitter<void>();
  
  constructor(private snackBar: MatSnackBar) {}
  
  get userInitial(): string {
    return this.displayName ? this.displayName.charAt(0).toUpperCase() : '?';
  }
  
  getUserClass(): string {
    return this.userRole.toLowerCase();
  }
  
  toggleSidebarEvent(): void {
    this.toggleSidebar.emit();
  }
  
  showNotifications(): void {
    this.snackBar.open('Las notificaciones estarán disponibles próximamente', 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
  
  openUserMenu(): void {
    this.snackBar.open(`Perfil de ${this.displayName}`, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
} 