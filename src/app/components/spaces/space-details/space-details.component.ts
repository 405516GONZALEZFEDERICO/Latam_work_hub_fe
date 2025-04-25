import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { Space } from '../../../models/space.model';
import { SpaceService } from '../../../services/space/space.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-space-details',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './space-details.component.html',
  styleUrls: ['./space-details.component.css']
})
export class SpaceDetailsComponent implements OnInit {
  space: Space | null = null;
  userRole: 'client' | 'provider' = 'provider';
  isLoading = true;
  activeTab = 0;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private spaceService: SpaceService
  ) {}

  ngOnInit(): void {
    // Obtener el ID del espacio desde la URL
    this.route.paramMap.subscribe(params => {
      const spaceId = params.get('id');
      if (spaceId) {
        this.loadSpace(spaceId);
      } else {
        // Si no hay ID, redirigir a la lista de espacios
        this.router.navigate(['/home/spaces']);
      }
    });
  }
  
  loadSpace(id: string): void {
    this.isLoading = true;
    this.spaceService.getSpaceById(id).subscribe({
      next: (space) => {
        this.space = space || null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar el espacio:', error);
        this.isLoading = false;
        // En caso de error, redirigir a la lista de espacios
        this.router.navigate(['/home/spaces']);
      }
    });
  }
  
  // Método para cambiar de pestaña
  changeTab(tabIndex: number): void {
    this.activeTab = tabIndex;
  }
  
  // Método para obtener la URL de la imagen principal o una imagen por defecto
  getMainImageUrl(): string {
    if (this.space && this.space.imageUrl) {
      return this.space.imageUrl;
    }
    return 'assets/images/default-space.jpg';
  }
  
  // Método para formatear el precio según la moneda local
  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-419', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(price);
  }

  // Método para regresar a la lista de espacios
  goBack(): void {
    this.router.navigate(['/home/spaces']);
  }
  
  // Método para ir a editar el espacio
  editSpace(): void {
    if (this.space) {
      this.router.navigate([`/home/spaces/${this.space.id}/edit`]);
    }
  }
}
