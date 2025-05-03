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
import { AuthService } from '../../../services/auth-service/auth.service';

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
  currentUid: string = '';
  
  // Paginación
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  pageSizeOptions = [5, 10, 25, 50];
  
  // Filtros aplicados actualmente
  currentFilters?: FilterState;

  constructor(
    private router: Router,
    private searchSpaceService: SearchSpaceService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
  }

  /**
   * Obtiene el usuario actual para extraer el UID necesario
   * para filtrar los espacios del proveedor
   */
  getCurrentUser(): void {
    const userData = this.authService.getCurrentUserSync();
    if (userData && userData.uid) {
      this.currentUid = userData.uid;
      this.loadProviderSpaces(); // Llamada sin filtros inicialmente
    } else {
      // Si no hay usuario o UID, subscribirse al observable
      this.authService.getCurrentUser().subscribe({
        next: (user) => {
          if (user && user.uid) {
            this.currentUid = user.uid;
            this.loadProviderSpaces(); // Llamada sin filtros inicialmente
          } else {
            console.error('No se pudo obtener el UID del usuario');
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('Error al obtener usuario:', error);
          this.isLoading = false;
        }
      });
    }
  }

  /**
   * Carga los espacios del proveedor utilizando el nuevo endpoint
   */
  loadProviderSpaces(filters?: FilterState, page: number = 0, size: number = this.pageSize): void {
    this.isLoading = true;
    this.currentFilters = filters;
    
    if (!this.currentUid) {
      console.error('No hay UID de usuario para buscar espacios');
      this.isLoading = false;
      return;
    }
    
    console.log('Cargando espacios del proveedor con filtros:', filters);
    
    this.searchSpaceService.getProviderSpaces(this.currentUid, filters, page, size).subscribe({
      next: (response: PagedResponse<SearchSpace>) => {
        this.spaces = response.content;
        this.totalItems = response.totalElements;
        this.currentPage = response.pageable.pageNumber;
        this.pageSize = response.pageable.pageSize;
        this.isLoading = false;
        
        console.log(`Se cargaron ${this.spaces.length} espacios de ${this.totalItems} totales`);
      },
      error: (error) => {
        console.error('Error al cargar espacios del proveedor:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * @deprecated Use loadProviderSpaces instead
   */
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
    // Aplicar los filtros y volver a la primera página
    this.loadProviderSpaces(filters, 0, this.pageSize);
  }

  handlePageEvent(event: PageEvent): void {
    // Mantener los filtros actuales al cambiar de página
    this.loadProviderSpaces(this.currentFilters, event.pageIndex, event.pageSize);
  }

  navigateToCreate(): void {
    this.router.navigate(['/home/spaces/create']);
  }

  navigateToView(id: string): void {
    this.router.navigate([`/home/spaces/${id}`]);
  }

  navigateToEdit(id: string): void {
    this.router.navigate([`/home/spaces/${id}/edit`]);
  }
} 