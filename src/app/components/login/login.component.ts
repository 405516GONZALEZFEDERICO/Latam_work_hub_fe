import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ViewLoginComponent } from '../../views/view-login/view-login.component'; // Update path as needed
import { AuthService } from '../../services/auth.service'; // Update path as needed
import { Router } from '@angular/router';

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
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showError: boolean = false;

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
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.router.navigate(['/home']);
      }
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      return;
    }
  
    this.isLoading = true;
    this.errorMessage = '';
    this.showError = false;
  
    const { email, password, rememberMe } = this.loginForm.value;
  
    this.authService.loginWithEmail(email, password, rememberMe)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          
          const user = this.authService.currentUserSubject.value;
          if (user && user.idToken) {
            this.authService.getRolesAndPermissions(user.idToken).subscribe({
              next: (rolePermissions) => {
                console.log('Rol obtenido:', rolePermissions);
                this.router.navigate(['/home']);
              },
              error: (error) => {
                console.error('Error al obtener rol y permisos:', error);
                this.router.navigate(['/home']);
              }
            });
          } else {
            this.router.navigate(['/home']);
          }
        },
        error: (error: Error) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Error al iniciar sesión';
          this.showError = true;
        }
      });
  }
  
  loginWithGoogle(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.showError = false;

    this.authService.loginWithGoogle()
      .then(() => {
        this.router.navigate(['/home']);
      })
      .catch((error: Error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al iniciar sesión con Google';
        this.showError = true;
      });
  }

  forgotPassword(): void {
    const email = this.loginForm.get('email')?.value;
    if (email) {
      this.router.navigate(['/forgot-password'], { queryParams: { email } });
    } else {
      this.router.navigate(['/forgot-password']);
    }
  }
}