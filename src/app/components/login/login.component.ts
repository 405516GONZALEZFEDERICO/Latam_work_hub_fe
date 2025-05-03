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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { passwordStrengthValidator } from '../../../validators/password-strength.validator';

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
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  hidePassword = true;
  loginForm: FormGroup;
  isLoading = false;
  
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  
  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required, 
        passwordStrengthValidator()
      ]]
    });
  }

  ngOnInit(): void {
  }

  async loginWithGoogle(): Promise<void> {
    try {
      // Limpiar posibles datos conflictivos en localStorage
      localStorage.removeItem('currentUserData');
      localStorage.removeItem('userDataTimestamp');
      
      // Especificamos que es un login (no un registro)
      await this.authService.loginWithGoogle(false);
      // La redirección la maneja el servicio de autenticación
    } catch (error) {
      this.showErrorSnackbar('Error en la autenticación con Google. Por favor intente nuevamente.');
    }
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;

    const { email, password } = this.loginForm.value;

    this.authService.loginWithEmail(email, password).subscribe({
      next: () => {
        this.isLoading = false;
        // La redirección la maneja el servicio de autenticación
      },
      error: (error) => {
        this.isLoading = false;
        
        // Verificar si es un error 401 (Unauthorized)
        if (error.status === 401) {
          this.showErrorSnackbar('Credenciales incorrectas. Por favor verifica tu email y contraseña.');
        } else {
          this.showErrorSnackbar('Error al iniciar sesión. Por favor, intenta nuevamente más tarde.');
        }
        
        console.error('Login error:', error);
      }
    });
  }
  forgotPassword(): void {
    const email = this.loginForm.get('email')?.value;
    
    if (!email) {
      this.showErrorSnackbar('Por favor, ingrese su correo electrónico para recuperar su contraseña.');
      return;
    }
    
    this.isLoading = true;
    
    this.authService.recuperarContrasenia(email).subscribe({
      next: (response) => {
        this.isLoading = false;
        // Even if we get an error object, if status was 200, show success
        if (response) {
          this.showSuccessSnackbar('Se ha enviado un correo para restablecer su contraseña.');
        }
      },
      error: (error) => {
        this.isLoading = false;
        
        // Only handle as error if it's not a 200 status
        if (error.status !== 200) {
          if (error.status === 404) {
            this.showErrorSnackbar('No se encontró una cuenta con ese correo electrónico.');
          } else if (error.status === 400) {
            this.showErrorSnackbar('El correo electrónico ingresado no es válido.');
          } else {
            this.showErrorSnackbar('Error al procesar la solicitud. Por favor, intente nuevamente más tarde.');
          }
          console.error('Password recovery error:', error);
        } else {
          // If status is 200, treat it as success even if it came through error handler
          this.showSuccessSnackbar('Se ha enviado un correo para restablecer su contraseña.');
        }
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
  private showErrorSnackbar(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: 'error-snackbar',
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  private showSuccessSnackbar(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: 'success-snackbar',
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  // Getter para acceder fácilmente a los errores de contraseña
  get passwordErrors() {
    return this.loginForm.get('password')?.errors;
  }
}
