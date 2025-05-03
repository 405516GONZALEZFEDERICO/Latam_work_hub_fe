import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
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
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  @Input() isSidebarOpen: boolean = false;
  @Input() displayName: string = 'Usuario';
  @Input() userRole: string = '';
  @Input() photoUrl: string = '';
  @Output() toggleSidebar = new EventEmitter<void>();
  
  private snackBar=inject(MatSnackBar);
  
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
  }
} 