import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { ProfileValidationService } from '../services/profile/profile-validation.service';
import { AuthService } from '../services/auth-service/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileCompletionGuard implements CanActivate {
  private profileValidationService = inject(ProfileValidationService);
  private router = inject(Router);
  private authService = inject(AuthService);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    const currentUser = this.authService.getCurrentUserSync();
    if (!currentUser) {
      return this.router.createUrlTree(['/login']);
    }

    return this.profileValidationService.isProfileComplete().pipe(
      take(1),
      map(isComplete => {
        if (isComplete) {
          return true;
        } else {
          // Redirigir al usuario a la sección de perfil para completar sus datos
          return this.router.createUrlTree(['/home/profile/personal'], {
            queryParams: { 
              incomplete: true,
              redirect: state.url 
            }
          });
        }
      })
    );
  }
} 