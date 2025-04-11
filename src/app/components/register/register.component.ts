import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service'; // Importar el servicio
import { ViewLoginComponent } from '../../views/view-login/view-login.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, CommonModule, ViewLoginComponent, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  showError: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading: boolean = false;
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService // Inyectar el servicio
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      termsCheck: [false, Validators.requiredTrue]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Inicialización adicional si es necesaria
  }

  // Validador personalizado para verificar que las contraseñas coincidan
  passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;
    
    if (password === confirmPassword) {
      formGroup.get('confirmPassword')?.setErrors(null);
    } else {
      formGroup.get('confirmPassword')?.setErrors({ mismatch: true });
    }
    
    return null;
  }

  onRegister() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = null;
      
      const { email, password } = this.registerForm.value;
      
      this.authService.register(email, password).subscribe({
        next: (response) => {
          console.log('Usuario registrado:', response);
          this.successMessage = '¡Registro exitoso!';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1500);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al registrar:', error);
          this.errorMessage = error.message || 'Error al registrar el usuario';
          this.showError = true;
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched(this.registerForm);
      this.showError = true;
    }
  }

  // Método para marcar todos los campos como tocados
  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  async registerWithGoogle() {
    this.isLoading = true;
    this.errorMessage = null;
    this.showError = false;
    
    console.log('Iniciando registro con Google...');
    
    try {
      await this.authService.registerWithGoogle();
      // No necesitamos hacer nada más aquí porque la redirección
      // se manejará en el AuthService
    } catch (error) {
      console.error('Error al registrar con Google:', error);
      this.errorMessage = error instanceof Error ? error.message : 'Error al registrar con Google';
      this.showError = true;
      this.isLoading = false;
    }
  }
}