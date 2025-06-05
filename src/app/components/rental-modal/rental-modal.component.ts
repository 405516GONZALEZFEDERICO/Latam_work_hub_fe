import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { RentalContractResponse, RentalService } from '../../services/rental/rental.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth-service/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-rental-modal',
  templateUrl: './rental-modal.component.html',
  styleUrls: ['./rental-modal.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  standalone: true
})
export class RentalModalComponent implements OnInit {
  rentalForm: FormGroup;
  minDate = new Date();
  maxDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1));
  selectedAmenities: string[] = [];
  amenityPrices: { [key: string]: number } = {};
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private rentalService: RentalService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<RentalModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { spaceId: number, monthlyAmount: number }
  ) {
    this.rentalForm = this.fb.group({
      startDate: ['', Validators.required],
      durationMonths: [1, [Validators.required, Validators.min(1), Validators.max(12)]],
      depositAmount: [this.data.monthlyAmount, Validators.required]
    });
  }

  ngOnInit(): void {
    if ((this.data as any).amenities) {
      this.initAmenities((this.data as any).amenities);
    }
    this.rentalForm.get('depositAmount')?.setValue(this.data.monthlyAmount);
    this.rentalForm.get('depositAmount')?.disable();
    this.rentalForm.valueChanges.subscribe(() => {
      this.getTotalInicial();
    });
  }

  initAmenities(amenities: any[]): void {
    this.selectedAmenities = amenities.map(a => a.name);
    amenities.forEach(a => {
      let price = a.price;
      if (typeof price === 'string') price = parseFloat(price);
      this.amenityPrices[a.name] = isNaN(price) ? 0 : price;
    });
  }

  hasAmenities(): boolean {
    return (this.data as any).amenities && (this.data as any).amenities.length > 0;
  }

  getAmenities(): any[] {
    return (this.data as any).amenities || [];
  }

  toggleAmenity(amenityName: string): void {
    const idx = this.selectedAmenities.indexOf(amenityName);
    if (idx > -1) {
      this.selectedAmenities.splice(idx, 1);
    } else {
      this.selectedAmenities.push(amenityName);
    }
    this.getTotalInicial();
  }

  isAmenitySelected(amenityName: string): boolean {
    return this.selectedAmenities.includes(amenityName);
  }

  getAmenityIcon(amenityName: string): string {
    const iconMap: { [key: string]: string } = {
      'WiFi': 'wifi',
      'WiFi de alta velocidad': 'wifi',
      'Internet': 'wifi',
      'Aire acondicionado': 'ac_unit',
      'Climatización': 'ac_unit',
      'Calefacción': 'heating',
      'Proyector': 'videocam',
      'Pantalla': 'tv',
      'Televisor': 'tv',
      'TV': 'tv',
      'Sonido': 'volume_up',
      'Audio': 'volume_up',
      'Estacionamiento': 'local_parking',
      'Parking': 'local_parking',
      'Café': 'local_cafe',
      'Cocina': 'kitchen',
      'Refrigerador': 'kitchen',
      'Microondas': 'microwave',
      'Seguridad': 'security',
      'Acceso 24/7': 'access_time',
      'Limpieza': 'cleaning_services',
      'Papelería': 'description',
      'Impresora': 'print',
      'Escritorio': 'desk',
      'Sillas': 'chair',
      'Mesa': 'table_restaurant',
      'Pizarra': 'dashboard',
      'Whiteboard': 'dashboard'
    };
    
    // Buscar coincidencia exacta primero
    if (iconMap[amenityName]) {
      return iconMap[amenityName];
    }
    
    // Buscar coincidencia parcial (case insensitive)
    const lowerAmenityName = amenityName.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerAmenityName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerAmenityName)) {
        return icon;
      }
    }
    
    // Icono por defecto
    return 'add_circle';
  }

  getAmenitiesPrice(): number {
    return this.selectedAmenities.reduce((acc, name) => acc + (this.amenityPrices[name] || 0), 0);
  }

  getTotalInicial(): number {
    const primerMes = this.data.monthlyAmount || 0;
    const amenities = this.getAmenitiesPrice();
    const deposit = this.rentalForm.get('depositAmount')?.value || 0;
    const total = primerMes + amenities + deposit;
    
    console.log('=== CÁLCULO DE TOTAL INICIAL ===');
    console.log('Primera mensualidad:', primerMes);
    console.log('Amenidades:', amenities);
    console.log('Depósito:', deposit);
    console.log('TOTAL INICIAL (con depósito):', total);
    console.log('================================');
    
    return total;
  }

  onSubmit(): void {
    if (this.rentalForm.valid) {
      // Prevent multiple submissions
      if (this.isLoading) {
        return;
      }

      // Agregar delay con spinner para evitar múltiples clicks
      this.isLoading = true;
      
      this.snackBar.open('Preparando alquiler...', '', {
        duration: 1500,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });

      // Delay de 1500ms antes de procesar
      setTimeout(() => {
        this.processRental();
      }, 1500);
    }
  }

  private processRental(): void {
    this.authService.getCurrentUser().subscribe(user => {
      if (!user) {
        this.isLoading = false;
        this.snackBar.open('Usuario no encontrado', '', { duration: 3000 });
        return;
      }

      const totalAmount = this.getTotalInicial();
      const amenitiesPrice = this.getAmenitiesPrice();

      const contractData = {
        spaceId: this.data.spaceId,
        uid: user.uid,
        startDate: this.rentalForm.get('startDate')?.value,
        durationMonths: this.rentalForm.get('durationMonths')?.value,
        monthlyAmount: this.data.monthlyAmount,
        depositAmount: this.rentalForm.get('depositAmount')?.value,
        selectedAmenities: this.selectedAmenities,
        amenitiesPrice: amenitiesPrice,
        totalInitialAmount: totalAmount
      };

      console.log('=== DATOS DEL CONTRATO A ENVIAR ===');
      console.log('Space ID:', contractData.spaceId);
      // Datos del contrato preparados
      console.log('Start Date:', contractData.startDate);
      console.log('Duration Months:', contractData.durationMonths);
      console.log('Monthly Amount:', contractData.monthlyAmount);
      console.log('Deposit Amount:', contractData.depositAmount);
      console.log('Selected Amenities:', contractData.selectedAmenities);
      console.log('Amenities Price:', contractData.amenitiesPrice);
      console.log('TOTAL INITIAL AMOUNT:', contractData.totalInitialAmount);
      console.log('===================================');

      this.snackBar.open('Procesando alquiler...', '', {
        duration: 1500,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });

      console.log('Enviando petición al backend...');

      this.rentalService.createRentalContract(contractData).subscribe({
        next: (paymentUrl) => {
          this.isLoading = false;
          
          console.log('Respuesta del servidor (rental):', paymentUrl);
          console.log('Tipo de respuesta:', typeof paymentUrl);
          
          // Check if we received a valid payment URL
          if (paymentUrl && typeof paymentUrl === 'string' && paymentUrl.trim() !== '') {
            const cleanUrl = paymentUrl.trim();
            console.log('URL limpia recibida:', cleanUrl);
            
            // Show success message
            this.snackBar.open('Alquiler procesado. Redirigiendo a Mercado Pago...', '', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            });
            
            // Open Mercado Pago in a new tab instead of redirecting current window
            setTimeout(() => {
              this.openMercadoPagoUrl(cleanUrl);
            }, 500);
            
            this.dialogRef.close(true);
            return;
          }
          
          // Try to find URL in the response object if it's not a string
          let foundUrl = null;
          if (typeof paymentUrl === 'object' && paymentUrl !== null) {
            console.log('Buscando URL en objeto de respuesta:', paymentUrl);
            
            // Common property names for payment URLs
            const possibleUrlKeys = ['paymentUrl', 'url', 'redirectUrl', 'checkoutUrl', 'mercadoPagoUrl'];
            for (const key of possibleUrlKeys) {
              const urlValue = (paymentUrl as any)[key];
              if (urlValue && typeof urlValue === 'string' && urlValue.trim() !== '') {
                foundUrl = urlValue.trim();
                console.log(`URL encontrada en propiedad '${key}':`, foundUrl);
                break;
              }
            }
          }
          
          if (foundUrl) {
            this.snackBar.open('Alquiler procesado. Redirigiendo a Mercado Pago...', '', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            });
            
            setTimeout(() => {
              this.openMercadoPagoUrl(foundUrl);
            }, 500);
            
            this.dialogRef.close(true);
            return;
          }
          
          // If no URL found, show success without redirect
          console.warn('No se encontró URL de pago en la respuesta');
          this.snackBar.open('Alquiler creado exitosamente', '', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
          this.dialogRef.close(true);
        },
        error: (error: any) => {
          this.isLoading = false;
          
          // Check if error response contains a URL to Mercado Pago
          const errorResponse = JSON.stringify(error);
          const mpUrlRegex = /(https?:\/\/[^\s"]+mercadopago[^\s"]+)/;
          const urlMatch = errorResponse.match(mpUrlRegex);
          
          if (urlMatch && urlMatch[0]) {
            const mpUrl = urlMatch[0];
            
            this.snackBar.open('Alquiler procesado. Redirigiendo a Mercado Pago...', '', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            });
            
            this.openMercadoPagoUrl(mpUrl);
            this.dialogRef.close(true);
            return;
          }
          
          // Extract only the backend error message
          let errorMessage = 'Error al crear el contrato de alquiler';
          
          try {
            // Intentar extraer el mensaje de diferentes ubicaciones
            if (error?.error && typeof error.error === 'string') {
              // Parse the JSON string
              const parsedError = JSON.parse(error.error);
              if (parsedError?.message) {
                errorMessage = parsedError.message;
                console.log('Rental usando parsedError.message:', errorMessage);
              } else if (parsedError?.error) {
                errorMessage = parsedError.error;
                console.log('Rental usando parsedError.error:', errorMessage);
              }
            } else if (error?.error?.message && typeof error.error.message === 'string') {
              errorMessage = error.error.message;
              console.log('Rental usando error.error.message:', errorMessage);
            } else if (error?.message && typeof error.message === 'string') {
              errorMessage = error.message;
              console.log('Rental usando error.message:', errorMessage);
            } else if (typeof error === 'string') {
              errorMessage = error;
              console.log('Rental usando error directo:', errorMessage);
            }
          } catch (parseError) {
            console.warn('Rental error parsing JSON:', parseError);
            // Fallback to original logic if JSON parsing fails
            if (error?.message && typeof error.message === 'string') {
              errorMessage = error.message;
            }
          }
          
          console.log('RENTAL MENSAJE FINAL A MOSTRAR:', errorMessage);
          
          // Show only the clean error message
          this.snackBar.open(errorMessage, 'Cerrar', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
          });
        }
      });
    });
  }

  // Helper method to open Mercado Pago URL in a new tab
  private openMercadoPagoUrl(url: string): void {
    console.log('Intentando abrir URL de Mercado Pago:', url);
    
    // Verificar que la URL es válida
    if (!url || typeof url !== 'string') {
      console.error('URL de Mercado Pago es null, undefined o no es string:', url);
      this.snackBar.open('Error: URL de pago inválida. Intente nuevamente.', '', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      return;
    }
    
    const cleanUrl = url.trim();
    
    if (!cleanUrl.startsWith('http')) {
      console.error('URL de Mercado Pago no comienza con http:', cleanUrl);
      this.snackBar.open('Error: Formato de URL de pago inválido. Intente nuevamente.', '', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      return;
    }
    
    try {
      console.log('Abriendo nueva pestaña con URL:', cleanUrl);
      const newWindow = window.open(cleanUrl, '_blank', 'noopener,noreferrer');
      
      if (!newWindow) {
        console.error('window.open retornó null - posible bloqueo de popup');
        this.snackBar.open(
          'No se pudo abrir la página de pago. Verifique que los pop-ups estén habilitados e intente nuevamente.', 
          'Reintentar', 
          {
            duration: 8000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
          }
        ).onAction().subscribe(() => {
          // Retry on action click
          this.openMercadoPagoUrl(url);
        });
      } else {
        console.log('Nueva pestaña abierta exitosamente');
        // Verificar si la ventana se cerró inmediatamente (puede indicar bloqueo)
        setTimeout(() => {
          if (newWindow.closed) {
            console.warn('La nueva ventana fue cerrada inmediatamente');
          }
        }, 1000);
      }
    } catch (e) {
      console.error('Error al abrir la URL de pago:', e);
      this.snackBar.open(
        'No se pudo abrir la página de pago. Intente nuevamente o use otro navegador.', 
        'Copiar URL', 
        {
          duration: 8000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['error-snackbar']
        }
      ).onAction().subscribe(() => {
        // Copy URL to clipboard on action click
        navigator.clipboard.writeText(cleanUrl).then(() => {
          this.snackBar.open('URL copiada al portapapeles', '', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
        }).catch(() => {
          console.log('URL para copiar manualmente:', cleanUrl);
        });
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  isContractActionable(rental: RentalContractResponse): boolean {
    if (!rental) {
      console.log('isContractActionable: rental is null or undefined');
      return false;
    }
    const isActionable = this.isActiveStatus(rental.status);
    console.log(`isContractActionable: ${rental.id} -> ${isActionable} (status: ${rental.status})`);
    return isActionable;
  }

  isActiveStatus(status: string): boolean {
    const isActive = status === 'ACTIVE' || status === 'ACTIVO';
    console.log(`isActiveStatus: ${status} -> ${isActive}`);
    return isActive;
  }
} 