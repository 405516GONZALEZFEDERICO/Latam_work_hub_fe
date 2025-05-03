import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNativeDateAdapter } from '@angular/material/core';

@Component({
  selector: 'app-reservas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCardModule,
    MatBadgeModule
  ],
  providers: [
    provideNativeDateAdapter()
  ],
  templateUrl: './reservas.component.html',
  styleUrls: ['./reservas.component.css']
})
export class ReservasComponent implements OnInit {
  startDate: Date | null = null;
  endDate: Date | null = null;
  
  // Datos para las reservas (inicialmente vacío, se cargará desde el servicio)
  reservas: any[] = [];

  constructor(private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    // Cargar datos reales (aquí iría la llamada al servicio)
    this.cargarDatosReservas();
    
    // Verificar si viene desde pago - verificar en múltiples lugares
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
      
      // Mostrar mensaje de confirmación más destacado
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

  cargarDatosReservas(): void {
    // Esta función se conectará al servicio para obtener las reservas reales
    this.reservas = [];
    // TODO: Implementar llamada al servicio de reservas
    console.log('TODO: Cargar reservas desde el servicio');
    // Ejemplo de cómo podría verse con datos mock (solo para desarrollo inicial si es necesario)
    /*
    this.reservas = [
      {
        id: '12345',
        titulo: 'Espacio de Coworking - Palermo',
        fecha: '28/04/2023',
        horarioInicio: '09:00',
        horarioFin: '18:00',
        estado: 'Confirmado',
        precio: 5000
      },
      {
        id: '12346',
        titulo: 'Sala de Reuniones - Microcentro',
        fecha: '30/04/2023',
        horarioInicio: '14:00',
        horarioFin: '16:00',
        estado: 'Pendiente de Pago',
        precio: 3000
      }
    ];
    */
  }

  aplicarFiltros(): void {
    // Esta función será implementada luego cuando se conecte con el backend
    this.snackBar.open('Funcionalidad de filtrado disponible próximamente', 'OK', {
      duration: 3000
    });
    console.log('Filtrar desde:', this.startDate, 'hasta:', this.endDate);
    // TODO: Implementar lógica de filtrado llamando al servicio
  }

  verDetalles(id: string): void {
    // Esta función será implementada luego cuando se conecte con el backend
    this.snackBar.open(`Detalles de reserva #${id} (próximamente)`, 'OK', {
      duration: 3000
    });
    // TODO: Navegar a la vista de detalle de la reserva
    // this.router.navigate(['/home/reservas', id]); 
  }

  cancelarReserva(id: string): void {
    // Esta función será implementada luego cuando se conecte con el backend
    this.snackBar.open(`Cancelación de reserva #${id} (próximamente)`, 'OK', {
      duration: 3000
    });
    // TODO: Implementar lógica de cancelación llamando al servicio
  }

  pagarReserva(id: string): void {
    // Esta función será implementada cuando se integre con el sistema de pagos
    this.snackBar.open(`Procesando pago para la reserva #${id} (próximamente)`, 'OK', {
      duration: 3000
    });
    // TODO: Implementar lógica de pago o redirección a la pasarela de pago
    // this.router.navigate(['/pagos/reserva', id]);
  }
}
