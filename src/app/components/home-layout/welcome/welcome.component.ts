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
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit {
  currentUser: User | null = null;
  profileData: ProfileData | null = null;
  
  constructor(
    private authService: AuthService,
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
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