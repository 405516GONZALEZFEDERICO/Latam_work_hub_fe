import { Component, OnInit } from '@angular/core';
import { RentalService, InvoiceHistory, RentalContractResponse, PaginatedResponse } from '../../services/rental/rental.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth-service/auth.service';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-invoices-tab',
  templateUrl: './invoices-tab.component.html',
  styleUrls: ['./invoices-tab.component.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatPaginatorModule,
    FormsModule,
    ReactiveFormsModule
  ],
  standalone: true
})
export class InvoicesTabComponent implements OnInit {
  invoices: InvoiceHistory[] = [];
  filteredInvoices: InvoiceHistory[] = [];
  displayedInvoices: InvoiceHistory[] = [];
  loading = false;
  
  // Filtro por estado
  statusFilter = new FormControl('ALL');
  
  // Propiedades de paginación
  totalInvoices: number = 0;
  pageSize: number = 5;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  currentPage: number = 0;

  constructor(
    private rentalService: RentalService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    console.log('InvoicesTabComponent: Inicializando componente');
    // Suscribirse a cambios en el filtro
    this.statusFilter.valueChanges.subscribe((value) => {
      console.log('InvoicesTabComponent: Filtro cambiado:', value);
      this.applyFilters();
    });
    
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.loading = true;
    console.log('InvoicesTabComponent: Cargando facturas...');
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (!user) {
          this.loading = false;
          this.snackBar.open('Usuario no encontrado', 'Cerrar', { duration: 3000 });
          return;
        }

        // Obtener todos los contratos del usuario
        this.rentalService.getUserContracts(user.uid).subscribe({
          next: (response: PaginatedResponse<RentalContractResponse>) => {
            if (!response.content || response.content.length === 0) {
              this.loading = false;
              return;
            }
            
            // Crear un array de observables para obtener las facturas de cada contrato
            const invoiceObservables = response.content.map(rental => 
              this.rentalService.getContractInvoices(rental.id).pipe(
                catchError(() => of([]))
              )
            );
            
            // Combinar todos los observables
            forkJoin(invoiceObservables).subscribe({
              next: (results) => {
                // Aplanar el array de arrays de facturas
                const allInvoices: InvoiceHistory[] = [];
                results.forEach(invoiceArray => {
                  if (invoiceArray && invoiceArray.length) {
                    allInvoices.push(...invoiceArray);
                  }
                });
                
                if (!this.invoices.every(invoice => invoice.issueDate)) {
                  console.warn('Algunas facturas no tienen fecha de emisión');
                }
                
                this.invoices.sort((a, b) => {
                  if (!a.issueDate || !b.issueDate) return 0;
                  return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
                });
                this.applyFilters();
                this.loading = false;
              },
              error: (error) => {
                console.error('Error al cargar las facturas:', error);
                this.loading = false;
                this.snackBar.open('Error al cargar las facturas', 'Cerrar', {
                  duration: 3000
                });
              }
            });
          },
          error: (error) => {
            console.error('Error al cargar los contratos:', error);
            this.loading = false;
            this.snackBar.open('Error al cargar los contratos', 'Cerrar', {
              duration: 3000
            });
          }
        });
      },
      error: (error) => {
        console.error('Error al obtener usuario:', error);
        this.loading = false;
        this.snackBar.open('Error al obtener información de usuario', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  applyFilters(): void {
    const statusValue = this.statusFilter.value;
    console.log('InvoicesTabComponent: Aplicando filtro:', statusValue);
    
    if (statusValue === 'ALL') {
      this.filteredInvoices = [...this.invoices];
    } else {
      this.filteredInvoices = this.invoices.filter(invoice => 
        invoice.status === statusValue
      );
    }
    
    this.totalInvoices = this.filteredInvoices.length;
    console.log('InvoicesTabComponent: Filtradas', this.filteredInvoices.length, 'de', this.invoices.length, 'facturas');
    this.updateDisplayedInvoices();
  }
  
  updateDisplayedInvoices(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedInvoices = this.filteredInvoices.slice(startIndex, endIndex);
    console.log('InvoicesTabComponent: Mostrando', this.displayedInvoices.length, 'facturas en la página', this.currentPage + 1);
  }
  
  handlePageEvent(e: PageEvent): void {
    console.log('InvoicesTabComponent: Evento de página:', e);
    this.pageSize = e.pageSize;
    this.currentPage = e.pageIndex;
    this.updateDisplayedInvoices();
  }

  payInvoice(invoice: InvoiceHistory): void {
    if (invoice.paymentUrl) {
      window.location.href = invoice.paymentUrl;
    }
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'pagado':
        return 'var(--color-success)';
      case 'pending':
      case 'pendiente':
        return 'orange';
      case 'overdue':
      case 'vencido':
        return 'var(--color-error)';
      case 'cancelled':
      case 'cancelado':
        return 'gray';
      default:
        return 'var(--color-primary)';
    }
  }

  getTotalAmount(): number {
    return this.filteredInvoices.reduce((total, invoice) => 
      total + Number(invoice.totalAmount), 0
    );
  }
} 