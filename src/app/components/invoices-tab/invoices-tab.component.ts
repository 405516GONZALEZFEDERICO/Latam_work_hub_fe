import { Component, OnInit } from '@angular/core';
import { RentalService, InvoiceHistory } from '../../services/rental.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth-service/auth.service';

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
    MatSelectModule
  ],
  standalone: true
})
export class InvoicesTabComponent implements OnInit {
  invoices: InvoiceHistory[] = [];
  loading = false;
  filterStatus: string = 'ALL';

  constructor(
    private rentalService: RentalService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.loading = true;
    this.authService.getCurrentUser().subscribe(user => {
      if (!user) {
        this.loading = false;
        this.snackBar.open('Usuario no encontrado', 'Cerrar', { duration: 3000 });
        return;
      }

      // Get all rentals for the user
      this.rentalService.getUserContracts(user.uid).subscribe({
        next: (rentals) => {
          // For each rental, get its invoices
          const invoicePromises = rentals.map(rental => 
            this.rentalService.getContractInvoices(rental.id).toPromise()
          );

          Promise.all(invoicePromises)
            .then(results => {
              this.invoices = results
                .flat()
                .filter(invoice => invoice !== undefined)
                .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
              this.loading = false;
            })
            .catch(error => {
              this.loading = false;
              this.snackBar.open('Error al cargar las facturas', 'Cerrar', {
                duration: 3000
              });
            });
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open('Error al cargar las facturas', 'Cerrar', {
            duration: 3000
          });
        }
      });
    });
  }

  payInvoice(invoice: InvoiceHistory): void {
    if (invoice.paymentUrl) {
      window.location.href = invoice.paymentUrl;
    }
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'green';
      case 'pending':
        return 'orange';
      case 'overdue':
        return 'red';
      case 'cancelled':
        return 'gray';
      default:
        return 'blue';
    }
  }

  getFilteredInvoices(): InvoiceHistory[] {
    if (this.filterStatus === 'ALL') {
      return this.invoices;
    }
    return this.invoices.filter(invoice => 
      invoice.status.toLowerCase() === this.filterStatus.toLowerCase()
    );
  }

  getTotalAmount(): number {
    return this.getFilteredInvoices().reduce((total, invoice) => 
      total + Number(invoice.totalAmount), 0
    );
  }
} 