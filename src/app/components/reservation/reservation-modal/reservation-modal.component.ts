import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
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
  PER_HOUR = 'PER_HOUR',
  PER_DAY = 'PER_DAY',
  PER_MONTH = 'PER_MONTH'
}

// Validador personalizado para verificar que la hora de inicio no sea anterior a la hora actual cuando es el día actual
export function startTimeValidator(minDate: Date): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const form = control.parent;
    if (!form) return null;
    
    const startDate = form.get('startDate')?.value as Date;
    const startTime = form.get('startTime')?.value;
    
    if (!startDate || !startTime) return null;
    
    // Verificar si es hoy
    const today = new Date();
    const isToday = startDate.getDate() === today.getDate() && 
                    startDate.getMonth() === today.getMonth() && 
                    startDate.getFullYear() === today.getFullYear();
    
    if (isToday) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const selectedTime = new Date();
      selectedTime.setHours(hours, minutes, 0, 0);
      
      const now = new Date();
      now.setSeconds(0, 0); // Ignorar segundos para la comparación
      
      if (selectedTime < now) {
        return { pastTime: true };
      }
    }
    
    return null;
  };
}

// Validador personalizado para verificar que la hora de fin sea posterior a la hora de inicio
export function endTimeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const form = control.parent;
    if (!form) return null;
    
    const startTime = form.get('startTime')?.value;
    const endTime = form.get('endTime')?.value;
    
    if (!startTime || !endTime) return null;
    
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    if (endHours < startHours || (endHours === startHours && endMinutes <= startMinutes)) {
      return { endBeforeStart: true };
    }
    
    return null;
  };
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
  reservationPeriod: ReservationPeriod = ReservationPeriod.PER_HOUR; // Default to hourly
  isLoading = false; // Track loading state
  
  // Map for reservation type labels
  private reservationTypeLabels = {
    [ReservationPeriod.PER_HOUR]: 'Por hora',
    [ReservationPeriod.PER_DAY]: 'Por día',
    [ReservationPeriod.PER_MONTH]: 'Por mes'
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
    
    // Obtener hora actual con formato HH:MM
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    
    // Calcular hora de fin por defecto (2 horas después)
    let endHour = now.getHours() + 2;
    const endTime = endHour > 23 
      ? '23:59' 
      : `${endHour.toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Initialize form con validadores personalizados
    this.reservationForm = this.fb.group({
      startDate: [new Date(), Validators.required],
      reservationType: [ReservationPeriod.PER_HOUR, Validators.required],
      startTime: [currentTime, [
        Validators.required, 
        Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        startTimeValidator(this.minDate)
      ]],
      endTime: [endTime, [
        Validators.required, 
        Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        endTimeValidator()
      ]],
      numberOfPeople: [1, [Validators.required, Validators.min(1), Validators.max(this.space.capacity || 10)]],
    });
  }

  ngOnInit(): void {
    // Calculate initial price
    this.calculatePrice();
    
    // Update price when form values change
    this.reservationForm.valueChanges.subscribe(() => {
      this.calculatePrice();
      
      // Validar hora de inicio cuando cambia la fecha o la hora
      if (this.showTimeFields()) {
        this.validateStartTime();
      }
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
    const reservationType = this.reservationForm.get('reservationType')?.value;
    
    // Normalizar el tipo para manejar tanto los valores del enum como posibles valores del backend
    const normalizedType = this.normalizeBookingType(reservationType);
    
    return this.reservationTypeLabels[normalizedType] || 'Desconocido';
  }

  // Method to handle reservation type changes
  onReservationTypeChange(): void {
    const type = this.reservationForm.get('reservationType')?.value;
    this.reservationPeriod = this.normalizeBookingType(type);
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
    return this.reservationForm.get('reservationType')?.value === ReservationPeriod.PER_HOUR;
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
      case ReservationPeriod.PER_HOUR:
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
        
      case ReservationPeriod.PER_DAY:
        const dailyPrice = this.getDailyPrice();
        return dailyPrice;
        
      case ReservationPeriod.PER_MONTH:
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
    // Validar el formulario
    this.validateStartTime();
    
    if (this.reservationForm.invalid) {
      // Mostrar mensaje de error y marcar controles como tocados para mostrar errores
      this.snackBar.open('Por favor, completa todos los campos correctamente', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      
      // Marcar todos los controles del formulario como touched para mostrar errores
      Object.keys(this.reservationForm.controls).forEach(key => {
        const control = this.reservationForm.get(key);
        control?.markAsTouched();
        control?.updateValueAndValidity();
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
      case ReservationPeriod.PER_HOUR:
        // For hourly reservations, include both date, times and hour fields
        startDateTime = `${formattedDate}T${this.formatTimeForBackend(formValues.startTime)}`;
        endDateTime = `${formattedDate}T${this.formatTimeForBackend(formValues.endTime)}`;
        initHour = this.formatTimeForBackend(formValues.startTime);
        endHour = this.formatTimeForBackend(formValues.endTime);
        break;
        
      case ReservationPeriod.PER_DAY:
        // For daily reservations, include ONLY startDate (no endDate as per backend logic)
        startDateTime = `${formattedDate}T00:00:00`;
        // Do not set endDateTime for PER_DAY reservations
        break;
        
      case ReservationPeriod.PER_MONTH:
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
      totalAmount: this.totalPrice,
      bookingType: reservationType // Ya está correcto porque usamos los valores PER_HOUR, PER_DAY, PER_MONTH
    };
    
    // Only include endDate for HOUR and MONTH reservation types
    if (endDateTime) {
      bookingDto.endDate = endDateTime;
    }
    
    // Only include initHour and endHour for hourly reservations
    if (reservationType === ReservationPeriod.PER_HOUR) {
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

  // Validar la hora de inicio basada en la fecha seleccionada
  validateStartTime(): void {
    const startDateControl = this.reservationForm.get('startDate');
    const startTimeControl = this.reservationForm.get('startTime');
    const endTimeControl = this.reservationForm.get('endTime');
    
    if (!startDateControl || !startTimeControl || !endTimeControl) return;
    
    const startDate = startDateControl.value as Date;
    const startTime = startTimeControl.value;
    
    if (!startDate || !startTime) return;
    
    // Verificar si es hoy
    const today = new Date();
    const isToday = startDate.getDate() === today.getDate() && 
                    startDate.getMonth() === today.getMonth() && 
                    startDate.getFullYear() === today.getFullYear();
    
    if (isToday) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const selectedTime = new Date();
      selectedTime.setHours(hours, minutes, 0, 0);
      
      const now = new Date();
      
      if (selectedTime < now) {
        // Establecer la hora de inicio a la hora actual
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;
        
        startTimeControl.setValue(currentTime);
        
        // Ajustar la hora de fin si es necesario (asegurar que sea al menos 1 hora después)
        const endTime = endTimeControl.value;
        if (endTime) {
          const [endHours, endMinutes] = endTime.split(':').map(Number);
          const endSelectedTime = new Date();
          endSelectedTime.setHours(endHours, endMinutes, 0, 0);
          
          const minEndTime = new Date(selectedTime);
          minEndTime.setHours(minEndTime.getHours() + 1);
          
          if (endSelectedTime <= minEndTime) {
            const newEndHour = (minEndTime.getHours()).toString().padStart(2, '0');
            const newEndMinute = minEndTime.getMinutes().toString().padStart(2, '0');
            endTimeControl.setValue(`${newEndHour}:${newEndMinute}`);
          }
        }
      }
    }
    
    // Volver a validar el formulario
    startTimeControl.updateValueAndValidity();
    endTimeControl.updateValueAndValidity();
  }

  // Normalizar el tipo de reserva para manejar diferentes formatos
  normalizeBookingType(type: string): ReservationPeriod {
    if (!type) {
      return ReservationPeriod.PER_HOUR; // Valor por defecto
    }
    
    // Convertir a mayúsculas y eliminar espacios
    const typeString = type.toUpperCase().replace(/\s+/g, '_');
    
    // Verificar posibles valores y devolver el enum correspondiente
    if (typeString === 'PER_HOUR' || typeString === 'HOUR') {
      return ReservationPeriod.PER_HOUR;
    } else if (typeString === 'PER_DAY' || typeString === 'DAY') {
      return ReservationPeriod.PER_DAY;
    } else if (typeString === 'PER_MONTH' || typeString === 'MONTH') {
      return ReservationPeriod.PER_MONTH;
    }
    
    // Si no coincide con ninguno, devolver el valor por defecto
    console.warn(`Tipo de reserva desconocido: ${type}, usando PER_HOUR como valor por defecto`);
    return ReservationPeriod.PER_HOUR;
  }
}
