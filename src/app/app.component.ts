import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ProfileCheckerService } from './services/profile/profile-checker.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(private profileCheckerService: ProfileCheckerService) {}

  ngOnInit(): void {
    // Inicializar el servicio de verificación de perfil
    this.profileCheckerService.initialize();
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones al destruir el componente
    this.profileCheckerService.destroy();
  }
}