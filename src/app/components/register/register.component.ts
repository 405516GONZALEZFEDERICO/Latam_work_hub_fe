import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth-service/auth.service'
import { ViewLoginComponent } from '../../views/view-login/view-login.component';
import { User } from '../../models/user';
import { from } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpParams } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { passwordStrengthValidator } from '../../validators/password-strength.validator';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    RouterLink, 
    CommonModule, 
    ViewLoginComponent, 
    ReactiveFormsModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatIconModule, 
    MatButtonModule, 
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading: boolean = false;
  hidePassword: boolean = true;
  hideConfirmPassword: boolean = true;
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.registerForm = new FormGroup({
      email: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.email]}),
      password: new FormControl('', {nonNullable: true, validators: [
        Validators.required, 
        passwordStrengthValidator()
      ]}),
      confirmPassword: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
      termsCheck: new FormControl(false, {nonNullable: true, validators: [Validators.requiredTrue]})
    }, {
      validators: RegisterComponent.passwordMatchValidator
    });
  }
  
  static passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (password?.value === confirmPassword?.value) {
      confirmPassword?.setErrors(null);
      return null;
    } else {
      confirmPassword?.setErrors({ mismatch: true });
      return { passwordMismatch: true };
    }
  }

  register(): void {
    // Verificar si el formulario es inválido
    if (this.registerForm.invalid) return;

    this.isLoading = true;

    // Desestructuramos email y password desde el formulario
    const { email, password } = this.registerForm.value;

    // Llamada al servicio de registro
    this.authService.register(email, password).subscribe({
      next: (response: string) => {
        console.log('Usuario registrado:', response);
        this.showSuccessSnackbar('Registro exitoso. Redirigiendo...');

        // Pequeña pausa para mostrar el mensaje antes de redirigir
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (error: any) => {
        console.error('Error en el registro:', error);
        
        // Si es un error de autenticación o autorización
        if (error.status === 401 || error.status === 403) {
          this.showErrorSnackbar('No se pudo completar el registro. Verifica tus datos e intenta nuevamente.');
        } else {
          this.showErrorSnackbar(this.getErrorMessage(error));
        }
        
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  registerWithGoogle(): void {
    this.isLoading = true;
    
    // Limpiar posibles datos conflictivos en localStorage
    localStorage.removeItem('currentUserData');
    localStorage.removeItem('userDataTimestamp');
    console.log('Registro con Google: datos de localStorage limpiados');
    
    // Convertir la promesa en Observable para mantener consistencia
    from(this.authService.loginWithGoogle(true)).subscribe({
      next: () => {
        // loginWithGoogle ya maneja la redirección a la página correspondiente
        this.showSuccessSnackbar('Registro con Google exitoso');
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al registrarse con Google:', error);
        this.showErrorSnackbar('Error en el registro con Google. Por favor, intenta nuevamente.');
        this.isLoading = false;
      }
    });
  }
  
  private getErrorMessage(error: any): string {
    // Parsear errores comunes de Firebase/Auth
    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          return 'Este correo electrónico ya está registrado. Por favor, inicia sesión.';
        case 'auth/invalid-email':
          return 'El correo electrónico no es válido.';
        case 'auth/weak-password':
          return 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
        default:
          return `Error: ${error.message || 'Ocurrió un error desconocido'}`;
      }
    }
    
    return 'Error en el registro. Por favor, intenta nuevamente.';
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
    return this.registerForm.get('password')?.errors;
  }
}