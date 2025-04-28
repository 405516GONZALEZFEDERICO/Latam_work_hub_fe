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
  templateUrl: './reservas.component.html',
  styleUrls: ['./reservas.component.css']
})
export class ReservasComponent implements OnInit {
  startDate: Date | null = null;
  endDate: Date | null = null;
  
  // Datos de muestra
  reservas: any[] = [];
  alquileres: any[] = [];

  constructor(private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    // Cargar datos de muestra
    this.cargarDatosMuestra();
    
    // Verificar si viene desde pago - verificar en múltiples lugares
    this.checkPaymentRedirect();
  }

  // Método específico para verificar múltiples flags de redirección de pago
  private checkPaymentRedirect(): void {
    console.log('Verificando estado de redirección de pago...');
    
    const paymentRedirect = localStorage.getItem('paymentRedirect');
    const paymentInProgress = localStorage.getItem('paymentInProgress');
    const sessionPaymentRedirect = sessionStorage.getItem('paymentRedirect');
    
    const redirectDetected = paymentRedirect === 'true' || paymentInProgress === 'true' || sessionPaymentRedirect === 'true';
    
    console.log('Estado de redirección:', { 
      paymentRedirect, 
      paymentInProgress, 
      sessionPaymentRedirect,
      redirectDetected 
    });
    
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

  cargarDatosMuestra(): void {
    // Esto sería reemplazado por una llamada al servicio real
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

    this.alquileres = [
      {
        id: '54321',
        titulo: 'Oficina Privada - Belgrano',
        fechaInicio: '01/04/2023',
        fechaFin: '30/04/2023',
        estado: 'Activo',
        precioMensual: 75000
      }
    ];
  }

  aplicarFiltros(): void {
    // Esta función será implementada luego cuando se conecte con el backend
    this.snackBar.open('Funcionalidad de filtrado disponible próximamente', 'OK', {
      duration: 3000
    });
  }

  verDetalles(id: string, tipo: string): void {
    // Esta función será implementada luego cuando se conecte con el backend
    this.snackBar.open(`Detalles de ${tipo} #${id} (próximamente)`, 'OK', {
      duration: 3000
    });
  }

  cancelarReserva(id: string): void {
    // Esta función será implementada luego cuando se conecte con el backend
    this.snackBar.open(`Cancelación de reserva #${id} (próximamente)`, 'OK', {
      duration: 3000
    });
  }

  renovarAlquiler(id: string): void {
    // Esta función será implementada luego cuando se conecte con el backend
    this.snackBar.open(`Renovación de alquiler #${id} (próximamente)`, 'OK', {
      duration: 3000
    });
  }
}
