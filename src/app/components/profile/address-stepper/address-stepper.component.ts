import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Address, City, Country } from '../../../models/address.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfileService } from '../../../services/profile/profile.service';

@Component({
  selector: 'app-address-stepper',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './address-stepper.component.html',
  styleUrls: ['./address-stepper.component.scss']
})
export class AddressStepperComponent implements OnInit {
  @Input() initialData?: Address;
  @Output() addressSaved = new EventEmitter<Address>();

  addressForm!: FormGroup;
  currentStep = 0;
  isLoading = false;
  submitted = false;

  // Datos mock para los selects
  countries: Country[] = [
    { id: 1, name: 'Argentina' },
    { id: 2, name: 'Brasil' },
    { id: 3, name: 'Chile' },
    { id: 4, name: 'Colombia' },
    { id: 5, name: 'México' },
    { id: 6, name: 'Perú' },
    { id: 7, name: 'Uruguay' }
  ];

  cities: City[] = [
    { id: 1, name: 'Buenos Aires', divisionName: 'Buenos Aires', divisionType: 'PROVINCE', country: this.countries[0] },
    { id: 2, name: 'Córdoba', divisionName: 'Córdoba', divisionType: 'PROVINCE', country: this.countries[0] },
    { id: 3, name: 'Rosario', divisionName: 'Santa Fe', divisionType: 'PROVINCE', country: this.countries[0] },
    { id: 4, name: 'São Paulo', divisionName: 'São Paulo', divisionType: 'STATE', country: this.countries[1] },
    { id: 5, name: 'Rio de Janeiro', divisionName: 'Rio de Janeiro', divisionType: 'STATE', country: this.countries[1] },
    { id: 6, name: 'Santiago', divisionName: 'Santiago', divisionType: 'REGION', country: this.countries[2] },
    { id: 7, name: 'Bogotá', divisionName: 'Cundinamarca', divisionType: 'DEPARTMENT', country: this.countries[3] },
    { id: 8, name: 'Ciudad de México', divisionName: 'CDMX', divisionType: 'STATE', country: this.countries[4] },
    { id: 9, name: 'Lima', divisionName: 'Lima', divisionType: 'DEPARTMENT', country: this.countries[5] },
    { id: 10, name: 'Montevideo', divisionName: 'Montevideo', divisionType: 'DEPARTMENT', country: this.countries[6] }
  ];

  filteredCities: City[] = [];
  
  // Pasos del stepper
  steps = [
    { title: 'País y ciudad', description: 'Selecciona tu ubicación' },
    { title: 'Dirección', description: 'Completa los datos de tu dirección' }
  ];

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.updateCityOptions();

    // Si hay datos iniciales, asignarlos al formulario
    if (this.initialData) {
      this.addressForm.patchValue({
        countryId: this.initialData.city.country.id,
        cityId: this.initialData.city.id,
        streetName: this.initialData.streetName,
        streetNumber: this.initialData.streetNumber,
        floor: this.initialData.floor || '',
        apartment: this.initialData.apartment || '',
        postalCode: this.initialData.postalCode
      });
      this.updateCityOptions();
    }
  }

  private initForm(): void {
    this.addressForm = this.fb.group({
      countryId: ['', Validators.required],
      cityId: ['', Validators.required],
      streetName: ['', Validators.required],
      streetNumber: ['', Validators.required],
      floor: [''],
      apartment: [''],
      postalCode: ['', Validators.required]
    });

    // Actualizar las ciudades cuando cambia el país
    this.addressForm.get('countryId')?.valueChanges.subscribe(countryId => {
      this.updateCityOptions(countryId);
      this.addressForm.get('cityId')?.setValue('');
    });
  }

  updateCityOptions(countryId?: number): void {
    if (!countryId) {
      countryId = this.addressForm.get('countryId')?.value;
    }
    this.filteredCities = this.cities.filter(city => city.country.id === countryId);
  }

  nextStep(): void {
    if (this.currentStep === 0) {
      // Validar el primer paso
      if (this.addressForm.get('countryId')?.invalid || this.addressForm.get('cityId')?.invalid) {
        this.markFormGroupTouched(this.addressForm);
        return;
      }
    }
    
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  onSubmit(): void {
    this.submitted = true;
    
    if (this.addressForm.invalid) {
      this.markFormGroupTouched(this.addressForm);
      return;
    }
    
    this.isLoading = true;
    
    // Buscar los objetos completos de país y ciudad
    const countryId = this.addressForm.get('countryId')?.value;
    const cityId = this.addressForm.get('cityId')?.value;
    
    const selectedCountry = this.countries.find(c => c.id === countryId);
    const selectedCity = this.cities.find(c => c.id === cityId);
    
    if (!selectedCountry || !selectedCity) {
      this.snackBar.open('Error al obtener la información de ubicación', 'Cerrar', {
        duration: 3000
      });
      this.isLoading = false;
      return;
    }
    
    // Construir objeto de dirección
    const address: Address = {
      streetName: this.addressForm.get('streetName')?.value,
      streetNumber: this.addressForm.get('streetNumber')?.value,
      floor: this.addressForm.get('floor')?.value,
      apartment: this.addressForm.get('apartment')?.value,
      postalCode: this.addressForm.get('postalCode')?.value,
      city: selectedCity
    };
    
    // Guardar la dirección usando el servicio
    this.profileService.saveAddress(address).subscribe({
      next: (savedAddress) => {
        this.isLoading = false;
        this.addressSaved.emit(savedAddress);
        this.snackBar.open('Dirección guardada correctamente', 'OK', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error al guardar dirección:', error);
        this.isLoading = false;
        this.snackBar.open('Error al guardar la dirección. Intenta nuevamente.', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.addressForm.get(fieldName);
    return (field?.invalid && (field?.touched || this.submitted)) || false;
  }
} 