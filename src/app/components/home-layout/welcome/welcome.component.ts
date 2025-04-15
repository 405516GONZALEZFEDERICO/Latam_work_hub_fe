import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth-service/auth.service';
import { User, UserRole } from '../../../models/user';
import { ProfileService } from '../../../services/profile/profile.service';
import { ProfileData } from '../../../models/profile';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {
  currentUser: User | null = null;
  profileData: ProfileData | null = null;
  
  constructor(
    private authService: AuthService,
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
    // Obtener el usuario actual
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      
      // Si tenemos un usuario, cargar su perfil
      if (user) {
        this.loadUserProfile();
      }
    });
  }
  
  loadUserProfile(): void {
    this.profileService.getProfileData().subscribe({
      next: (profile: ProfileData) => {
        console.log('Profile loaded in welcome component:', profile);
        this.profileData = profile;
      },
      error: (error: any) => {
        console.error('Error al cargar el perfil en welcome:', error);
      }
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
} 