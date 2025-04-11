import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';

type UserType = 'FREELANCER' | 'EMPLOYER' | null;

@Component({
  selector: 'app-view-select-rol',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-select-rol.component.html',
  styleUrl: './view-select-rol.component.css',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ViewSelectRolComponent {
  selectedType: UserType = null;
  isLoading = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  selectUserType(type: UserType) {
    this.selectedType = type;
  }

  getButtonText(): string {
    return this.isLoading ? 'Procesando...' : 'Continuar';
  }

  async confirmSelection(): Promise<void> {
    if (!this.selectedType || this.isLoading) return;

    this.isLoading = true;

    try {
      const idToken = this.authService.getIdToken();
      if (!idToken) {
        throw new Error('No hay token disponible');
      }

      await this.http.post('http://localhost:8080/api/auth/update-role', null, {
        params: {
          idToken,
          role: this.selectedType
        }
      }).toPromise();

      const currentUser = this.authService.currentUserSubject.value;
      if (currentUser) {
        currentUser.role = this.selectedType;
        this.authService.currentUserSubject.next(currentUser);
      }

      await this.router.navigate(['/default-section']);
    } catch (error) {
      console.error('Error al seleccionar rol:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
