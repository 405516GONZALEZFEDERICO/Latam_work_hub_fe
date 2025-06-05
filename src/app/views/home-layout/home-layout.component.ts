import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { Observable, Subject } from 'rxjs';
import { map, shareReplay, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth-service/auth.service';
import { ProfileService } from '../../services/profile/profile.service';
import { User, UserRole } from '../../models/user';
import { NavbarComponent } from '../../components/home-layout/navbar/navbar.component';

@Component({
  selector: 'app-home-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    NavbarComponent
  ],
  templateUrl: './home-layout.component.html',
  styleUrl: './home-layout.component.css'
})
export class HomeLayoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private breakpointObserver = inject(BreakpointObserver);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  isSidebarOpen = false;
  currentUser: User | null = null;
  userPhotoUrl: string | null = null;
  
  // Additional property to store profile data
  private userProfileData: any = null;

  // userData property for template compatibility
  get userData() {
    // Try to get the display name from various sources
    let displayName = 'Usuario';
    
    if (this.currentUser) {
      // Try displayName from Firebase user first
      displayName = this.currentUser.displayName ||
                   // Try profile data if we have it
                   this.userProfileData?.firstName ||
                   this.userProfileData?.fullName ||
                   (this.userProfileData?.firstName && this.userProfileData?.lastName 
                     ? `${this.userProfileData.firstName} ${this.userProfileData.lastName}` 
                     : null) ||
                   // Use email prefix as fallback
                   this.currentUser.email?.split('@')[0] ||
                   'Usuario';
    }
    
    // Photo priority: custom uploaded photo > Google photo > empty
    let photoUrl = '';
    if (this.userPhotoUrl) {
      // User has uploaded a custom photo or backend returned a photo
      photoUrl = this.userPhotoUrl;
    } else if (this.currentUser?.photoURL) {
      // Fall back to Google photo
      photoUrl = this.currentUser.photoURL;
    }
    
    const userData = {
      displayName: displayName,
      email: this.currentUser?.email || '',
      role: this.currentUser?.role || '',
      photoUrl: photoUrl
    };
    
    return userData;
  }

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  ngOnInit() {
    this.loadUserProfile();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  private loadUserProfile() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadUserPhoto();
        }
      });
  }

  private loadUserPhoto() {
    if (this.currentUser?.uid) {
      this.profileService.getProfileData()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (profileData) => {
            if (profileData) {
              // Store profile data for name extraction
              this.userProfileData = profileData;
              
              // Use the photoUrl from backend if available, otherwise fallback to Google photo
              if (profileData.photoUrl && profileData.photoUrl.trim() !== '') {
                this.userPhotoUrl = profileData.photoUrl;
              } else {
                // Clear userPhotoUrl to allow Google photo fallback
                this.userPhotoUrl = null;
              }
            }
          },
          error: (error) => {
            // On error, ensure we don't block Google photo fallback
            this.userPhotoUrl = null;
          }
        });
    }
  }

  getUserRole(): UserRole | null {
    return this.currentUser?.role || null;
  }

  isClientRole(): boolean {
    return this.getUserRole() === 'CLIENTE';
  }

  isProviderRole(): boolean {
    return this.getUserRole() === 'PROVEEDOR';
  }

  isAdminRole(): boolean {
    return this.getUserRole() === 'ADMIN';
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      this.router.navigate(['/login']);
    }
  }

  navigateToProfile() {
    this.router.navigate(['/profile']);
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  navigateToHelp() {
    this.router.navigate(['/help']);
  }
}