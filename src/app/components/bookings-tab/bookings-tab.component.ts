import { Component, OnInit, OnDestroy } from '@angular/core';
import { BookingService, BookingResponseDto, PageResponse } from '../../services/booking/booking.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../services/auth-service/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule, PageEvent, MatPaginatorIntl } from '@angular/material/paginator';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormControl } from '@angular/forms';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

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
  selector: 'app-bookings-tab',
  templateUrl: './bookings-tab.component.html',
  styleUrls: ['./bookings-tab.component.css'],
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatDividerModule,
    MatPaginatorModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: MatPaginatorIntlEsp }
  ],
  standalone: true
})
export class BookingsTabComponent implements OnInit, OnDestroy {
  // Main data properties
  bookings: BookingResponseDto[] = [];
  selectedBooking: BookingResponseDto | null = null;
  
  // Pagination properties
  totalBookings: number = 0;
  pageSize: number = 5;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  currentPage: number = 0;
  
  // UI state properties
  loading = false;
  activeTab = 0;

  // Filter options
  statusFilter = new FormControl('');
  availableStatuses = [
    { value: '', display: 'Todos' },
    { value: 'CONFIRMED', display: 'Confirmadas' },
    { value: 'PENDING_PAYMENT', display: 'Pendientes de Pago' },
    { value: 'ACTIVE', display: 'Activas' },
    { value: 'COMPLETED', display: 'Completadas' },
    { value: 'CANCELED', display: 'Canceladas' }
  ];

  // Propiedad para detectar pantalla móvil
  isMobile$: Observable<boolean>;
  
  // Subject para cancelar suscripciones
  private destroy$ = new Subject<void>();

  constructor(
    private bookingService: BookingService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private breakpointObserver: BreakpointObserver
  ) {
    // Observar cambios en el tamaño de la pantalla
    this.isMobile$ = this.breakpointObserver.observe([
      Breakpoints.XSmall,
      Breakpoints.Small
    ])
    .pipe(
      map(result => result.matches),
      takeUntil(this.destroy$)
    );
  }

  ngOnInit(): void {
    console.log('BookingsTabComponent: Inicializando componente');
    this.loadBookings();
    
    // Subscribe to status filter changes
    this.statusFilter.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.currentPage = 0; // Reset to first page on filter change
      this.loadBookings();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBookings(page: number = 0, size: number = this.pageSize): void {
    this.loading = true;
    const status = this.statusFilter.value || undefined;
    console.log(`BookingsTabComponent: Intentando cargar reservas. Página: ${page}, Tamaño: ${size}, Estado: ${status}`);
    
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        console.log('BookingsTabComponent: Usuario obtenido', user);
        if (!user) {
          this.loading = false;
          console.error('BookingsTabComponent: Usuario no encontrado');
          this.snackBar.open('Usuario no encontrado', 'Cerrar', { duration: 3000 });
          return;
        }

        this.bookingService.getUserBookings(user.uid, status, page, size).subscribe({
          next: (response) => {
            console.log('BookingsTabComponent: Reservas cargadas', response);
            this.bookings = response.content;
            this.totalBookings = response.totalElements;
            this.currentPage = response.number;
            this.loading = false;
          },
          error: (error) => {
            console.error('BookingsTabComponent: Error al cargar reservas', error);
            this.loading = false;
            this.snackBar.open('Error al cargar las reservas', 'Cerrar', {
              duration: 3000
            });
          }
        });
      },
      error: (error) => {
        console.error('BookingsTabComponent: Error al obtener usuario', error);
        this.loading = false;
        this.snackBar.open('Error al obtener información de usuario', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  // Event handler for pagination
  handlePageEvent(e: PageEvent): void {
    this.pageSize = e.pageSize;
    this.currentPage = e.pageIndex;
    this.loadBookings(this.currentPage, this.pageSize);
  }

  selectBooking(booking: BookingResponseDto): void {
    this.selectedBooking = booking;
    this.activeTab = 0;
  }

  cancelBooking(booking: BookingResponseDto): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Cancelar Reserva',
        message: '¿Estás seguro de que deseas cancelar esta reserva?',
        confirmText: 'Sí, Cancelar',
        cancelText: 'No'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        // Aquí iría la lógica para cancelar la reserva
        // Ejemplo: this.bookingService.cancelBooking(booking.id)...
        
        // Por ahora, solo mostramos un mensaje
        setTimeout(() => {
          this.loading = false;
          this.snackBar.open('Funcionalidad de cancelación no implementada', 'Cerrar', {
            duration: 3000
          });
        }, 1000);
      }
    });
  }

  isConfirmedStatus(status: string): boolean {
    return status === 'CONFIRMED';
  }

  isPendingStatus(status: string): boolean {
    return status === 'PENDING_PAYMENT';
  }
  
  isCancelledStatus(status: string): boolean {
    return status === 'CANCELED';
  }

  isActiveStatus(status: string): boolean {
    return status === 'ACTIVE';
  }

  isCompletedStatus(status: string): boolean {
    return status === 'COMPLETED';
  }

  isBookingActionable(booking: BookingResponseDto): boolean {
    return this.isConfirmedStatus(booking.status) || 
           this.isPendingStatus(booking.status) || 
           this.isActiveStatus(booking.status);
  }

  // Check if booking can be cancelled (one week before start date)
  canCancelBooking(booking: BookingResponseDto): boolean {
    if (!this.isBookingActionable(booking)) {
      return false;
    }
    
    const startDate = new Date(booking.startDate);
    const today = new Date();
    
    // Calculate difference in days
    const diffTime = startDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Can only cancel if more than 7 days before start date
    return diffDays >= 7;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'CONFIRMED':
        return '#4CAF50'; // Green
      case 'PENDING_PAYMENT':
        return '#FFC107'; // Yellow/Amber
      case 'CANCELED':
        return '#F44336'; // Red
      case 'COMPLETED':
        return '#2196F3'; // Blue
      case 'ACTIVE':
        return '#9C27B0'; // Purple
      default:
        return '#9E9E9E'; // Grey
    }
  }

  changeTab(tabIndex: number): void {
    this.activeTab = tabIndex;
  }

  getKeys(obj: BookingResponseDto | null): string[] {
    return obj ? Object.keys(obj as Record<string, any>) : [];
  }

  translateBookingStatus(status: string): string {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmada';
      case 'PENDING_PAYMENT':
        return 'Pendiente de Pago';
      case 'CANCELED':
        return 'Cancelada';
      case 'COMPLETED':
        return 'Completada';
      case 'ACTIVE':
        return 'Activa';
      default:
        return status || 'Desconocido';
    }
  }

  formatPropertyName(key: string): string {
    const nameMap: { [key: string]: string } = {
      'id': 'ID',
      'startDate': 'Fecha de Inicio',
      'endDate': 'Fecha de Fin',
      'initHour': 'Hora de Inicio',
      'endHour': 'Hora de Fin',
      'bookingType': 'Tipo de Reserva',
      'status': 'Estado',
      'counterPersons': 'Número de Personas',
      'totalAmount': 'Monto Total',
      'spaceId': 'ID del Espacio',
      'spaceName': 'Nombre del Espacio',
      'spaceAddress': 'Dirección',
      'spaceType': 'Tipo de Espacio',
      'cityName': 'Ciudad',
      'countryName': 'País'
    };

    return nameMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  formatPropertyValue(key: string, value: any): string {
    if (value === null || value === undefined) {
      return 'No disponible';
    }

    if (key === 'startDate' || key === 'endDate') {
      try {
        return new Date(value).toLocaleDateString('es-ES');
      } catch (e) {
        return 'Fecha inválida';
      }
    }
    
    if (key === 'initHour' || key === 'endHour') {
      // Asumiendo que la hora viene como string HH:MM:SS o similar
      return String(value).substring(0, 5);
    }

    if (key === 'totalAmount') {
      return `$${Number(value).toLocaleString('es-AR')}`;
    }

    if (key === 'status') {
      return this.translateBookingStatus(String(value));
    }

    if (key === 'bookingType') {
      const type = String(value).toUpperCase().replace(/\s+/g, '_');
      if (type === 'PER_HOUR') return 'Por hora';
      if (type === 'PER_DAY') return 'Por día';
      if (type === 'PER_MONTH') return 'Por mes';
      return String(value); // Si no coincide, mostrar el valor original
    }

    return String(value);
  }

  // Format location to remove redundant information
  formatLocation(address: string, city: string, country: string): string {
    let formattedAddress = address ? String(address) : '';
    const formattedCity = city ? String(city) : '';
    const formattedCountry = country ? String(country) : '';

    // Remover ciudad duplicada (case-insensitive)
    if (formattedCity && formattedAddress.toLowerCase().includes(formattedCity.toLowerCase())) {
      // Usamos una regex más específica para evitar remover partes de otras palabras
      const cityRegex = new RegExp(`\\b${formattedCity}\\b`, 'gi'); 
      formattedAddress = formattedAddress.replace(cityRegex, '');
    }

    // Remover país duplicado (case-insensitive)
    if (formattedCountry && formattedAddress.toLowerCase().includes(formattedCountry.toLowerCase())) {
       // Usamos una regex más específica para evitar remover partes de otras palabras
      const countryRegex = new RegExp(`\\b${formattedCountry}\\b`, 'gi');
      formattedAddress = formattedAddress.replace(countryRegex, '');
    }

    // Limpiar la cadena de dirección:
    // 1. Dividir por coma
    // 2. Quitar espacios extra de cada parte
    // 3. Filtrar partes vacías
    // 4. Unir con ", "
    const addressParts = formattedAddress.split(',')
                                  .map(part => part.trim())
                                  .filter(part => part !== '' && part !== null);
    const cleanedAddress = addressParts.join(', ');

    // Construir la cadena final asegurando que no haya partes vacías y evitando comas duplicadas al unir
    const finalParts = [cleanedAddress, formattedCity, formattedCountry].filter(part => part);
    return finalParts.join(', ');
  }

  // Método para deseleccionar la reserva (usado por el botón Volver)
  deselectBooking(): void {
    this.selectedBooking = null;
  }
} 