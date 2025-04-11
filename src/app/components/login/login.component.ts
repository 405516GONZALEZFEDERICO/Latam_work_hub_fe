import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ViewLoginComponent } from '../../views/view-login/view-login.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ViewLoginComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showError = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.showError = false;

    const { email, password, rememberMe } = this.loginForm.value;

    this.authService.loginWithEmail(email, password, rememberMe).subscribe({
      next: (response) => {
        console.log('Respuesta del login:', response); // Para debugging
        
        // Esperar un momento para asegurar que el usuario se haya establecido
        setTimeout(() => {
          const user = this.authService.currentUserSubject.value;
          console.log('Usuario actual:', user); // Para debugging
          
          if (user && user.idToken) {
            this.authService.getRolesAndPermissions(user.idToken).subscribe({
              next: () => {
                console.log('Roles y permisos obtenidos, navegando a default-section');
                this.router.navigate(['/default-section']);
              },
              error: (error) => {
                console.error('Error obteniendo roles:', error);
                this.router.navigate(['/login']);
              }
            });
          } else {
            console.error('No se pudo obtener el usuario o el token');
            this.router.navigate(['/login']);
          }
          this.isLoading = false;
        }, 500); // Pequeña pausa para asegurar que el usuario se haya establecido
      },
      error: (error: Error) => {
        console.error('Error en el login:', error);
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al iniciar sesión';
        this.showError = true;
      }
    });
  }

  async loginWithGoogle(): Promise<void> {
    console.log('Botón de login con Google clickeado');
    this.isLoading = true;
    this.errorMessage = '';
    this.showError = false;

    try {
      console.log('Llamando al servicio de autenticación...');
      await this.authService.loginWithGoogle();
      console.log('Servicio de autenticación llamado exitosamente');
    } catch (error) {
      console.error('Error en el componente durante login con Google:', error);
      this.isLoading = false;
      this.errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión con Google';
      this.showError = true;
    }
  }

  forgotPassword(): void {
    const email = this.loginForm.get('email')?.value;
    this.router.navigate(['/forgot-password'], { queryParams: email ? { email } : {} });
  }
}
