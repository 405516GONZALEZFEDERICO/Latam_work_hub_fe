import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Space } from '../../../models/space';

@Component({
  selector: 'app-space-details',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './space-details.component.html',
  styleUrls: ['./space-details.component.css']
})
export class SpaceDetailsComponent implements OnInit {
  @Input() space: Space | null = null;
  @Input() userRole: 'client' | 'provider' = 'client';
  
  activeTab = 0;
  
  constructor() {}

  ngOnInit(): void {
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
}
