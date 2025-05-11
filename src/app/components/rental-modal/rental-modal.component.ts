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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth-service/auth.service';
import { MatIconModule } from '@angular/material/icon';

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
    MatProgressSpinnerModule,
    MatIconModule
  ],
  standalone: true
})
export class RentalModalComponent implements OnInit {
  rentalForm: FormGroup;
  loading = false;
  minDate = new Date();
  maxDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1));
  selectedAmenities: string[] = [];
  amenityPrices: { [key: string]: number } = {};

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

  getAmenitiesPrice(): number {
    return this.selectedAmenities.reduce((acc, name) => acc + (this.amenityPrices[name] || 0), 0);
  }

  getTotalInicial(): number {
    const deposito = this.data.monthlyAmount || 0;
    const mensualidad = this.data.monthlyAmount || 0;
    const amenities = this.getAmenitiesPrice();
    return deposito + mensualidad + amenities;
  }

  onSubmit(): void {
    if (this.rentalForm.valid) {
      this.loading = true;
      this.authService.getCurrentUser().subscribe(user => {
        if (!user) {
          this.loading = false;
          this.snackBar.open('Usuario no encontrado', 'Cerrar', { duration: 3000 });
          return;
        }

        const contractData = {
          spaceId: this.data.spaceId,
          uid: user.uid,
          startDate: this.rentalForm.get('startDate')?.value,
          durationMonths: this.rentalForm.get('durationMonths')?.value,
          monthlyAmount: this.data.monthlyAmount,
          depositAmount: this.rentalForm.get('depositAmount')?.value
        };

        this.rentalService.createRentalContract(contractData).subscribe({
          next: (paymentUrl) => {
            this.loading = false;
            window.location.href = paymentUrl;
            this.dialogRef.close();
          },
          error: (error) => {
            this.loading = false;
            this.snackBar.open('Error al crear el contrato de alquiler', 'Cerrar', {
              duration: 3000
            });
          }
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