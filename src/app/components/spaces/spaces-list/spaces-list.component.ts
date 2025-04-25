import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Space } from '../../../models/space.model';
import { SpaceService } from '../../../services/space/space.service';

@Component({
  selector: 'app-spaces-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatBadgeModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './spaces-list.component.html',
  styleUrls: ['./spaces-list.component.css']
})
export class SpacesListComponent implements OnInit {
  spaces: Space[] = [];

  filterForm = new FormGroup({
    name: new FormControl(''),
    type: new FormControl(''),
    status: new FormControl('')
  });

  spaceTypes = ['All', 'COMPANY', 'INDIVIDUAL'];
  statusOptions = ['All', 'Disponible', 'No Disponible'];

  filteredSpaces: Space[] = [];

  constructor(
    private router: Router,
    private spaceService: SpaceService
  ) {}

  ngOnInit(): void {
    this.loadSpaces();

    // Subscribe to form value changes to apply filters
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  loadSpaces(): void {
    this.spaceService.getSpaces().subscribe(
      (spaces: Space[]) => {
        this.spaces = spaces;
        this.filteredSpaces = [...this.spaces];
      },
      (error) => {
        console.error('Error loading spaces:', error);
      }
    );
  }

  applyFilters(): void {
    console.log('Aplicando filtros...');
    const nameFilter = this.filterForm.get('name')?.value?.toLowerCase() || '';
    const typeFilter = this.filterForm.get('type')?.value || 'All';
    const statusFilter = this.filterForm.get('status')?.value || 'All';

    this.filteredSpaces = this.spaces.filter(space => {
      const matchesName = space.title.toLowerCase().includes(nameFilter);
      const matchesType = typeFilter === 'All' || space.providerType === typeFilter;
      const matchesStatus = statusFilter === 'All';
      
      return matchesName && matchesType && matchesStatus;
    });

    console.log('Filtros aplicados:', { nameFilter, typeFilter, statusFilter });
    console.log('Espacios filtrados:', this.filteredSpaces.length);
  }

  navigateToCreate(): void {
    console.log('Navegando a crear espacio');
    this.router.navigate(['/home/spaces/create']);
  }

  navigateToView(id: string): void {
    console.log('Navegando a ver espacio:', id);
    this.router.navigate([`/home/spaces/${id}`]);
  }

  navigateToEdit(id: string): void {
    console.log('Navegando a editar espacio:', id);
    this.router.navigate([`/home/spaces/${id}/edit`]);
  }

  navigateToSearchSpaces(): void {
    console.log('Navegando a búsqueda de espacios');
    this.router.navigate(['/home/search-spaces']);
  }
} 