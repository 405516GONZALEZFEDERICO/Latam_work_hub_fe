import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SearchSpace, FilterState } from '../../../models/search-space.model';
import { SearchSpaceService, PagedResponse } from '../../../services/search-space/search-space.service';
import { SpaceService } from '../../../services/space/space.service';
import { SpaceFilterComponent } from '../../search-spaces/space-filter/space-filter.component';
import { AuthService } from '../../../services/auth-service/auth.service';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';
import { catchError, tap, finalize } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

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
    MatTooltipModule,
    SpaceFilterComponent,
  ],
  templateUrl: './spaces-list.component.html',
  styleUrls: ['./spaces-list.component.css']
})
export class SpacesListComponent implements OnInit {
  spaces: SearchSpace[] = [];
  isLoading = true;
  isDeleting: { [key: string]: boolean } = {};
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
    private spaceService: SpaceService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadProviderSpaces();
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

  // Método para confirmar y eliminar un espacio
  confirmDeleteSpace(spaceId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Confirmar Eliminación',
        message: '¿Estás seguro de que quieres eliminar este espacio? Esta acción no se puede deshacer.',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // Obtener UID del usuario (asegurarse de que exista)
        const userUid = this.currentUid;
        if (!userUid) {
          this.snackBar.open('Error: No se pudo identificar al usuario.', 'Cerrar', { duration: 3000 });
          return;
        }
        
        this.isDeleting[spaceId] = true; // Mostrar indicador de carga específico
        
        this.spaceService.deleteSpace(spaceId, userUid).pipe(
          tap(() => {
            this.snackBar.open('Espacio eliminado correctamente.', 'Cerrar', { duration: 3000, panelClass: 'success-snackbar' });
            // Eliminar el espacio de la lista local para actualizar la UI
            this.spaces = this.spaces.filter(s => s.id !== spaceId);
            // Si la página actual queda vacía y no es la primera, ir a la anterior
            if (this.spaces.length === 0 && this.currentPage > 0) {
              this.loadProviderSpaces(this.currentFilters, this.currentPage - 1, this.pageSize);
            } else {
              // Recargar la página actual para ajustar el total
              this.loadProviderSpaces(this.currentFilters, this.currentPage, this.pageSize);
            }
          }),
          catchError(error => {
            console.error('Error al eliminar el espacio:', error);
            this.snackBar.open('Error al eliminar el espacio. Inténtalo de nuevo.', 'Cerrar', { duration: 3000, panelClass: 'error-snackbar' });
            return EMPTY; // Manejar el error y continuar
          }),
          finalize(() => {
            this.isDeleting[spaceId] = false; // Ocultar indicador de carga
          })
        ).subscribe();
      }
    });
  }
} 