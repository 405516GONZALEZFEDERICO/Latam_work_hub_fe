import { Component, OnInit, ViewChild, ChangeDetectorRef, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent, MatPaginatorIntl } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpParams } from '@angular/common/http';

import { ReportService, PageResponse } from '../../services/reports/report.service';
import { ExportService } from '../../services/export/export.service';
import { StatusTranslationService } from '../../services/translation/status-translation.service';

import {
  SpaceReportRow,
  BookingReportRow,
  UserReportRow,
  ContractReportRow,
  InvoiceReportRow,
  ExpiringContractAlert,
  OverdueInvoiceAlert,
  SpaceReportFilters,
  BookingReportFilters,
  UserReportFilters,
  ContractReportFilters,
  InvoiceReportFilters,
  ExpiringContractsAlertFilters,
  OverdueInvoicesAlertFilters
} from '../../models/reports';

@Injectable()
export class SpanishPaginatorIntl extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Elementos por página:';
  override nextPageLabel = 'Página siguiente';
  override previousPageLabel = 'Página anterior';
  override firstPageLabel = 'Primera página';
  override lastPageLabel = 'Última página';

  override getRangeLabel = (page: number, pageSize: number, length: number) => {
    if (length === 0 || pageSize === 0) {
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
  selector: 'app-admin-report-view',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: SpanishPaginatorIntl }
  ],
  templateUrl: './admin-report-view.component.html',
  styleUrls: ['./admin-report-view.component.css']
})
export class AdminReportViewComponent implements OnInit {
  // Filtros
  filterForm: FormGroup;

  // Reportes
  selectedReport: string = 'spaces';
  loading = false;
  error: string | null = null;

  // Datos de reportes
  spaceData: SpaceReportRow[] = [];
  bookingData: BookingReportRow[] = [];
  userData: UserReportRow[] = [];
  contractData: ContractReportRow[] = [];
  invoiceData: InvoiceReportRow[] = [];
  expiringContractData: ExpiringContractAlert[] = [];
  overdueInvoiceData: OverdueInvoiceAlert[] = [];

  // Información de paginación
  totalItems = 0;
  pageSize = 10;
  pageIndex = 0;

  // Control de tabs
  selectedTabIndex = 0; // Para el binding bidireccional con mat-tab-group

  // Columnas para las tablas
  spaceColumns: string[] = ['name', 'owner', 'rentalCount', 'bookingCount', 'revenueGenerated', 'status'];
  bookingColumns: string[] = ['spaceName', 'clientName', 'providerName', 'startDate', 'endDate', 'durationHours', 'status', 'amount'];
  userColumns: string[] = ['name', 'email', 'role', 'activeContracts', 'registrationDate', 'lastLoginDate', 'status'];
  contractColumns: string[] = ['spaceName', 'tenantName', 'ownerName', 'startDate', 'endDate', 'amount', 'status'];
  invoiceColumns: string[] = ['clientName', 'issueDate', 'dueDate', 'totalAmount', 'status'];
  expiringContractColumns: string[] = ['spaceName', 'tenantName', 'ownerName', 'endDate', 'daysUntilExpiry'];
  overdueInvoiceColumns: string[] = ['clientName', 'dueDate', 'totalAmount', 'pendingAmount', 'daysOverdue'];

  // Variables para el control de columnas condicionales
  selectedUserRole: string = '';

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService,
    private exportService: ExportService,
    private changeDetectorRef: ChangeDetectorRef,
    private statusTranslationService: StatusTranslationService
  ) {
    this.filterForm = this.fb.group({
      // Filtros comunes de fechas
      startDate: [''],
      endDate: [''],

      // Filtros específicos para cada tipo de informe
      status: [''],
      providerId: [''],
      spaceId: [''],
      role: [''],
      daysUntilExpiry: [''],
      minDaysOverdue: ['']
    });

    // Validador para cuando cambia la fecha de fin
    this.filterForm.get('endDate')?.valueChanges.subscribe(endDateValue => {
      this.validateDates();
    });

    // Validador para cuando cambia la fecha de inicio
    this.filterForm.get('startDate')?.valueChanges.subscribe(startDateValue => {
      this.validateDates();
    });
  }

  ngOnInit(): void {
    // Establecer valores predeterminados para los filtros
    this.setDefaultFilterValues();
    
    // Inicializar columnas de usuario con todas las columnas visibles por defecto
    this.updateUserColumnsBasedOnRole('');
    
    this.loadCurrentReport();
  }

  // Método para determinar qué filtros mostrar según el tipo de informe seleccionado
  showFilter(filterName: string): boolean {
    switch (this.selectedReport) {
      case 'spaces':
        return ['status'].includes(filterName);
      case 'bookings':
        return ['startDate', 'endDate', 'status'].includes(filterName);
      case 'users':
        return ['startDate', 'role', 'status'].includes(filterName);
      case 'contracts':
        return ['startDate', 'endDate', 'status'].includes(filterName);
      case 'invoices':
        return ['startDate', 'status'].includes(filterName);
      case 'expiringContracts':
        return ['daysUntilExpiry'].includes(filterName);
      case 'overdueInvoices':
        return ['minDaysOverdue'].includes(filterName);
      default:
        return false;
    }
  }

  // Método para formatear fechas de manera consistente para el backend
  private formatDateForBackend(date: Date | string | null, includeTime: boolean = false): string | undefined {
    if (!date) return undefined;

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (includeTime) {
      return dateObj.toISOString(); // Formato ISO completo para LocalDateTime
    } else {
      return dateObj.toISOString().split('T')[0]; // Formato YYYY-MM-DD para LocalDate
    }
  }

  // Obtiene los filtros según el tipo de informe seleccionado
  getFilters(): any {
    const formValue = this.filterForm.value;

    switch (this.selectedReport) {
      case 'spaces':
        const spaceFilters: SpaceReportFilters = {
          status: formValue.status || undefined
        };
        return spaceFilters;

      case 'bookings':
        const bookingFilters: BookingReportFilters = {
          status: formValue.status || undefined
        };

        if (formValue.startDate) {
          bookingFilters.startDate = this.formatDateForBackend(formValue.startDate, false);
        }

        if (formValue.endDate) {
          bookingFilters.endDate = this.formatDateForBackend(formValue.endDate, false);
        }

        return bookingFilters;

      case 'users':
        const userFilters: UserReportFilters = {
          role: formValue.role || undefined,
          status: formValue.status || undefined
        };

        if (formValue.startDate) {
          userFilters.startDate = this.formatDateForBackend(formValue.startDate, true);
        }

        return userFilters;

      case 'contracts':
        const contractFilters: ContractReportFilters = {
          status: formValue.status || undefined
        };

        if (formValue.startDate) {
          contractFilters.contractStartDate = this.formatDateForBackend(formValue.startDate, false);
        }

        if (formValue.endDate) {
          contractFilters.contractEndDate = this.formatDateForBackend(formValue.endDate, false);
        }

        return contractFilters;

      case 'invoices':
        const invoiceFilters: InvoiceReportFilters = {
          status: formValue.status || undefined
        };

        if (formValue.startDate) {
          invoiceFilters.startDate = this.formatDateForBackend(formValue.startDate, true);
        }

        return invoiceFilters;

      case 'expiringContracts':
        return {
          daysUntilExpiry: formValue.daysUntilExpiry || undefined
        } as ExpiringContractsAlertFilters;

      case 'overdueInvoices':
        return {
          minDaysOverdue: formValue.minDaysOverdue || undefined
        } as OverdueInvoicesAlertFilters;

      default:
        return {};
    }
  }

  // Carga el reporte seleccionado actualmente
  loadCurrentReport(): void {
    try {
      // Resetear el estado de error
      this.error = null;
      
      this.loading = true;
      const filters = this.getFilters();

      // Usar un objeto para mapear los tipos de informe a sus métodos de carga
      const reportLoaders: { [key: string]: () => void } = {
        'spaces': () => this.loadSpacesReport(filters),
        'bookings': () => this.loadBookingsReport(filters),
        'users': () => this.loadUsersReport(filters),
        'contracts': () => this.loadContractsReport(filters),
        'invoices': () => this.loadInvoicesReport(filters),
        'expiringContracts': () => this.loadExpiringContractsAlerts(filters),
        'overdueInvoices': () => this.loadOverdueInvoicesAlerts(filters)
      };

      // Si existe un loader para el tipo de informe seleccionado, lo ejecuta
      const loader = reportLoaders[this.selectedReport];
      if (loader) {
        loader();
      } else {
        console.warn(`Tipo de informe no reconocido: ${this.selectedReport}. Cargando espacios.`);
        this.loadSpacesReport(filters);
      }
    } catch (error) {
      console.error('Error loading report:', error);
      this.loading = false;
      // No establecer mensaje de error aquí para evitar afectar la visualización de los tabs
      console.error('Error al cargar el informe. El servidor podría no estar disponible.');

      // Intentar cargar datos de espacios como fallback sin afectar la visualización
      if (this.selectedReport !== 'spaces') {
        this.loadSpacesReport({});
      }
    }
  }

  loadSpacesReport(filters: SpaceReportFilters): void {
    this.loading = true;
    this.reportService.getSpacesReport(
      filters,
      this.pageIndex,
      this.pageSize
    ).subscribe({
      next: (response) => {
        if (response && response.content) {
          this.spaceData = response.content;
          this.totalItems = response.totalElements;
        } else {
          this.spaceData = [];
          this.totalItems = 0;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading spaces report:', error);
        this.spaceData = [];
        this.totalItems = 0;
        this.loading = false;
        this.error = 'Error al cargar el reporte de espacios';
      }
    });
  }

  loadBookingsReport(filters: BookingReportFilters): void {
    this.loading = true;
    this.error = null;

    this.reportService.getBookingsReport(
        filters,
        this.pageIndex,
        this.pageSize
    ).subscribe({
        next: (response: PageResponse<BookingReportRow>) => {
            if (response && response.content) {
                this.bookingData = response.content;
                this.totalItems = response.totalElements;
            } else {
                this.bookingData = [];
                this.totalItems = 0;
                console.warn('No se encontraron datos de reservas');
            }
            this.loading = false;
        },
        error: (error) => {
            console.error('Error loading bookings report:', error);
            this.bookingData = [];
            this.totalItems = 0;
            this.loading = false;
            this.error = 'Error al cargar el reporte de reservas';
            
            if (error.error instanceof ErrorEvent) {
                console.error('Client error:', error.error.message);
            } else {
                console.error(`Backend returned code ${error.status}, body:`, error.error);
            }
        },
        complete: () => {
            this.loading = false;
            this.changeDetectorRef.detectChanges();
        }
    });
  }

  loadUsersReport(filters: UserReportFilters): void {
    this.reportService.getUsersReport(filters, this.pageIndex, this.pageSize)
      .subscribe(this.handleReportResponse<UserReportRow>((data) => this.userData = data));
  }

  loadContractsReport(filters: ContractReportFilters): void {
    this.reportService.getContractsReport(filters, this.pageIndex, this.pageSize)
      .subscribe(this.handleReportResponse<ContractReportRow>((data) => this.contractData = data));
  }

  loadInvoicesReport(filters: InvoiceReportFilters): void {
    this.reportService.getInvoicesReport(filters, this.pageIndex, this.pageSize)
      .subscribe(this.handleReportResponse<InvoiceReportRow>((data) => this.invoiceData = data));
  }

  loadExpiringContractsAlerts(filters: ExpiringContractsAlertFilters): void {
    this.reportService.getExpiringContractsAlerts(filters, this.pageIndex, this.pageSize)
      .subscribe(this.handleReportResponse<ExpiringContractAlert>((data) => this.expiringContractData = data));
  }

  loadOverdueInvoicesAlerts(filters: OverdueInvoicesAlertFilters): void {
    this.reportService.getOverdueInvoicesAlerts(filters, this.pageIndex, this.pageSize)
      .subscribe(this.handleReportResponse<OverdueInvoiceAlert>((data) => this.overdueInvoiceData = data));
  }

  // Factory para manejar respuestas de reportes
  handleReportResponse<T>(dataHandler: (data: T[]) => void) {
    return {
      next: (response: PageResponse<T>) => {
        if (response && response.content) {
          dataHandler(response.content);
          this.totalItems = response.totalElements;
        } else {
          console.warn('Response received but no content found:', response);
          dataHandler([] as any);
          this.totalItems = 0;
          // Confiar en la directiva matNoDataRow para mostrar mensaje de "No hay datos disponibles"
          this.loading = false;
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar el informe:', err);

        // Limpiar los datos del informe actual
        dataHandler([] as any);
        this.totalItems = 0;
        this.loading = false;

        // No mostrar mensaje de error en la interfaz cuando no se encuentran datos
        // Solo registrar en consola para diagnóstico
        console.error('Error loading report:', err);
      }
    };
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadCurrentReport();
  }

 onReportTabChange(tabIndex: number): void {
  const reportTypes = ['spaces', 'bookings', 'users', 'contracts', 'invoices', 'expiringContracts', 'overdueInvoices'];

  if (tabIndex >= 0 && tabIndex < reportTypes.length) {
    // Resetear el formulario
    this.filterForm.reset();
    
    // Actualizar el reporte seleccionado
    this.selectedReport = reportTypes[tabIndex];
    
    // Reset pagination
    this.pageIndex = 0;

    // Si es el tab de usuarios, resetear las columnas
    if (this.selectedReport === 'users') {
      this.updateUserColumnsBasedOnRole('');
    }

    // Cargar datos sin filtros
    this.loadCurrentReport();
  }
}

  // Método para establecer valores predeterminados en los filtros según el tipo de informe
private setDefaultFilterValues(): void {
  // Solo establecer valores por defecto para campos que realmente lo necesiten
  // Por ejemplo, campos numéricos que no pueden ser null
  if (this.showFilter('daysUntilExpiry')) {
    this.filterForm.get('daysUntilExpiry')?.setValue(30); // Ejemplo de valor por defecto necesario
  }
  
  if (this.showFilter('minDaysOverdue')) {
    this.filterForm.get('minDaysOverdue')?.setValue(1); // Ejemplo de valor por defecto necesario
  }

  // No establecer valores por defecto para estados, roles u otros filtros
  // para que se carguen todos los datos
}

  // Método para aplicar filtros y validar antes de enviar
  applyFilters(): void {
    // Validar fechas primero
    this.validateDates();
    
    // Validar el formulario antes de aplicar los filtros
    if (this.filterForm.invalid) {
      // Marcar todos los campos como tocados para mostrar los errores
      Object.keys(this.filterForm.controls).forEach(key => {
        const control = this.filterForm.get(key);
        control?.markAsTouched();
      });

      // Mostrar un mensaje de error
      alert('Por favor, corrige los errores en el formulario antes de aplicar los filtros.');
      return;
    }

    this.pageIndex = 0; // Reset to first page
    this.loadCurrentReport();
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.pageIndex = 0; // Reset to first page
    this.loadCurrentReport();
  }

  exportToExcel(): void {
    let data: any[] = [];
    let fileName = 'reporte';

    switch (this.selectedReport) {
      case 'spaces':
        data = this.prepareDataForExport(this.spaceData);
        fileName = 'espacios';
        break;
      case 'bookings':
        data = this.prepareDataForExport(this.bookingData);
        fileName = 'reservas';
        break;
      case 'users':
        data = this.prepareDataForExport(this.userData);
        fileName = 'usuarios';
        break;
      case 'contracts':
        data = this.prepareDataForExport(this.contractData);
        fileName = 'contratos';
        break;
      case 'invoices':
        data = this.prepareDataForExport(this.invoiceData);
        fileName = 'facturas';
        break;
      case 'expiringContracts':
        data = this.prepareDataForExport(this.expiringContractData);
        fileName = 'contratos-por-vencer';
        break;
      case 'overdueInvoices':
        data = this.prepareDataForExport(this.overdueInvoiceData);
        fileName = 'facturas-vencidas';
        break;
    }

    if (data.length === 0) {
      console.warn('No hay datos para exportar a Excel.');
      return;
    }

    try {
      // Exportar directamente en formato Excel
      this.exportService.exportToExcel(data, fileName);
    } catch (err: any) {
      console.error(`Error al exportar a Excel: ${err.message || 'Error desconocido'}`);
    }
  }

  /**
   * Prepara los datos para exportación traduciendo estados
   */
  prepareDataForExport(data: any[]): any[] {
    return data.map(item => {
      const result: any = {};
      
      // Traducir cada campo al español
      Object.keys(item).forEach(key => {
        // Saltar campos de ID y campos no deseados que no queremos mostrar
        if (key.includes('Id') || key.includes('ID') || key === 'id' || key === 'paidAmount') {
          return;
        }
        
        let translatedKey = key;
        let value = item[key];
        
        // Formatear fechas
        if (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/)) {
          value = this.formatDate(value);
        }
        
        // Formatear moneda
        if (typeof value === 'number' && (key.includes('amount') || key.includes('revenue') || key.includes('Revenue') || key.includes('Spending') || key.includes('Amount') || key.includes('total') || key === 'totalAmount')) {
          value = this.formatCurrency(value);
        }
        
        // Traducir las claves
        switch(key) {
          case 'name': translatedKey = 'Nombre'; break;
          case 'owner': translatedKey = 'Proveedor'; break;
          case 'providerName': translatedKey = 'Proveedor'; break;
          case 'spaceName': translatedKey = 'Espacio'; break;
          case 'clientName': translatedKey = 'Cliente'; break;
          case 'bookingCount': translatedKey = 'Reservas'; break;
          case 'rentalCount': translatedKey = 'Contratos'; break;
          case 'revenueGenerated': translatedKey = 'Ingresos'; break;
          case 'status': 
            translatedKey = 'Estado';
            value = this.translateStatus(value);
            break;
          case 'invoiceType':
            translatedKey = 'Tipo de Factura';
            value = this.translateInvoiceType(value);
            break;
          case 'startDate': translatedKey = 'Fecha Inicio'; break;
          case 'endDate': translatedKey = 'Fecha Fin'; break;
          case 'durationHours': translatedKey = 'Duración (h)'; break;
          case 'amount': translatedKey = 'Monto'; break;
          case 'email': translatedKey = 'Email'; break;
          case 'role': translatedKey = 'Rol'; break;
          case 'activeContracts': translatedKey = 'Contratos Activos'; break;
          case 'totalSpaces': translatedKey = 'Espacios'; break;
          case 'totalRevenue': translatedKey = 'Ingresos Totales'; break;
          case 'totalBookings': translatedKey = 'Reservas Totales'; break;
          case 'totalSpending': translatedKey = 'Gastos Totales'; break;
          case 'registrationDate': translatedKey = 'Fecha Registro'; break;
          case 'lastLoginDate': translatedKey = 'Último Acceso'; break;
          case 'tenantName': translatedKey = 'Inquilino'; break;
          case 'ownerName': translatedKey = 'Propietario'; break;
          case 'issueDate': translatedKey = 'Fecha Emisión'; break;
          case 'dueDate': translatedKey = 'Fecha Vencimiento'; break;
          case 'totalAmount': translatedKey = 'Monto Total'; break;
          case 'invoiceType': translatedKey = 'Tipo de Factura'; break;
          case 'daysUntilExpiry': translatedKey = 'Días Restantes'; break;
          case 'daysOverdue': translatedKey = 'Días Vencidos'; break;
          default: translatedKey = key; break;
        }
        
        result[translatedKey] = value;
      });
      
      return result;
    });
  }

  exportToPDF(): void {
    let data: any[] = [];
    let fileName = 'reporte';
    let columns: { header: string, dataKey: string }[] = [];

    switch (this.selectedReport) {
      case 'spaces':
        data = this.prepareDataForExport(this.spaceData);
        fileName = 'espacios';
        columns = [
          { header: 'Nombre', dataKey: 'Nombre' },
          { header: 'Proveedor', dataKey: 'Proveedor' },
          { header: 'Contratos', dataKey: 'Contratos'},
          { header: 'Reservas', dataKey: 'Reservas' },
          { header: 'Ingresos', dataKey: 'Ingresos' },
          { header: 'Estado', dataKey: 'Estado' }
        ];
        break;
      case 'bookings':
        data = this.prepareDataForExport(this.bookingData);
        fileName = 'reservas';
        columns = [
          { header: 'Espacio', dataKey: 'Espacio' },
          { header: 'Cliente', dataKey: 'Cliente' },
          { header: 'Proveedor', dataKey: 'Proveedor' },
          { header: 'Fecha Inicio', dataKey: 'Fecha Inicio' },
          { header: 'Fecha Fin', dataKey: 'Fecha Fin' },
          { header: 'Duración (h)', dataKey: 'Duración (h)' },
          { header: 'Estado', dataKey: 'Estado' },
          { header: 'Monto', dataKey: 'Monto' }
        ];
        break;
      case 'users':
        data = this.prepareDataForExport(this.userData);
        fileName = 'usuarios';
        columns = [
          { header: 'Nombre', dataKey: 'Nombre' },
          { header: 'Email', dataKey: 'Email' },
          { header: 'Rol', dataKey: 'Rol' },
          { header: 'Contratos Activos', dataKey: 'Contratos Activos' },
          { header: 'Fecha Registro', dataKey: 'Fecha Registro' },
          { header: 'Último Acceso', dataKey: 'Último Acceso' },
          { header: 'Estado', dataKey: 'Estado' }
        ];
        break;
      case 'contracts':
        data = this.prepareDataForExport(this.contractData);
        fileName = 'contratos';
        columns = [
          { header: 'Espacio', dataKey: 'Espacio' },
          { header: 'Inquilino', dataKey: 'Inquilino' },
          { header: 'Propietario', dataKey: 'Propietario' },
          { header: 'Fecha Inicio', dataKey: 'Fecha Inicio' },
          { header: 'Fecha Fin', dataKey: 'Fecha Fin' },
          { header: 'Monto', dataKey: 'Monto' },
          { header: 'Estado', dataKey: 'Estado' }
        ];
        break;
      case 'invoices':
        data = this.prepareDataForExport(this.invoiceData);
        fileName = 'facturas';
        columns = [
          { header: 'Cliente', dataKey: 'Cliente' },
          { header: 'Fecha Emisión', dataKey: 'Fecha Emisión' },
          { header: 'Fecha Vencimiento', dataKey: 'Fecha Vencimiento' },
          { header: 'Monto Total', dataKey: 'Monto Total' },
          { header: 'Estado', dataKey: 'Estado' }
        ];
        break;
      case 'expiringContracts':
        data = this.prepareDataForExport(this.expiringContractData);
        fileName = 'contratos-por-vencer';
        columns = [
          { header: 'Espacio', dataKey: 'Espacio' },
          { header: 'Inquilino', dataKey: 'Inquilino' },
          { header: 'Propietario', dataKey: 'Propietario' },
          { header: 'Fecha Vencimiento', dataKey: 'Fecha Vencimiento' },
          { header: 'Días Restantes', dataKey: 'Días Restantes' }
        ];
        break;
      case 'overdueInvoices':
        data = this.prepareDataForExport(this.overdueInvoiceData);
        fileName = 'facturas-vencidas';
        columns = [
          { header: 'Cliente', dataKey: 'Cliente' },
          { header: 'Fecha Vencimiento', dataKey: 'Fecha Vencimiento' },
          { header: 'Monto Total', dataKey: 'Monto Total' },
          { header: 'Monto Pendiente', dataKey: 'Monto Pendiente' },
          { header: 'Días Vencidos', dataKey: 'Días Vencidos' }
        ];
        break;
    }

    if (data.length === 0) {
      console.warn('No hay datos para exportar a PDF.');
      return;
    }

    try {
      this.exportService.exportToPDF(data, fileName, columns);
    } catch (err: any) {
      console.error(`Error al exportar a PDF: ${err.message || 'Error desconocido'}`);
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  }

  formatCurrency(value: number): string {
    if (value === null || value === undefined) return '';
    return `$${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Traduce el estado de cualquier entidad a español
   */
  translateStatus(status: string): string {
    return this.statusTranslationService.translateStatus(status);
  }

  /**
   * Traduce el tipo de factura a español
   */
  translateInvoiceType(type: string): string {
    const translations: { [key: string]: string } = {
      'REGULAR': 'Regular',
      'CONTRACT': 'Contrato',
      'BOOKING': 'Reserva',
      'Regular': 'Regular',
      'Contract': 'Contrato',
      'Booking': 'Reserva'
    };
    
    return translations[type] || type;
  }

  // Método para agregar columnas específicas según el rol del usuario seleccionado
  updateUserColumnsBasedOnRole(role: string): void {
    this.selectedUserRole = role;
    // Columnas base que siempre se muestran (sin userId)
    let columns = ['name', 'email', 'role', 'activeContracts', 'registrationDate', 'lastLoginDate', 'status'];

    if (role === 'PROVEEDOR') {
      // Añadir columnas específicas para proveedores después de 'role'
      columns.splice(3, 0, 'totalSpaces', 'totalRevenue');
    } else if (role === 'CLIENTE') {
      // Añadir columnas específicas para clientes después de 'role'
      columns.splice(3, 0, 'totalBookings', 'totalSpending');
    }

    this.userColumns = columns;
  }

  // Para uso en el template con ngIf
  isProviderTab(): boolean {
    return this.selectedUserRole === 'PROVEEDOR';
  }

  isClientTab(): boolean {
    return this.selectedUserRole === 'CLIENTE';
  }

  // Modificar el método de cambio de filtro de rol para actualizar columnas
  onRoleFilterChange(event: any): void {
    const selectedRole = event.value;
    this.updateUserColumnsBasedOnRole(selectedRole);
    this.loadCurrentReport();
  }

  private buildParams<T>(filters?: T, page = 0, size = 10): HttpParams {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (!filters) return params;

    Object.keys(filters).forEach(key => {
      const value = (filters as any)[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return params;
  }

  // Método para verificar si un campo tiene errores
  hasError(controlName: string, errorName: string): boolean {
    const control = this.filterForm.get(controlName);
    return control !== null && control.touched && control.hasError(errorName);
  }

  // Método para obtener el mensaje de error de un campo
  getErrorMessage(controlName: string): string {
    const control = this.filterForm.get(controlName);

    if (control?.hasError('dateError')) {
      return control.getError('dateError');
    }

    if (control?.hasError('required')) {
      return 'Este campo es obligatorio';
    }

    return '';
  }

  // Método para exportar los datos a CSV (similar al Excel pero específico para CSV)
  exportToCSV(): void {
    let data: any[] = [];
    let filename = '';
    let columns: string[] = [];

    switch (this.selectedReport) {
      case 'spaces':
        data = this.prepareDataForExport(this.spaceData);
        filename = 'reporte_espacios';
        columns = this.spaceColumns;
        break;
      case 'bookings':
        data = this.prepareDataForExport(this.bookingData);
        filename = 'reporte_reservas';
        columns = this.bookingColumns;
        break;
      case 'users':
        data = this.prepareDataForExport(this.userData);
        filename = 'reporte_usuarios';
        columns = this.userColumns;
        break;
      case 'contracts':
        data = this.prepareDataForExport(this.contractData);
        filename = 'reporte_contratos';
        columns = this.contractColumns;
        break;
      case 'invoices':
        data = this.prepareDataForExport(this.invoiceData);
        filename = 'reporte_facturas';
        columns = this.invoiceColumns;
        break;
      case 'expiringContracts':
        data = this.prepareDataForExport(this.expiringContractData);
        filename = 'alerta_contratos_por_vencer';
        columns = this.expiringContractColumns;
        break;
      case 'overdueInvoices':
        data = this.prepareDataForExport(this.overdueInvoiceData);
        filename = 'alerta_facturas_vencidas';
        columns = this.overdueInvoiceColumns;
        break;
    }

    // Si no hay datos, mostrar mensaje en consola y salir
    if (data.length === 0) {
      console.warn('No hay datos para exportar a CSV.');
      return;
    }

    // Añadir timestamp para evitar sobrescritura
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    filename = `${filename}_${timestamp}.csv`;

    try {
      this.exportService.exportToCSV(data, filename);
    } catch (err: any) {
      console.error(`Error al exportar a CSV: ${err.message || 'Error desconocido'}`);
    }
  }

  // Método para validar que la fecha de fin no sea anterior a la fecha de inicio
  private validateDates(): void {
    const startDate = this.filterForm.get('startDate')?.value;
    const endDate = this.filterForm.get('endDate')?.value;

    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      if (endDateObj < startDateObj) {
        this.filterForm.get('endDate')?.setErrors({ 'dateError': 'La fecha de fin no puede ser anterior a la de inicio' });
      } else {
        // Limpiar solo este error específico, manteniendo otros errores si existen
        const currentErrors = this.filterForm.get('endDate')?.errors;
        if (currentErrors) {
          delete currentErrors['dateError'];
          if (Object.keys(currentErrors).length === 0) {
            this.filterForm.get('endDate')?.setErrors(null);
          } else {
            this.filterForm.get('endDate')?.setErrors(currentErrors);
          }
        }
      }
    }
  }
}
