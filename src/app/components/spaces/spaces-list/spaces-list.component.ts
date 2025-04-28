import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SearchSpace, FilterState } from '../../../models/search-space.model';
import { SearchSpaceService, PagedResponse } from '../../../services/search-space/search-space.service';
import { SpaceFilterComponent } from '../../search-spaces/space-filter/space-filter.component';

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
    MatPaginatorModule,
    MatProgressSpinnerModule,
    SpaceFilterComponent
  ],
  templateUrl: './spaces-list.component.html',
  styleUrls: ['./spaces-list.component.css']
})
export class SpacesListComponent implements OnInit {
  spaces: SearchSpace[] = [];
  isLoading = true;
  
  // Paginación
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  pageSizeOptions = [5, 10, 25, 50];
  
  // Filtros aplicados actualmente
  currentFilters?: FilterState;

  constructor(
    private router: Router,
    private searchSpaceService: SearchSpaceService
  ) {}

  ngOnInit(): void {
    this.loadSpaces();
  }

  loadSpaces(filters?: FilterState, page: number = 0, size: number = this.pageSize): void {
    this.isLoading = true;
    this.currentFilters = filters;
    
    this.searchSpaceService.getSpaces(filters, page, size).subscribe({
      next: (response: PagedResponse<SearchSpace>) => {
        this.spaces = response.content;
        this.totalItems = response.totalElements;
        this.currentPage = response.pageable.pageNumber;
        this.pageSize = response.pageable.pageSize;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading spaces:', error);
        this.isLoading = false;
      }
    });
  }

  handleFiltersChanged(filters: FilterState): void {
    console.log('Filtros recibidos en el componente principal:', filters);
    // Al cambiar filtros, volvemos a la primera página
    this.loadSpaces(filters, 0, this.pageSize);
  }

  handlePageEvent(event: PageEvent): void {
    this.loadSpaces(this.currentFilters, event.pageIndex, event.pageSize);
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
} 