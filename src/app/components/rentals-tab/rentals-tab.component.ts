import { Component, OnInit, OnDestroy } from '@angular/core';
import { RentalService, RentalContractResponse, InvoiceHistoryDto, InvoiceEntity, AutoRenewalDto, PaginatedResponse, IsAutoRenewalDto } from '../../services/rental/rental.service';
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
  selector: 'app-rentals-tab',
  templateUrl: './rentals-tab.component.html',
  styleUrls: ['./rentals-tab.component.css'],
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
export class RentalsTabComponent implements OnInit, OnDestroy {
  // Main data properties
  rentals: RentalContractResponse[] = [];
  selectedRental: RentalContractResponse | null = null;
  invoices: InvoiceHistoryDto[] = [];
  pendingInvoices: InvoiceEntity[] = [];
  cancellationPolicy: any = null;
  
  // Pagination properties
  totalRentals: number = 0;
  pageSize: number = 5;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  currentPage: number = 0;
  
  // UI state properties
  loading = false;
  activeTab = 0;
  renewalMonths = 12;
  autoRenewal = {
    enabled: false,
    months: 12
  };

  // Filter options
  statusFilter = new FormControl('');
  availableStatuses = [
    { value: '', display: 'Todos' },
    { value: 'ACTIVE', display: 'Activos' },
    { value: 'PENDING', display: 'Pendientes' },
    { value: 'EXPIRED', display: 'Expirados' },
    { value: 'CANCELLED', display: 'Cancelados' }
  ];

  // Propiedad para detectar pantalla móvil
  isMobile$: Observable<boolean>;
  
  // Subject para cancelar suscripciones
  private destroy$ = new Subject<void>();

  constructor(
    private rentalService: RentalService,
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
    console.log('RentalsTabComponent: Inicializando componente');
    this.loadRentals();
    
    // Subscribe to status filter changes
    this.statusFilter.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.currentPage = 0; // Reset to first page on filter change
      this.loadRentals();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRentals(page: number = 0, size: number = this.pageSize): void {
    this.loading = true;
    const status = this.statusFilter.value || undefined;
    console.log(`RentalsTabComponent: Intentando cargar alquileres. Página: ${page}, Tamaño: ${size}, Estado: ${status}`);
    
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        console.log('RentalsTabComponent: Usuario obtenido', user);
        if (!user) {
          this.loading = false;
          console.error('RentalsTabComponent: Usuario no encontrado');
          this.snackBar.open('Usuario no encontrado', 'Cerrar', { duration: 3000 });
          return;
        }

        this.rentalService.getUserContracts(user.uid, page, size, status).subscribe({
          next: (response) => {
            console.log('RentalsTabComponent: Alquileres cargados', response);
            this.rentals = response.content;
            this.totalRentals = response.totalElements;
            this.currentPage = response.number;
            this.loading = false;
          },
          error: (error) => {
            console.error('RentalsTabComponent: Error al cargar alquileres', error);
            this.loading = false;
            this.snackBar.open('Error al cargar los alquileres', 'Cerrar', {
              duration: 3000
            });
          }
        });
      },
      error: (error) => {
        console.error('RentalsTabComponent: Error al obtener usuario', error);
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
    this.loadRentals(this.currentPage, this.pageSize);
  }

  selectRental(rental: RentalContractResponse): void {
    this.selectedRental = rental;
    this.activeTab = 0;
    this.loadInvoices(rental.id);
    this.loadPendingInvoices(rental.id);
    this.loadCancellationPolicy(rental.id);
    this.loadAutoRenewalConfig(rental.id);
  }

  loadInvoices(contractId: number): void {
    this.loading = true;
    this.rentalService.getContractInvoices(contractId).subscribe({
      next: (invoices) => {
        console.log('Historial de facturas recibido:', invoices);
        this.invoices = this.processDates(invoices);
        console.log('Historial de facturas procesado:', this.invoices);
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open('Error al cargar las facturas', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  loadPendingInvoices(contractId: number): void {
    this.rentalService.getPendingInvoices(contractId).subscribe({
      next: (invoices) => {
        console.log('Facturas pendientes recibidas:', invoices);
        this.pendingInvoices = this.processDates(invoices);
        console.log('Facturas pendientes procesadas:', this.pendingInvoices);
      },
      error: (error) => {
        this.snackBar.open('Error al cargar las facturas pendientes', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  // Método para asegurar que las fechas sean objetos Date
  processDates(invoices: InvoiceEntity[] | InvoiceHistoryDto[]): any[] {
    return invoices.map(invoice => ({
      ...invoice,
      issueDate: this.ensureDate(invoice.issueDate),
      dueDate: this.ensureDate(invoice.dueDate),
      paidDate: this.ensureDate(invoice.paidDate)
    }));
  }

  // Método para convertir cualquier formato de fecha a un objeto Date
  ensureDate(dateValue: any): Date | null {
    if (!dateValue) return null;
    
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    try {
      // Intentar convertir a Date si es string (ISO o otro formato)
      return new Date(dateValue);
    } catch (error) {
      console.error('Error al convertir fecha:', dateValue, error);
      return null;
    }
  }

  loadCancellationPolicy(contractId: number): void {
    this.cancellationPolicy = null; // Resetear para mostrar loading state si es necesario
    this.rentalService.getCancellationPolicy(contractId).subscribe({
      next: (policy) => {
        console.log('Política de cancelación cargada:', policy);
        this.cancellationPolicy = policy;
      },
      error: (error) => {
        console.error('Error al cargar política de cancelación:', error);
        this.snackBar.open('Error al cargar la política de cancelación', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  loadAutoRenewalConfig(contractId: number): void {
    // Valores predeterminados antes de la carga
    this.autoRenewal = {
      enabled: false,
      months: 12
    };
    
    this.rentalService.isAutoRenewal(contractId).subscribe({
      next: (autoRenewalDto) => {
        console.log('Configuración de renovación automática cargada:', autoRenewalDto);
        this.autoRenewal.enabled = autoRenewalDto.isAutoRenewal;
        
        if (autoRenewalDto.renewalMonths) {
          this.autoRenewal.months = autoRenewalDto.renewalMonths;
        } else if (autoRenewalDto.isAutoRenewal) {
          // Si tiene renovación automática pero no tiene meses configurados, usar valor por defecto
          this.autoRenewal.months = 12;
        }
        
        // Actualizar la información en el objeto selectedRental para el resumen
        if (this.selectedRental) {
          this.selectedRental.autoRenew = autoRenewalDto.isAutoRenewal;
          this.selectedRental.renewalMonths = autoRenewalDto.renewalMonths;
        }
      },
      error: (error) => {
        console.error('Error al cargar configuración de renovación automática:', error);
        // En caso de error, mantenemos los valores predeterminados
        this.snackBar.open('Error al cargar la configuración de renovación automática', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  cancelRental(rental: RentalContractResponse): void {
    if (!this.isContractActionable(rental)) return;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cancelar Alquiler',
        message: '¿Estás seguro que deseas cancelar este alquiler? Esta acción no se puede deshacer.'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        this.rentalService.cancelContract(rental.id).subscribe({
          next: () => {
            this.loading = false;
            this.snackBar.open('Alquiler cancelado exitosamente', 'Cerrar', {
              duration: 3000
            });
            this.loadRentals();
            this.selectedRental = null;
          },
          error: (error) => {
            this.loading = false;
            this.snackBar.open('Error al cancelar el alquiler', 'Cerrar', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  // Condicional para verificar si un estado es activo, independientemente del idioma
  isActiveStatus(status: string): boolean {
    const isActive = status === 'ACTIVE' || status === 'ACTIVO';
    console.log(`isActiveStatus: ${status} -> ${isActive}`);
    return isActive;
  }

  // Condicional para verificar si un estado es pendiente, independientemente del idioma
  isPendingStatus(status: string): boolean {
    return status === 'PENDING' || status === 'PENDIENTE';
  }
  isConfirmedStatus(status: string): boolean {
    return status === 'CONFIRMED' || status === 'CONFIRMADO';
  }
  // Método para verificar si un contrato está cancelado
  isCancelledStatus(status: string): boolean {
    return status === 'CANCELLED' || status === 'CANCELADO';
  }

  // Método para verificar si un contrato está disponible para acciones (no cancelado, no expirado)
  isContractActionable(rental: RentalContractResponse): boolean {
    if (!rental) {
      console.log('isContractActionable: rental is null or undefined');
      return false;
    }
    const isActionable = this.isActiveStatus(rental.status);
    console.log(`isContractActionable: ${rental.id} -> ${isActionable} (status: ${rental.status})`);
    return isActionable;
  }

  // Método para abrir URLs de pago en una nueva ventana
  openPaymentInNewWindow(url: string): void {
    if (url && url.trim() !== '') {
      // Abre la URL en una nueva ventana/pestaña
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      this.snackBar.open('No se pudo obtener el enlace de pago', 'Cerrar', {
        duration: 3000
      });
    }
  }

  // Método para pagar la factura actual pendiente
  payCurrentInvoice(rental: RentalContractResponse): void {
    if (!this.hasInvoicePending(rental)) return;
    
    // Si ya tenemos las facturas pendientes, usamos la primera directamente
    if (this.pendingInvoices && this.pendingInvoices.length > 0) {
      const pendingInvoice = this.pendingInvoices[0];
      this.payInvoice(pendingInvoice);
      return;
    }
    
    // Si no tenemos las facturas pendientes cargadas, las obtenemos primero
    this.loading = true;
    this.rentalService.getPendingInvoices(rental.id).subscribe({
      next: (invoices) => {
        this.pendingInvoices = invoices;
        this.loading = false;
        
        if (invoices && invoices.length > 0) {
          this.payInvoice(invoices[0]);
        } else {
          // Si no hay facturas pendientes pero el contrato dice que sí hay, actualizamos el estado
          this.snackBar.open('No se encontraron facturas pendientes para este contrato', 'Cerrar', {
            duration: 3000
          });
        }
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open('Error al obtener las facturas pendientes', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  // Método auxiliar para verificar si un contrato tiene factura pendiente
  hasInvoicePending(rental: RentalContractResponse): boolean {
    return rental.hasCurrentInvoicePending === true;
  }

  payInvoice(invoice: InvoiceHistoryDto | InvoiceEntity): void {
    // Si la factura ya tiene URL de pago, la usamos directamente
    if (invoice.paymentUrl && invoice.paymentUrl.trim() !== '') {
      this.openPaymentInNewWindow(invoice.paymentUrl);
      return;
    }
    
    // Si no tiene URL de pago, pero tiene ID, generamos el enlace de pago
    if (invoice.id) {
      this.loading = true;
      this.rentalService.generateInvoicePaymentLink(invoice.id).subscribe({
        next: (paymentUrl) => {
          this.loading = false;
          if (paymentUrl && paymentUrl.trim() !== '') {
            // Guardamos la URL de pago para futuras referencias
            invoice.paymentUrl = paymentUrl;
            this.openPaymentInNewWindow(paymentUrl);
          } else {
            this.snackBar.open('No se pudo obtener un enlace de pago válido', 'Cerrar', {
              duration: 3000
            });
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error al generar enlace de pago:', error);
          this.snackBar.open('Error al generar el enlace de pago', 'Cerrar', {
            duration: 3000
          });
        }
      });
    } else {
      this.snackBar.open('No se puede procesar esta factura', 'Cerrar', {
        duration: 3000
      });
    }
  }

  renewRental(): void {
    if (!this.selectedRental || !this.isContractActionable(this.selectedRental)) return;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Renovar Alquiler',
        message: `¿Estás seguro que deseas renovar este alquiler por ${this.renewalMonths} meses?`      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        this.rentalService.renewContract(this.selectedRental!.id, this.renewalMonths).subscribe({
          next: (paymentUrl) => {
            this.loading = false;
            if (paymentUrl && paymentUrl.trim() !== '') {
              this.openPaymentInNewWindow(paymentUrl);
              // Reload rentals after successful renewal
              this.loadRentals();
            } else {
              this.snackBar.open('Alquiler renovado exitosamente', 'Cerrar', {
                duration: 3000
              });
              this.loadRentals();
            }
          },
          error: (error) => {
            this.loading = false;
            this.snackBar.open('Error al renovar el alquiler', 'Cerrar', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  saveAutoRenewal(): void {
    if (!this.selectedRental || !this.isContractActionable(this.selectedRental)) return;
    
    this.loading = true;
    
    // Si la renovación automática está desactivada, simplemente actualizamos el estado
    if (!this.autoRenewal.enabled) {
      this.rentalService.updateIsAutoRenewal(
        this.selectedRental.id, 
        false
      ).subscribe({
        next: () => {
          this.finishAutoRenewalUpdate();
        },
        error: () => {
          // Ignoramos el error cuando se desactiva la renovación automática
          // para evitar mostrar mensajes de error al usuario
          this.finishAutoRenewalUpdate();
        }
      });
      return;
    }
    
    // Si la renovación está activada, seguimos con el flujo normal
    this.rentalService.updateIsAutoRenewal(
      this.selectedRental.id, 
      true
    ).subscribe({
      next: (result) => {
        if (result) {
          this.rentalService.setupAutoRenewal(
            this.selectedRental!.id,
            true,
            this.autoRenewal.months
          ).subscribe({
            next: () => {
              this.finishAutoRenewalUpdate();
            },
            error: (error) => {
              this.handleAutoRenewalError(error);
            }
          });
        } else {
          this.handleAutoRenewalError(new Error('No se pudo actualizar la renovación automática'));
        }
      },
      error: (error) => {
        this.handleAutoRenewalError(error);
      }
    });
  }
  
  private finishAutoRenewalUpdate(): void {
    this.loading = false;
    this.snackBar.open('Configuración de renovación automática guardada', 'Cerrar', {
      duration: 3000
    });
    
    // Recargar la configuración desde el backend para asegurar consistencia
    this.loadAutoRenewalConfig(this.selectedRental!.id);
    
    // Actualizar también el listado de alquileres para mantener la información sincronizada
    this.loadRentals(this.currentPage, this.pageSize);
  }
  
  private handleAutoRenewalError(error: any): void {
    this.loading = false;
    console.error('Error al guardar configuración de renovación automática:', error);
    this.snackBar.open('Error al guardar la configuración de renovación automática', 'Cerrar', {
      duration: 3000
    });
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
      case 'activo':
        return 'var(--color-success)';
      case 'pending':
      case 'pendiente':
        return 'orange';
      case 'cancelled':
      case 'cancelado':
        return 'var(--color-error)';
      case 'expired':
      case 'expirado':
        return 'gray';
      case 'paid':
      case 'pagado':
        return 'var(--color-success)';
      default:
        return 'var(--color-primary)';
    }
  }

  changeTab(tabIndex: number): void {
    console.log(`Cambiando a la pestaña ${tabIndex}`);
    this.activeTab = tabIndex;
    
    // Cargar configuración de renovación automática al cambiar a la pestaña de renovación
    if (tabIndex === 1 && this.selectedRental) { // Índice 1 es la pestaña de Renovación
      console.log('Pestaña de renovación seleccionada, cargando configuración actual');
      this.loadAutoRenewalConfig(this.selectedRental.id);
    }
    
    // Verificar si estamos en la pestaña de cancelación
    if (tabIndex === 2) { // Índice 2 es la pestaña de Cancelación
      console.log('Pestaña de cancelación seleccionada');
      console.log('selectedRental:', this.selectedRental);
      console.log('cancellationPolicy:', this.cancellationPolicy);
      console.log('isActionable:', this.isContractActionable(this.selectedRental!));
    }
  }
  
  getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  // Método para traducir los estados del contrato al español
  translateContractStatus(status: string): string {
    const translations: { [key: string]: string } = {
      'CONFIRMED': 'CONFIRMADO',
      'ACTIVE': 'ACTIVO',
      'PENDING': 'PENDIENTE',
      'EXPIRED': 'EXPIRADO',
      'CANCELLED': 'CANCELADO',
      'PAID': 'PAGADO'
    };
    
    return translations[status] || status;
  }

  // Método para formatear los nombres de propiedades en castellano
  formatPropertyName(key: string): string {
    const translations: { [key: string]: string } = {
      'depositAmount': 'Monto del Depósito',
      'daysRemaining': 'Días Restantes',
      'completionPercentage': 'Porcentaje Completado',
      'refundPercentage': 'Porcentaje de Reembolso',
      'contractStatus': 'Estado del Contrato',
      'contractStartDate': 'Fecha de Inicio del Contrato',
      'contractId': 'ID del Contrato',
      'contractEndDate': 'Fecha de Fin del Contrato',
      'noticePeriodDays': 'Días de Preaviso',
      'effectiveCancellationDate': 'Fecha Efectiva de Cancelación',
      'canCancel': 'Puede Cancelar',
      'refundAmount': 'Monto de Reembolso',
      'cancellationFee': 'Cargo por Cancelación',
      'noticePeriod': 'Período de Notificación',
      'refundPolicy': 'Política de Reembolso',
      'earlyTerminationFee': 'Cargo por Terminación Anticipada',
      'specialConditions': 'Condiciones Especiales',
      'cancellationRestrictionReason': 'Motivo de Restricción de Cancelación'
    };
    
    return translations[key] || key;
  }
  
  // Método para formatear valores de propiedades específicas
  formatPropertyValue(key: string, value: any): string {
    if (key === 'canCancel') {
      return value ? 'Sí' : 'No';
    }
    
    if (key === 'contractStatus') {
      return this.translateContractStatus(value);
    }
    
    if (key.includes('Date') && value) {
      return new Date(value).toLocaleDateString('es-ES');
    }
    
    if ((key.includes('Amount') || key.includes('Fee')) && !isNaN(Number(value))) {
      return `$${value}`;
    }
    
    if (key.includes('Percentage') && !isNaN(Number(value))) {
      return `${value * 100}%`;
    }
    
    return value !== null && value !== undefined ? value.toString() : '';
  }

  // Método para deseleccionar el alquiler (usado por el botón Volver)
  deselectRental(): void {
    this.selectedRental = null;
  }
} 
