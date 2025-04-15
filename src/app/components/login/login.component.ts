import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service/auth.service';
import { ViewLoginComponent } from '../../views/view-login/view-login.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';

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
    MatCheckboxModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  hidePassword = true;
  
  async loginWithGoogle(): Promise<void> {
    try {
      await this.authService.loginWithGoogle();
      this.router.navigate(['/select-role']);
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
    }
  }
  
  loginForm: FormGroup;
  isLoading = false;
  showError = false;
  errorMessage = 'Error al iniciar sesión. Verifique sus credenciales.';

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

  ngOnInit(): void {
    // Additional initialization logic if needed
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.showError = false;

    const { email, password, rememberMe } = this.loginForm.value;

    this.authService.loginWithEmail(email, password, rememberMe).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        // Conseguir el rol actual del usuario
        this.authService.getCurrentUser().subscribe(user => {
          console.log('Current user after login:', user);
          
          if (user && user.role && user.role !== 'DEFAULT') {
            console.log('Navegando a home con rol:', user.role);
            this.router.navigate(['/home']);
          } else {
            console.log('Navegando a select-role');
            this.router.navigate(['/select-role']);
          }
        });
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
        this.errorMessage = 'No se pudo enviar el correo de recuperación. Intente nuevamente.';
        console.error('Password reset error:', error);
      }
    });
  }
}
