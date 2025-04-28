import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router, NavigationExtras } from '@angular/router';
import { SearchSpace } from '../../../models/search-space.model';

@Component({
  selector: 'app-space-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './space-card.component.html',
  styleUrls: ['./space-card.component.css']
})
export class SpaceCardComponent {
  @Input() space!: SearchSpace;

  constructor(private router: Router) {}

  viewDetails(): void {
    console.log('Navegando a detalles del espacio:', this.space.id);
    
    // Asegurarse de que photoUrl esté correctamente asignado para el detalle
    const spaceWithImages = {
      ...this.space,
      // Asegurar que photoUrl exista para el componente de detalles
      photoUrl: this.space.photoUrl || 
                (this.space.photos || []).map(photo => 
                  typeof photo === 'string' ? photo : photo.url
                ) || 
                (this.space.imageUrl ? [this.space.imageUrl] : [])
    };
    
    console.log('Datos enviados al detalle:', spaceWithImages);
    
    // Pasar el objeto space completo a través del router state
    const navigationExtras: NavigationExtras = {
      state: { space: spaceWithImages }
    };
    
    // Usando la nueva ruta específica para CLIENTES
    this.router.navigate(['/home/space-details', this.space.id], navigationExtras);
    
    // Si la anterior no funciona, intenta descomentar alguna de estas:
    // this.router.navigate([`/spaces/${this.space.id}`], navigationExtras);
    // this.router.navigate(['/space-details', this.space.id], navigationExtras);
  }
} 