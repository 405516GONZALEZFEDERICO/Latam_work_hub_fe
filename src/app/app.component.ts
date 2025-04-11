import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>'
})
export class AppComponent implements OnInit {
  title = 'latam-work-hub';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Ejecutar handleRedirectResult después de que la aplicación se haya inicializado completamente
    setTimeout(async () => {
      console.log('Verificando redirección de Google...');
      try {
        const user = await this.authService.handleRedirectResult();
        if (user) {
          console.log('Usuario autenticado correctamente, redirigiendo...');
          await this.router.navigate(['/default-section']);
        }
      } catch (error) {
        console.error('Error en la autenticación:', error);
        await this.router.navigate(['/login']);
      }
    }, 100);
  }
}