import { Component, OnInit } from '@angular/core';
import { RentalService, RentalContractResponse, InvoiceHistory } from '../../services/rental.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../services/auth-service/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rentals-tab',
  templateUrl: './rentals-tab.component.html',
  styleUrls: ['./rentals-tab.component.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  standalone: true
})
export class RentalsTabComponent implements OnInit {
  rentals: RentalContractResponse[] = [];
  selectedRental: RentalContractResponse | null = null;
  invoices: InvoiceHistory[] = [];
  loading = false;

  constructor(
    private rentalService: RentalService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadRentals();
  }

  loadRentals(): void {
    this.loading = true;
    this.authService.getCurrentUser().subscribe(user => {
      if (!user) {
        this.loading = false;
        this.snackBar.open('Usuario no encontrado', 'Cerrar', { duration: 3000 });
        return;
      }

      this.rentalService.getUserContracts(user.uid).subscribe({
        next: (rentals) => {
          this.rentals = rentals;
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open('Error al cargar los alquileres', 'Cerrar', {
            duration: 3000
          });
        }
      });
    });
  }

  selectRental(rental: RentalContractResponse): void {
    this.selectedRental = rental;
    this.loadInvoices(rental.id);
  }

  loadInvoices(contractId: number): void {
    this.loading = true;
    this.rentalService.getContractInvoices(contractId).subscribe({
      next: (invoices) => {
        this.invoices = invoices;
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

  cancelRental(rental: RentalContractResponse): void {
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

  payInvoice(invoice: InvoiceHistory): void {
    if (invoice.paymentUrl) {
      window.location.href = invoice.paymentUrl;
    }
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return 'green';
      case 'pending':
        return 'orange';
      case 'cancelled':
        return 'red';
      case 'expired':
        return 'gray';
      default:
        return 'blue';
    }
  }
} 