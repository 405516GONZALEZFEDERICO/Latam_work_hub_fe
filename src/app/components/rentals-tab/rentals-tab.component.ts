import { Component, OnInit, OnDestroy } from '@angular/core';
import { RentalService, RentalContractResponse, InvoiceHistoryDto, InvoiceEntity, AutoRenewalDto, PaginatedResponse, IsAutoRenewalDto, InvoiceAmenityDto } from '../../services/rental/rental.service';
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
  detailsLoading = false;
  activeTab = 0;
  renewalMonths = 12;
  autoRenewal = {
    enabled: false,
    months: 12
  };

  // Individual loading states for buttons
  cancellingContract = false;
  renewingContract = false;
  savingAutoRenewal = false;
  payingInvoice = false;

  // Filter options
  statusFilter = new FormControl('');
  availableStatuses = [
    { value: '', display: 'Todos' },
    { value: 'DRAFT', display: 'Borradores' },
    { value: 'PENDING', display: 'Pendientes' },
    { value: 'CONFIRMED', display: 'Confirmados' },
    { value: 'ACTIVE', display: 'Activos' },
    { value: 'TERMINATED', display: 'Terminados' },
    { value: 'EXPIRED', display: 'Expirados' },
    { value: 'CANCELLED', display: 'Cancelados' },
    { value: 'RENEWAL', display: 'En Renovación' }
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
        // Usuario obtenido
        if (!user) {
          this.loading = false;
          console.error('RentalsTabComponent: Usuario no encontrado');
          this.snackBar.open('Usuario no encontrado', 'Cerrar', { duration: 3000 });
          return;
        }

        this.rentalService.getUserContracts(user.uid, page, size, status).subscribe({
          next: (response) => {
            console.log('RentalsTabComponent: Alquileres cargados', response);
            
            // El backend ya ordena por ID descendente con el parámetro sort=id,desc
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
    this.detailsLoading = true;
    this.loadInvoices(rental.id);
    this.loadPendingInvoices(rental.id);
    this.loadCancellationPolicy(rental.id);
    this.loadAutoRenewalConfig(rental.id);
  }

  loadInvoices(contractId: number): void {
    this.rentalService.getContractInvoices(contractId).subscribe({
      next: (invoices) => {
        console.log('Historial de facturas recibido:', invoices);
        this.invoices = this.processDates(invoices);
        console.log('Historial de facturas procesado:', this.invoices);
        this.checkDetailsLoadingComplete();
      },
      error: (error) => {
        this.snackBar.open('Error al cargar las facturas', 'Cerrar', {
          duration: 3000
        });
        this.checkDetailsLoadingComplete();
      }
    });
  }

  loadPendingInvoices(contractId: number): void {
    this.rentalService.getPendingInvoices(contractId).subscribe({
      next: (invoices) => {
        console.log('Facturas pendientes recibidas:', invoices);
        this.pendingInvoices = this.processDates(invoices);
        console.log('Facturas pendientes procesadas:', this.pendingInvoices);
        this.checkDetailsLoadingComplete();
      },
      error: (error) => {
        this.snackBar.open('Error al cargar las facturas pendientes', 'Cerrar', {
          duration: 3000
        });
        this.checkDetailsLoadingComplete();
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
        this.checkDetailsLoadingComplete();
      },
      error: (error) => {
        console.error('Error al cargar política de cancelación:', error);
        this.snackBar.open('Error al cargar la política de cancelación', 'Cerrar', {
          duration: 3000
        });
        this.checkDetailsLoadingComplete();
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
        this.checkDetailsLoadingComplete();
      },
      error: (error) => {
        console.error('Error al cargar configuración de renovación automática:', error);
        // En caso de error, mantenemos los valores predeterminados
        this.snackBar.open('Error al cargar la configuración de renovación automática', 'Cerrar', {
          duration: 3000
        });
        this.checkDetailsLoadingComplete();
      }
    });
  }

  private checkDetailsLoadingComplete(): void {
    // Verificar si todas las cargas de detalles han terminado
    // Esto es una simplificación - en un caso real podrías usar un contador o Promise.all
    setTimeout(() => {
      this.detailsLoading = false;
    }, 500);
  }

  // Método para calcular el monto de reembolso
  getRefundAmount(rental: RentalContractResponse): number {
    if (!rental) return 0;
    
    // Si el contrato está pendiente de pago, el monto de reembolso es 0
    if (this.isPendingStatus(rental.status)) {
      return 0;
    }
    
    // Para otros estados, calcular el reembolso según la política
    // Por ahora, retornamos 0 como valor por defecto
    // Aquí puedes implementar la lógica de cálculo según tu política de cancelación
    return 0;
  }

  cancelRental(rental: RentalContractResponse): void {
    if (!this.isContractActionable(rental) || this.cancellingContract) return;
    
    const refundAmount = this.getRefundAmount(rental);
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cancelar Alquiler',
        message: `¿Estás seguro que deseas cancelar este alquiler? 
                  ${refundAmount > 0 ? `Se procesará un reembolso de $${refundAmount}.` : 'No se procesará ningún reembolso.'} 
                  Esta acción no se puede deshacer.`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cancellingContract = true;
        
        // Mostrar mensaje inicial con delay
        this.snackBar.open('Preparando cancelación...', '', {
          duration: 1500,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
        
        // Delay de 1500ms antes de procesar la cancelación
        setTimeout(() => {
          this.processRentalCancellation(rental);
        }, 1500);
      }
    });
  }

  private processRentalCancellation(rental: RentalContractResponse): void {
    this.snackBar.open('Cancelando alquiler...', '', {
      duration: 1500,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });

    this.rentalService.cancelContract(rental.id).subscribe({
      next: (response) => {
        this.cancellingContract = false;
        this.snackBar.open('Alquiler cancelado con éxito', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
        this.loadRentals(this.currentPage, this.pageSize);
        this.deselectRental();
      },
      error: (error) => {
        this.cancellingContract = false;
        console.error('Error al cancelar el alquiler:', error);
        this.snackBar.open('Error al cancelar el alquiler. Por favor, inténtalo de nuevo.', 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  // Condicional para verificar si un estado es activo
  isActiveStatus(status: string): boolean {
    return status === 'ACTIVE';
  }

  // Condicional para verificar si un estado es pendiente
  isPendingStatus(status: string): boolean {
    return status === 'PENDING';
  }
  
  // Condicional para verificar si un estado es confirmado
  isConfirmedStatus(status: string): boolean {
    return status === 'CONFIRMED';
  }
  
  // Método para verificar si un contrato está cancelado
  isCancelledStatus(status: string): boolean {
    return status === 'CANCELLED';
  }

  // Método para verificar si un contrato está terminado
  isTerminatedStatus(status: string): boolean {
    return status === 'TERMINATED';
  }

  // Método para verificar si un contrato está expirado
  isExpiredStatus(status: string): boolean {
    return status === 'EXPIRED';
  }

  // Método para verificar si un contrato está en renovación
  isRenewalStatus(status: string): boolean {
    return status === 'RENEWAL';
  }

  // Método para verificar si un contrato está en borrador
  isDraftStatus(status: string): boolean {
    return status === 'DRAFT';
  }

  // Método para verificar si un contrato está disponible para acciones (no cancelado, no expirado, sin facturas pendientes)
  isContractActionable(rental: RentalContractResponse): boolean {
    if (!rental) {
      return false;
    }
    
    // Verificar estado del contrato
    const hasValidStatus = this.isActiveStatus(rental.status) || this.isPendingStatus(rental.status);
    
    // Verificar si tiene facturas pendientes de pago
    const hasNoPendingInvoices = !this.hasInvoicePending(rental);
    
    // Solo permitir acciones si tiene estado válido Y no tiene facturas pendientes
    const isActionable = hasValidStatus && hasNoPendingInvoices;
    
    return isActionable;
  }

  // Método para obtener mensaje explicativo sobre por qué no se puede realizar una acción
  getStatusActionMessage(status: string, rental?: RentalContractResponse): string {
    // Si se pasa el rental, verificar primero facturas pendientes
    if (rental && this.hasInvoicePending(rental)) {
      return 'Debe pagar las facturas pendientes antes de realizar esta acción';
    }
    
    const statusMessages: { [key: string]: string } = {
      'DRAFT': 'El contrato está en borrador',
      'CANCELLED': 'El contrato está cancelado',
      'EXPIRED': 'El contrato ha expirado',
      'CONFIRMED': 'El contrato está confirmado pero aún no activo',
      'TERMINATED': 'El contrato ha sido terminado',
      'RENEWAL': 'El contrato está en proceso de renovación',
      'PAID': 'El contrato está pagado pero aún no activo'
    };
    
    return statusMessages[status] || `El estado actual (${this.translateContractStatus(status)}) no permite esta acción`;
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
    if (!this.hasInvoicePending(rental) || this.payingInvoice) return;
    
    // Si ya tenemos las facturas pendientes, usamos la primera directamente
    if (this.pendingInvoices && this.pendingInvoices.length > 0) {
      const pendingInvoice = this.pendingInvoices[0];
      this.payInvoice(pendingInvoice);
      return;
    }
    
    // Si no tenemos las facturas pendientes cargadas, las obtenemos primero
    this.payingInvoice = true;
    this.rentalService.getPendingInvoices(rental.id).subscribe({
      next: (invoices) => {
        this.pendingInvoices = invoices;
        this.payingInvoice = false;
        
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
        this.payingInvoice = false;
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
    if (this.payingInvoice) return;

    if (!this.selectedRental) {
      this.handlePaymentError('Error: No se puede procesar el pago sin contrato seleccionado');
      return;
    }

    console.log('=== ANÁLISIS DE FACTURA PARA PAGO ===');
    console.log(`Factura ID: ${invoice.id} | Contrato ID: ${this.selectedRental.id}`);
    
    const monthlyAmount = this.selectedRental.monthlyAmount;
    const depositAmount = this.selectedRental.depositAmount;
    const amenitiesTotal = this.getInvoiceAmenitiesTotal(invoice);
    
    const totalCalculadoCorrecto = monthlyAmount + depositAmount + amenitiesTotal;
    const totalEnFacturaBackend = invoice.totalAmount;

    console.log('--- Desglose de Montos ---');
    console.log(` > Monto Mensual (Contrato): $${monthlyAmount}`);
    console.log(` > Depósito (Contrato): $${depositAmount}`);
    console.log(` > Servicios Extras (Factura): $${amenitiesTotal}`);
    console.log('-----------------------------');
    console.log(`✅ TOTAL CORRECTO (FE): $${totalCalculadoCorrecto}`);
    console.log(`   Total en Factura (BE): $${totalEnFacturaBackend}`);
    
    if (totalCalculadoCorrecto !== totalEnFacturaBackend) {
      console.error('🔴 INCONSISTENCIA: Total de factura del backend no coincide con el cálculo del FE.');
      console.error(`   Diferencia: $${totalEnFacturaBackend - totalCalculadoCorrecto}`);
      console.warn('💡 ACCIÓN REQUERIDA (Backend): Revisar lógica de creación de facturas. Debe sumar: mensualidad + depósito + servicios extras.');
    } else {
      console.log('✅ El total de la factura del backend es consistente.');
    }
    console.log('===================================');

    if (invoice.paymentUrl && invoice.paymentUrl.trim() !== '') {
      console.log('Usando URL de pago existente:', invoice.paymentUrl);
      this.openPaymentInNewWindow(invoice.paymentUrl);
      return;
    }
    
    console.log('Generando nueva URL de pago...');
    
    this.payingInvoice = true;
    this.rentalService.generateInvoicePaymentLink(this.selectedRental.id, invoice).subscribe({
      next: (paymentUrl) => {
        if (paymentUrl) {
          console.log('URL de pago generada exitosamente.');
          this.openPaymentInNewWindow(paymentUrl);
        } else {
          this.handlePaymentError('No se pudo generar el enlace de pago');
        }
      },
      error: (error) => {
        console.error('Error al generar enlace de pago:', error);
        this.handlePaymentError('Error al procesar el pago. Inténtalo de nuevo.');
      },
      complete: () => {
        this.payingInvoice = false;
        console.log('Proceso de pago finalizado.');
      }
    });
  }

  renewRental(): void {
    if (!this.selectedRental || this.renewingContract) {
      this.snackBar.open('No hay ningún alquiler seleccionado', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    if (!this.isContractActionable(this.selectedRental)) {
      const statusMessage = this.getStatusActionMessage(this.selectedRental.status, this.selectedRental);
      this.snackBar.open(`No se puede renovar: ${statusMessage}`, 'Cerrar', {
        duration: 4000
      });
      return;
    }
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Renovar Alquiler',
        message: `¿Estás seguro que deseas renovar este alquiler por ${this.renewalMonths} meses?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.renewingContract = true;
        this.snackBar.open('Procesando renovación...', '', {
          duration: 2000
        });
        
        this.rentalService.renewContract(this.selectedRental!.id, this.renewalMonths).subscribe({
          next: (paymentUrl) => {
            this.renewingContract = false;
            if (paymentUrl && paymentUrl.trim() !== '') {
              this.snackBar.open('Renovación procesada exitosamente. Redirigiendo al pago...', 'Cerrar', {
                duration: 4000
              });
              this.openPaymentInNewWindow(paymentUrl);
              this.loadRentals(this.currentPage, this.pageSize);
            } else {
              this.snackBar.open('Alquiler renovado exitosamente', 'Cerrar', {
                duration: 3000
              });
              this.loadRentals(this.currentPage, this.pageSize);
            }
          },
          error: (error) => {
            this.renewingContract = false;
            console.error('Error al renovar el alquiler:', error);
            this.snackBar.open('Error al renovar el alquiler. Por favor, inténtalo de nuevo.', 'Cerrar', {
              duration: 4000
            });
          }
        });
      }
    });
  }

  saveAutoRenewal(): void {
    if (!this.selectedRental || this.savingAutoRenewal) {
      this.snackBar.open('No hay ningún alquiler seleccionado', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    if (!this.isContractActionable(this.selectedRental)) {
      const statusMessage = this.getStatusActionMessage(this.selectedRental.status, this.selectedRental);
      this.snackBar.open(`No se puede configurar renovación automática: ${statusMessage}`, 'Cerrar', {
        duration: 4000
      });
      return;
    }
    
    this.savingAutoRenewal = true;
    this.snackBar.open('Guardando configuración...', '', {
      duration: 2000
    });
    
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
    this.savingAutoRenewal = false;
    const message = this.autoRenewal.enabled 
      ? `Renovación automática activada por ${this.autoRenewal.months} meses`
      : 'Renovación automática desactivada';
    
    this.snackBar.open(`✓ ${message}`, 'Cerrar', {
      duration: 4000,
      panelClass: ['success-snackbar']
    });
    
    // Recargar la configuración desde el backend para asegurar consistencia
    this.loadAutoRenewalConfig(this.selectedRental!.id);
    
    // Actualizar también el listado de alquileres para mantener la información sincronizada
    this.loadRentals(this.currentPage, this.pageSize);
  }
  
  private handleAutoRenewalError(error: any): void {
    this.savingAutoRenewal = false;
    console.error('Error al guardar configuración de renovación automática:', error);
    
    let errorMessage = 'Error al guardar la configuración de renovación automática';
    
    // Intentar extraer un mensaje más específico del error
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    this.snackBar.open(`✗ ${errorMessage}`, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  getStatusColor(status: string): string {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'var(--color-success)';
      case 'PENDING':
        return 'orange';
      case 'CANCELLED':
        return 'var(--color-error)';
      case 'EXPIRED':
        return 'gray';
      case 'TERMINATED':
        return 'var(--color-error)';
      case 'PAID':
        return 'var(--color-success)';
      case 'CONFIRMED':
        return '#4caf50';
      case 'DRAFT':
        return '#9e9e9e';
      case 'RENEWAL':
        return '#ff9800';
      default:
        return '#2196f3';
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
      'DRAFT': 'Borrador',
      'PENDING': 'Pendiente',
      'CONFIRMED': 'Confirmado',
      'ACTIVE': 'Activo',
      'TERMINATED': 'Terminado',
      'EXPIRED': 'Expirado',
      'CANCELLED': 'Cancelado',
      'RENEWAL': 'En Renovación',
      'PAID': 'Pagado'
    };
    
    return translations[status] || status;
  }

  // Método específico para traducir estados de facturas
  translateInvoiceStatus(status: string): string {
    const translations: { [key: string]: string } = {
      'DRAFT': 'Borrador',
      'ISSUED': 'Emitida',
      'PAID': 'Pagada',
      'CANCELLED': 'Cancelada',
      'PENDING': 'Pendiente',
      'OVERDUE': 'Vencida'
    };
    
    return translations[status] || status;
  }

  // Método para traducir tipos de facturas
  translateInvoiceType(type: string): string {
    const translations: { [key: string]: string } = {
      'CONTRACT': 'Contrato',
      'RENTAL': 'Alquiler',
      'DEPOSIT': 'Depósito',
      'MONTHLY': 'Mensual',
      'INITIAL': 'Inicial',
      'RENEWAL': 'Renovación',
      'CANCELLATION': 'Cancelación',
      'REFUND': 'Reembolso',
      'PENALTY': 'Penalización',
      'AMENITY': 'Servicio Extra'
    };
    
    return translations[type] || type;
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

  // Método para mostrar información cuando se intenta hacer una acción no permitida
  showActionNotAllowedInfo(): void {
    if (!this.selectedRental) return;
    
    const statusMessage = this.getStatusActionMessage(this.selectedRental.status, this.selectedRental);
    this.snackBar.open(`ℹ️ ${statusMessage}`, 'Entendido', {
      duration: 5000,
      panelClass: ['warning-snackbar']
    });
  }

  // Método para deseleccionar el alquiler (usado por el botón Volver)
  deselectRental(): void {
    this.selectedRental = null;
  }

  // Método para calcular el total de amenidades de una factura
  getInvoiceAmenitiesTotal(invoice: InvoiceHistoryDto | InvoiceEntity): number {
    if (!invoice.amenities || invoice.amenities.length === 0) {
      return 0;
    }
    return invoice.amenities.reduce((total, amenity) => total + amenity.price, 0);
  }

  // Método para verificar si una factura tiene amenidades
  hasAmenities(invoice: InvoiceHistoryDto | InvoiceEntity): boolean {
    return !!(invoice.amenities && invoice.amenities.length > 0);
  }

  // Método para manejar errores de pago
  private handlePaymentError(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
} 
