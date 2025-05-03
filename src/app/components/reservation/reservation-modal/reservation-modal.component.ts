import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { BookingService, BookingDto } from '../../../services/booking/booking.service';

// Interfaces
export interface ReservationData {
  spaceId: string;
  space: any;
}

export interface BookingData {
  spaceId: string;
  startDateTime: string;
  endDateTime: string;
  numberOfPeople: number;
  selectedAmenities: string[];
  totalPrice: number;
  reservationPeriod: ReservationPeriod;
  status: BookingStatus;
}

// Enum para el estado de la reserva
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export enum ReservationPeriod {
  HOUR = 'hour',
  DAY = 'day',
  MONTH = 'month'
}

@Component({
  selector: 'app-reservation-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
  ],
  templateUrl: './reservation-modal.component.html',
  styleUrls: ['./reservation-modal.component.css']
})
export class ReservationModalComponent implements OnInit {
  reservationForm: FormGroup;
  space: any;
  minDate = new Date();
  maxDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1));
  totalPrice = 0;
  selectedAmenities: string[] = [];
  amenityPrices: { [key: string]: number } = {};
  reservationPeriod: ReservationPeriod = ReservationPeriod.HOUR; // Default to hourly
  isLoading = false; // Track loading state
  
  // Map for reservation type labels
  private reservationTypeLabels = {
    [ReservationPeriod.HOUR]: 'Por hora',
    [ReservationPeriod.DAY]: 'Por día',
    [ReservationPeriod.MONTH]: 'Por mes'
  };

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ReservationModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReservationData,
    private bookingService: BookingService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.space = data.space;
    
    // Normalizar la estructura de amenities si es necesario
    if (this.space.amenities) {
      this.normalizeAmenities();
      
      // Seleccionar automáticamente todas las amenities disponibles
      this.selectedAmenities = this.space.amenities.map((amenity: any) => amenity.name);
    }
    
    this.initAmenityPrices();
    
    // Initialize form
    this.reservationForm = this.fb.group({
      startDate: [new Date(), Validators.required],
      reservationType: [ReservationPeriod.HOUR, Validators.required],
      startTime: ['09:00', Validators.required],
      endTime: ['18:00', Validators.required],
      numberOfPeople: [1, [Validators.required, Validators.min(1), Validators.max(this.space.capacity || 10)]],
    });
  }

  ngOnInit(): void {
    // Calculate initial price
    this.calculatePrice();
    
    // Update price when form values change
    this.reservationForm.valueChanges.subscribe(() => {
      this.calculatePrice();
    });

    // Debug info at startup
    this.debugAmenityInfo();
    
    // Asegurar que las amenities estén seleccionadas 
    if (this.selectedAmenities.length > 0) {
      setTimeout(() => {
        this.calculatePrice();
      }, 100);
    }
  }

  // Debug amenity information
  debugAmenityInfo(): void {
    console.group('Debug Amenity Info');
    
    if (this.space.amenities && this.space.amenities.length > 0) {
      this.space.amenities.forEach((amenity: any) => {
      });
    } 
    console.groupEnd();
  }

  // Get human-readable label for reservation type
  getReservationTypeLabel(): string {
    const reservationType = this.reservationForm.get('reservationType')?.value as ReservationPeriod;
    return this.reservationTypeLabels[reservationType] || 'Desconocido';
  }

  // Method to handle reservation type changes
  onReservationTypeChange(): void {
    const type = this.reservationForm.get('reservationType')?.value;
    this.reservationPeriod = type;
    this.calculatePrice();
  }

  // Return hourly price
  getHourlyPrice(): number {
    return this.space.pricePerHour || this.space.hourlyPrice || 10;
  }

  // Return daily price
  getDailyPrice(): number {
    const hourlyPrice = this.getHourlyPrice();
    return this.space.pricePerDay || this.space.dailyPrice || hourlyPrice * 8;
  }

  // Return monthly price
  getMonthlyPrice(): number {
    const dailyPrice = this.getDailyPrice();
    return this.space.pricePerMonth || this.space.monthlyPrice || dailyPrice * 20;
  }
  
  // Check if time fields should be shown (for hourly reservations)
  showTimeFields(): boolean {
    return this.reservationForm.get('reservationType')?.value === ReservationPeriod.HOUR;
  }

  initAmenityPrices(): void {
    // Initialize amenity prices with default values if needed
      
    if (this.space.amenities && this.space.amenities.length > 0) {
      
      this.space.amenities.forEach((amenity: any) => {
        // Log info de la amenity antes de cualquier procesamiento
        
        // Convert price to number if it's a string
        let price = amenity.price;
        if (typeof price === 'string') {
          price = parseFloat(price.replace(/[^\d.-]/g, '')); // Eliminar caracteres no numéricos
        }
        
        // Forzar conversión a número 
        price = Number(price || 0);
        
        // Asegurar que tengamos un valor numérico válido
        if (isNaN(price)) {
          price = 0; // Default price only if not a valid number
        }
        
        this.amenityPrices[amenity.name] = price;
      });
      
    }
  }

  getAmenities(): any[] {
    return this.space.amenities || [];
  }

  hasAmenities(): boolean {
    return this.space.amenities && this.space.amenities.length > 0;
  }

  toggleAmenity(amenityName: string): void {
    
    const index = this.selectedAmenities.indexOf(amenityName);
    if (index > -1) {
      this.selectedAmenities.splice(index, 1);
    } else {
      this.selectedAmenities.push(amenityName);
    }
    
    
    // Forzar recálculo del precio total
    setTimeout(() => {
      this.calculatePrice();
    }, 0);
  }

  isAmenitySelected(amenityName: string): boolean {
    const isSelected = this.selectedAmenities.includes(amenityName);
    // Debug solo la primera vez para no saturar la consola
    return isSelected;
  }

  // Propiedad privada para controlar el debug único
  private _debuggedAmenitySelections = false;

  // Método para obtener el ícono correspondiente a cada amenity
  getAmenityIcon(amenityName: string): string {
    const iconMap: { [key: string]: string } = {
      'WiFi': 'wifi',
      'Aire acondicionado': 'ac_unit',
      'Estacionamiento': 'local_parking',
      'Café': 'coffee',
      'Impresora': 'print',
      'Sala de reuniones': 'meeting_room',
      'Cocina': 'kitchen',
      'Seguridad': 'security',
      'Acceso 24/7': 'access_time',
      'Lockers': 'lock',
      'Proyector': 'videocam',
      'Baños privados': 'wc',
      'Cafetería': 'local_cafe',
      'Limpieza': 'cleaning_services',
      'Internet de alta velocidad': 'network_wifi'
    };

    return iconMap[amenityName] || 'check_circle';
  }

  // Calcular el precio total basado en la selección actual
  calculatePrice(): void {
    const basePrice = this.getBasePrice();
    const amenitiesPrice = this.getAmenitiesPrice();
    
    // Forzar conversión a números antes de sumar
    const basePriceNum = Number(basePrice);
    const amenitiesPriceNum = Number(amenitiesPrice);
    
    this.totalPrice = basePriceNum + amenitiesPriceNum;
    
    
    // Forzar cambio de detección
    setTimeout(() => {
    }, 0);
  }

  // Calcular el precio base según el tipo de reserva (hora/día/mes)
  getBasePrice(): number {
    if (!this.reservationForm.valid) {
      return 0;
    }

    const formValues = this.reservationForm.value;
    const reservationType = formValues.reservationType;
    
    // Calculate price based on selected reservation type
    switch (reservationType) {
      case ReservationPeriod.HOUR:
        const startTime = formValues.startTime;
        const endTime = formValues.endTime;
        
        // Calcular diferencia de horas
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        let hours = endHour - startHour;
        const minutes = endMinute - startMinute;
        
        // Ajustar por minutos
        if (minutes > 0) {
          hours += minutes / 60;
        } else if (minutes < 0) {
          hours -= 1 - (minutes / 60);
        }
        
        if (hours <= 0) {
          hours = 1; // Minimum 1 hour
        }
        
        const hourlyPrice = this.getHourlyPrice();
        return hours * hourlyPrice;
        
      case ReservationPeriod.DAY:
        const dailyPrice = this.getDailyPrice();
        return dailyPrice;
        
      case ReservationPeriod.MONTH:
        const monthlyPrice = this.getMonthlyPrice();
        return monthlyPrice;
        
      default:
        return 0;
    }
  }

  // Calcular el precio de los servicios adicionales seleccionados
  getAmenitiesPrice(): number {
    if (!this.selectedAmenities || !this.selectedAmenities.length) {
      return 0;
    }
    
    let total = 0;
    
    for (const amenityName of this.selectedAmenities) {
      // Obtener y validar el precio
      let price = this.amenityPrices[amenityName];
      if (typeof price !== 'number') {
        price = Number(price);
      }
      
      // Si aún no es un número válido, usar valor por defecto
      if (isNaN(price)) {
        console.warn(`Precio inválido para ${amenityName}, usando valor por defecto`);
        price = 0;
      }
      
      total += price;
    }
    
    return total;
  }

  formatTimeForBackend(timeString: string): string {
    return timeString + ':00'; // Add seconds for backend format
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onSubmit(): void {
    if (this.reservationForm.invalid) {
      this.snackBar.open('Por favor complete todos los campos requeridos', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      return;
    }

    // Prevent multiple submissions
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    const formValues = this.reservationForm.value;
    const startDate = formValues.startDate;
    const reservationType = formValues.reservationType;
    
    // Format date and times based on reservation type
    const formattedDate = this.formatDate(startDate);
    let startDateTime = '';
    let endDateTime: string | undefined = undefined;
    let initHour: string | undefined = undefined;
    let endHour: string | undefined = undefined;
    
    // Handle different reservation types according to backend expectations
    switch (reservationType) {
      case ReservationPeriod.HOUR:
        // For hourly reservations, include both date, times and hour fields
        startDateTime = `${formattedDate}T${this.formatTimeForBackend(formValues.startTime)}`;
        endDateTime = `${formattedDate}T${this.formatTimeForBackend(formValues.endTime)}`;
        initHour = this.formatTimeForBackend(formValues.startTime);
        endHour = this.formatTimeForBackend(formValues.endTime);
        break;
        
      case ReservationPeriod.DAY:
        // For daily reservations, include ONLY startDate (no endDate as per backend logic)
        startDateTime = `${formattedDate}T00:00:00`;
        // Do not set endDateTime for PER_DAY reservations
        break;
        
      case ReservationPeriod.MONTH:
        // For monthly reservations, include both start and end dates
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(endDate.getDate() - 1); // Last day of the month period
        
        startDateTime = `${formattedDate}T00:00:00`;
        endDateTime = `${this.formatDate(endDate)}T23:59:59`;
        break;
    }
    
    console.log(`Reservation Type: ${reservationType}`);
    console.log(`Start Date Time: ${startDateTime}`);
    console.log(`End Date Time: ${endDateTime || 'Not set (PER_DAY reservation)'}`);
    
    // Generate a unique ID for this booking
    const uid = this.generateUid();
    
    // Create booking DTO according to backend requirements and reservation type
    const bookingDto: BookingDto = {
      uid: uid,
      spaceId: Number(this.data.spaceId),
      startDate: startDateTime,
      counterPersons: formValues.numberOfPeople,
      totalAmount: this.totalPrice
    };
    
    // Only include endDate for HOUR and MONTH reservation types
    if (endDateTime) {
      bookingDto.endDate = endDateTime;
    }
    
    // Only include initHour and endHour for hourly reservations
    if (reservationType === ReservationPeriod.HOUR) {
      bookingDto.initHour = initHour;
      bookingDto.endHour = endHour;
    }

    console.log('Sending booking data to backend:', bookingDto);

    this.snackBar.open('Procesando su reserva...', '', {
      duration: 1500,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });

    this.bookingService.createBooking(bookingDto).subscribe({
      next: (response) => {
        this.isLoading = false;
       
        
        // Try to find a Mercado Pago URL in the response
        const mpUrlRegex = /(https?:\/\/[^\s"]+mercadopago[^\s"]+)/;
        const urlMatch = typeof response === 'string' ? response.match(mpUrlRegex) : null;
        
        if (urlMatch && urlMatch[0]) {
          const mpUrl = urlMatch[0];
          
          // Show a success message
          this.snackBar.open('Reserva procesada. Redirigiendo a Mercado Pago...', 'Abrir', {
            duration: 10000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          }).onAction().subscribe(() => {
            this.openMercadoPagoUrl(mpUrl);
          });
          
          // Try to open the URL automatically
          setTimeout(() => {
            this.openMercadoPagoUrl(mpUrl);
          }, 500);
          
          this.dialogRef.close(true);
        } else {
          console.warn('No Mercado Pago URL found in response');
          
          // Check if the response itself is a URL
          if (typeof response === 'string' && response.trim().startsWith('http')) {
            const mpUrl = response.trim();
            
            this.snackBar.open('Reserva procesada. Redirigiendo a Mercado Pago...', 'Abrir', {
              duration: 10000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            }).onAction().subscribe(() => {
              this.openMercadoPagoUrl(mpUrl);
            });
            
            // Try to open the URL automatically
            setTimeout(() => {
              this.openMercadoPagoUrl(mpUrl);
            }, 500);
            
            this.dialogRef.close(true);
          } else {
            this.snackBar.open('Reserva creada con éxito', 'Cerrar', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            });
            this.dialogRef.close(true);
          }
        }
      },
      error: (error: unknown) => {
        this.isLoading = false;
        console.error('Error al crear la reserva', error);
        
        // Extract error message
        let errorMessage = 'Error al crear la reserva';
        let errorResponse = '';
        
        if (error instanceof Error) {
          errorMessage = error.message;
          errorResponse = error.message;
        } else if (typeof error === 'object' && error !== null) {
          try {
            errorResponse = JSON.stringify(error);
          } catch (e) {
            errorResponse = String(error);
          }
        } else if (typeof error === 'string') {
          errorResponse = error;
        }
        
        
        // Check if error response contains a URL to Mercado Pago
        const mpUrlRegex = /(https?:\/\/[^\s"]+mercadopago[^\s"]+)/;
        const urlMatch = typeof errorResponse === 'string' ? errorResponse.match(mpUrlRegex) : null;
        
        if (urlMatch && urlMatch[0]) {
          const mpUrl = urlMatch[0];
          
          this.snackBar.open('Reserva procesada. Haga clic para ir a Mercado Pago', 'Ir a Pagar', {
            duration: 15000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          }).onAction().subscribe(() => {
            this.openMercadoPagoUrl(mpUrl);
          });
          
          // Try to open the URL automatically
          setTimeout(() => {
            this.openMercadoPagoUrl(mpUrl);
          }, 500);
          
          this.dialogRef.close(true);
          return;
        }
        
        this.snackBar.open(errorMessage, 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }
  
  // Helper method to open Mercado Pago URL in multiple ways
  private openMercadoPagoUrl(url: string): void {
    
    // Verificar que la URL es válida
    if (!url || !url.startsWith('http')) {
      console.error('URL de Mercado Pago inválida:', url);
      this.snackBar.open('Error al obtener la URL de pago. Intente nuevamente.', 'Cerrar', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      return;
    }
    
    // Mostrar mensaje de pago
    this.showPaymentDialog(url);
  }
  
  // Mostrar diálogo con instrucciones claras sobre el pago
  private showPaymentDialog(url: string): void {
    // Cerrar el diálogo de reserva
    this.dialogRef.close();
    
    // Mostrar un mensaje y abrir Mercado Pago
    this.snackBar.open(
      'Redireccionando a Mercado Pago para realizar el pago...', 
      'Continuar', 
      {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['payment-snackbar']
      }
    ).onAction().subscribe(() => {
      this.openPaymentWindow(url);
    });
    
    // Abrir automáticamente la ventana de pago
    setTimeout(() => {
      this.openPaymentWindow(url);
    }, 500);
  }
  
  // Intenta abrir la ventana de pago de varias maneras
  private openPaymentWindow(url: string): void {
    try {
      // Abrir directamente en una nueva pestaña
      window.open(url, '_blank');
    } catch (e) {
      console.error('Error al abrir la URL de pago:', e);
      this.snackBar.open(
        'No se pudo abrir la página de pago. Haz clic aquí para intentar nuevamente', 
        'Intentar de nuevo', 
        {
          duration: 10000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['error-snackbar']
        }
      ).onAction().subscribe(() => {
        window.open(url, '_blank');
      });
    }
  }

  // Generate a unique ID for the booking
  private generateUid(): string {
    // Get user data from localStorage and extract UID
    try {
      const userData = localStorage.getItem('currentUserData');
      if (userData) {
        const user = JSON.parse(userData);
        if (user && user.uid) {
          return user.uid;
        }
      }
      return 'bk-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
    } catch (error) {
      console.error('Error retrieving UID from localStorage:', error);
      return 'bk-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // Método para obtener el rango de fechas para reservas mensuales
  getMonthDateRange(): string {
    if (!this.reservationForm.valid) {
      return 'Fechas no disponibles';
    }

    const startDate = this.reservationForm.get('startDate')?.value as Date;
    if (!startDate) {
      return 'Fecha no seleccionada';
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(endDate.getDate() - 1); // Restar un día para obtener fin de mes

    return `${this.formatDisplayDate(startDate)} - ${this.formatDisplayDate(endDate)}`;
  }

  // Formatear fecha para mostrar
  formatDisplayDate(date: Date): string {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Normalize amenities structure
  normalizeAmenities(): void {
    this.space.amenities = this.space.amenities.map((amenity: any) => {
      // Si es un string simple, convertirlo a objeto con estructura adecuada
      if (typeof amenity === 'string') {
        return { name: amenity, price: 0 };
      }
      
      // Si es un objeto pero sin precio, asignar precio por defecto
      if (typeof amenity === 'object' && amenity.name && !amenity.price) {
        return { ...amenity, price: 0 };
      }
      
      // Si es un objeto con price como string, convertir a número
      if (typeof amenity === 'object' && amenity.name && typeof amenity.price === 'string') {
        const numPrice = Number(amenity.price);
        return { ...amenity, price: isNaN(numPrice) ? 0 : numPrice };
      }
      
      return amenity;
    });
    
  }
}
