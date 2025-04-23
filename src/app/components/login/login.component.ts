import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service/auth.service';
import { ViewLoginComponent } from '../../views/view-login/view-login.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ViewLoginComponent,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  hidePassword = true;
  loginForm: FormGroup;
  isLoading = false;
  showError = false;
  errorMessage = 'Error al iniciar sesión. Verifique sus credenciales.';
  
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
  }

  async loginWithGoogle(): Promise<void> {
    try {
      await this.authService.loginWithGoogle();
      // La redirección la maneja el servicio de autenticación
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
    }
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.showError = false;

    const { email, password } = this.loginForm.value;

    this.authService.loginWithEmail(email, password).subscribe({
      next: () => {
        this.isLoading = false;
        // La redirección la maneja el servicio de autenticación
      },
      error: (error) => {
        this.isLoading = false;
        this.showError = true;
        this.errorMessage = error?.message || 'Error al iniciar sesión. Verifique sus credenciales.';
        console.error('Login error:', error);
      }
    });
  }

  forgotPassword(): void {
    const email = this.loginForm.get('email')?.value;
    
    if (!email) {
      this.showError = true;
      this.errorMessage = 'Por favor, ingrese su correo electrónico para recuperar su contraseña.';
      return;
    }
    
    this.isLoading = true;
    
    this.authService.recuperarContrasenia(email).subscribe({
      next: () => {
        this.isLoading = false;
        this.showError = false;
        alert('Se ha enviado un correo para restablecer su contraseña.');
      },
      error: (error: any) => {
        this.isLoading = false;
        this.showError = true;
        this.errorMessage = 'No se pudo enviar el correo de recuperación. Verifique que el correo sea correcto.';
        console.error('Password reset error:', error);
      }
    });
  }
}
