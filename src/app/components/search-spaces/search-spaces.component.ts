import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpaceFilterComponent } from './space-filter/space-filter.component';
import { SpaceGridComponent } from './space-grid/space-grid.component';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent, MatPaginatorIntl } from '@angular/material/paginator';
import { SearchSpace, FilterState } from '../../models/search-space.model';
import { SearchSpaceService, PagedResponse } from '../../services/search-space/search-space.service';

// Clase para traducir los textos del paginador
export class MatPaginatorIntlEsp extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Elementos por página:';
  override nextPageLabel = 'Página siguiente';
  override previousPageLabel = 'Página anterior';
  override firstPageLabel = 'Primera página';
  override lastPageLabel = 'Última página';

  override getRangeLabel = (page: number, pageSize: number, length: number) => {
    if (length === 0) {
      return `0 de ${length}`;
    }
    
    length = Math.max(length, 0);
    const startIndex = page * pageSize;
    const endIndex = startIndex < length ? 
      Math.min(startIndex + pageSize, length) : 
      startIndex + pageSize;
    
    return `${startIndex + 1} - ${endIndex} de ${length}`;
  };
}

@Component({
  selector: 'app-search-spaces',
  standalone: true,
  imports: [
    CommonModule,
    SpaceFilterComponent,
    SpaceGridComponent,
    MatIconModule,
    MatProgressSpinnerModule,
    MatPaginatorModule
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: MatPaginatorIntlEsp }
  ],
  templateUrl: './search-spaces.component.html',
  styleUrls: ['./search-spaces.component.css']
})
export class SearchSpacesComponent implements OnInit {
  spaces: SearchSpace[] = [];
  isLoading = true;
  
  // Paginación
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  pageSizeOptions = [5, 10, 25, 50];
  
  // Filtros aplicados actualmente
  currentFilters?: FilterState;
  
  constructor(private spaceService: SearchSpaceService) { }

  ngOnInit(): void {
    this.loadSpaces();
  }
  
  loadSpaces(filters?: FilterState, page: number = 0, size: number = this.pageSize): void {
    this.isLoading = true;
    this.currentFilters = filters;
    
    this.spaceService.getSpaces(filters, page, size).subscribe({
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
    console.log('SearchSpacesComponent recibió filtros:', JSON.stringify(filters));
    console.log('Tipo de espacio recibido:', filters.spaceTypeId, 'tipo:', typeof filters.spaceTypeId);
    
    // Al cambiar filtros, volvemos a la primera página
    this.loadSpaces(filters, 0, this.pageSize);
  }

  handlePageEvent(event: PageEvent): void {
    this.loadSpaces(this.currentFilters, event.pageIndex, event.pageSize);
  }
} 