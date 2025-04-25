import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
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
    this.router.navigate([`/home/spaces/${this.space.id}`]);
  }
} 