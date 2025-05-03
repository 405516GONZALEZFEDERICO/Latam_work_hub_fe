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
  
    const spaceWithImages = {
      ...this.space,
      // Asegurar que photoUrl exista para el componente de detalles
      photoUrl: this.space.photoUrl || 
                (this.space.photos || []).map(photo => 
                  typeof photo === 'string' ? photo : photo.url
                ) || 
                (this.space.imageUrl ? [this.space.imageUrl] : [])
    };
    
    
    // Pasar el objeto space completo a través del router state
    const navigationExtras: NavigationExtras = {
      state: { space: spaceWithImages }
    };
    
    this.router.navigate(['/home/space-details', this.space.id], navigationExtras);

  }
} 