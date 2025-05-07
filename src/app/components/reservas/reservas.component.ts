import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RentalsTabComponent } from '../rentals-tab/rentals-tab.component';
import { BookingsTabComponent } from '../bookings-tab/bookings-tab.component';

@Component({
  selector: 'app-reservas',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    RentalsTabComponent,
    BookingsTabComponent
  ],
  templateUrl: './reservas.component.html',
  styleUrls: ['./reservas.component.css']
})
export class ReservasComponent implements OnInit {
  constructor(private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    // Verificar si viene desde pago
    this.checkPaymentRedirect();
  }

  // Método específico para verificar múltiples flags de redirección de pago
  private checkPaymentRedirect(): void {
    const paymentRedirect = localStorage.getItem('paymentRedirect');
    const paymentInProgress = localStorage.getItem('paymentInProgress');
    const sessionPaymentRedirect = sessionStorage.getItem('paymentRedirect');
    
    const redirectDetected = paymentRedirect === 'true' || paymentInProgress === 'true' || sessionPaymentRedirect === 'true';
    
    if (redirectDetected) {
      // Limpiar todas las banderas de redirección
      localStorage.removeItem('paymentRedirect');
      localStorage.removeItem('paymentInProgress');
      localStorage.removeItem('paymentTimestamp');
      sessionStorage.removeItem('paymentRedirect');
      
      // Mostrar mensaje de confirmación
      this.snackBar.open(
        '¡Gracias por tu pago! Tu reserva está siendo procesada y aparecerá en esta lista una vez confirmada.', 
        'Entendido', 
        {
          duration: 10000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['success-snackbar']
        }
      );
    }
  }
}
