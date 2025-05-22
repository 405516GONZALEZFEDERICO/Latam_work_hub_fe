import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Address } from '../../../models/address.model';
import { AddressService } from '../../../services/address/address.service';
import { City, DivisionType } from '../../../models/city.model';
import { Country } from '../../../models/country.model';
import { finalize } from 'rxjs/operators';
import { numberOnlyValidator, textOnlyValidator } from '../personal-data-form/personal-data-form.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Custom validator for apartment letters (A, B, C, etc.)
export function apartmentLetterValidator() {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Empty value is valid
    }
    
    // Allow only letters (A-Z, a-z)
    const isValid = /^[a-zA-Z]+$/.test(control.value);
    return isValid ? null : { apartmentFormat: true };
  };
}

@Component({
  selector: 'app-address-stepper',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatSnackBarModule
  ],
  templateUrl: './address-stepper.component.html',
  styleUrls: ['./address-stepper.component.css'],
  host: {
    '[class.step-0]': 'currentStep === 0',
    '[class.step-1]': 'currentStep === 1'
  }
})
export class AddressStepperComponent implements OnInit, OnChanges {
  @Output() addressSaved = new EventEmitter<Address>();
  @Output() cancelled = new EventEmitter<void>();
  @Input() isLoading = false;
  @Input() userId?: string; // UID del usuario para guardar la dirección
  @Input() existingAddress?: Address; // Dirección existente para editar
  @Input() isEditMode = false; // Modo de edición
  
  addressForm!: FormGroup;
  currentStep = 0;
  
  // Propiedad para almacenar los datos de dirección actuales
  currentAddressData: Partial<Address> = {};
  
  steps = [
    { title: 'País y Ciudad', description: 'Selecciona tu país y ciudad' },
    { title: 'Dirección', description: 'Completa los detalles de tu dirección' }
  ];
  
  divisionTypes = [
    { value: 'PROVINCE', label: 'Provincia' },
    { value: 'STATE', label: 'Estado' },
    { value: 'DEPARTMENT', label: 'Departamento' },
    { value: 'REGION', label: 'Región' }
  ];
  
  // Datos que ahora vendrán del backend
  countries: Country[] = [];
  filteredCities: City[] = [];
  showCustomCity = false;
  loadingCountries = false;
  loadingCities = false;
  
  constructor(
    private fb: FormBuilder,
    private addressService: AddressService,
    private snackBar: MatSnackBar
  ) {}
  
  ngOnInit(): void {
    this.initForm();
    this.loadCountries();
    this.setupFormListeners();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    // Si cambia la dirección existente, actualizar el formulario
    if (changes['existingAddress'] && this.existingAddress && this.addressForm) {
      this.populateFormWithExistingAddress();
    }
  }
  
  // Método para llenar el formulario con la dirección existente
  populateFormWithExistingAddress(): void {
    if (!this.existingAddress) return;
    
    this.currentAddressData = { ...this.existingAddress };
    
    // Rellenar el formulario con los datos existentes
    this.addressForm.patchValue({
      countryId: this.existingAddress.city.country.id,
      streetName: this.existingAddress.streetName,
      streetNumber: this.existingAddress.streetNumber,
      floor: this.existingAddress.floor || '',
      apartment: this.existingAddress.apartment || '',
      postalCode: this.existingAddress.postalCode
    });
    
    // Cargar las ciudades del país seleccionado
    this.loadCitiesByCountry(this.existingAddress.city.country.id);
    
    // Una vez que las ciudades se hayan cargado, seleccionamos la ciudad correcta
    setTimeout(() => {
      // Buscar la ciudad en la lista de ciudades filtradas
      const cityExists = this.filteredCities.some(city => city.id === this.existingAddress?.city.id);
      
      if (cityExists) {
        // Si la ciudad existe en el backend, la seleccionamos
        this.addressForm.patchValue({
          cityId: this.existingAddress?.city.id
        });
      } else {
        // Si la ciudad no existe, activamos el modo de ciudad personalizada
        this.showCustomCity = true;
        this.addressForm.patchValue({
          cityId: 'custom',
          customCityName: this.existingAddress?.city.name,
          customDivisionName: this.existingAddress?.city.divisionName,
          customDivisionType: this.existingAddress?.city.divisionType
        });
      }
    }, 500); // Damos tiempo para que las ciudades se carguen
  }
  
  initForm(): void {
    this.addressForm = this.fb.group({
      countryId: ['', Validators.required],
      cityId: ['', Validators.required],
      streetName: ['', [Validators.required, textOnlyValidator()]],
      streetNumber: ['', [Validators.required, numberOnlyValidator()]],
      floor: ['', numberOnlyValidator()],
      apartment: ['', apartmentLetterValidator()],
      postalCode: ['', [Validators.required, numberOnlyValidator()]],
      // Campos para ciudad personalizada
      customCityName: ['', textOnlyValidator()],
      customDivisionName: ['', textOnlyValidator()],
      customDivisionType: ['']
    }, { updateOn: 'change' });
    
    // Forzar la validación inmediata al marcar los campos como tocados
    this.addressForm.valueChanges.subscribe(() => {
      Object.keys(this.addressForm.controls).forEach(key => {
        const control = this.addressForm.get(key);
        if (control && !control.pristine) {
          control.markAsTouched();
        }
      });
    });
    
    // Si hay una dirección existente, llenar el formulario
    if (this.existingAddress) {
      this.populateFormWithExistingAddress();
    }
  }
  
  // Configurar los listeners del formulario
  setupFormListeners(): void {
    // Escuchar cambios en el país seleccionado para filtrar ciudades
    const countryControl = this.addressForm.get('countryId');
    const cityControl = this.addressForm.get('cityId');
    
    if (countryControl && cityControl) {
      countryControl.valueChanges.subscribe(countryId => {
        if (countryId) {
          // Llamar al endpoint para obtener ciudades por país
          this.loadCitiesByCountry(countryId);
          cityControl.setValue(null);
          
          // Resetear la opción de ciudad personalizada
          this.showCustomCity = false;
          
          // Actualizar los datos de dirección con información del país
          const selectedCountry = this.countries.find(country => country.id === countryId);
          if (selectedCountry) {
            if (!this.currentAddressData.city) {
              this.currentAddressData.city = {
                id: 0, // ID temporal para nuevas ciudades
                name: '',
                divisionName: '',
                divisionType: 'PROVINCE' as DivisionType,
                country: {
                  id: selectedCountry.id,
                  name: selectedCountry.name
                }
              };
            } else {
              this.currentAddressData.city = {
                ...this.currentAddressData.city,
                country: {
                  id: selectedCountry.id,
                  name: selectedCountry.name
                }
              };
            }
          }
        }
      });
      
      // Escuchar cambios en la ciudad seleccionada
      cityControl.valueChanges.subscribe(cityId => {
        if (cityId === 'custom') {
          this.showCustomCity = true;
          return;
        }
        
        this.showCustomCity = false;
        
        if (cityId) {
          const selectedCity = this.filteredCities.find(city => city.id === cityId);
          
          if (selectedCity) {
            if (!this.currentAddressData.city) {
              this.currentAddressData.city = {
                id: selectedCity.id,
                name: selectedCity.name,
                divisionName: selectedCity.divisionName,
                divisionType: selectedCity.divisionType,
                country: selectedCity.country
              };
            } else {
              this.currentAddressData.city = {
                ...this.currentAddressData.city,
                id: selectedCity.id,
                name: selectedCity.name,
                divisionName: selectedCity.divisionName,
                divisionType: selectedCity.divisionType
              };
            }
          }
        }
      });
    }
    
    // Suscribirse a cambios en el formulario para mantener actualizada la dirección
    this.addressForm.valueChanges.subscribe(formValues => {
      // Actualizar información de la calle
      if (formValues.streetName) {
        this.currentAddressData.streetName = formValues.streetName;
      }
      
      if (formValues.streetNumber) {
        this.currentAddressData.streetNumber = formValues.streetNumber;
      }
      
      if (formValues.floor) {
        this.currentAddressData.floor = formValues.floor;
      }
      
      if (formValues.apartment) {
        this.currentAddressData.apartment = formValues.apartment;
      }
      
      if (formValues.postalCode) {
        this.currentAddressData.postalCode = formValues.postalCode;
      }
      
      // Actualizar datos de ciudad personalizada si es necesario
      if (this.showCustomCity) {
        const countryId = formValues.countryId;
        const selectedCountry = this.countries.find(c => c.id === countryId);
        
        if (selectedCountry && formValues.customCityName && formValues.customDivisionName && formValues.customDivisionType) {
          this.currentAddressData.city = {
            id: 0, // ID temporal para nuevas ciudades
            name: formValues.customCityName,
            divisionName: formValues.customDivisionName,
            divisionType: formValues.customDivisionType as DivisionType,
            country: {
              id: selectedCountry.id,
              name: selectedCountry.name
            }
          };
        }
      }
    });
  }
  
  // Cargar países desde el backend
  loadCountries(): void {
    this.loadingCountries = true;
    this.addressService.getAllCountries()
      .pipe(finalize(() => this.loadingCountries = false))
      .subscribe({
        next: (countries) => {
          this.countries = countries;
        },
        error: (error) => {
          console.error('Error al cargar los países', error);
        }
      });
  }
  
  // Cargar ciudades por país desde el backend
  loadCitiesByCountry(countryId: number): void {
    this.loadingCities = true;
    this.addressService.getCitiesByCountry(countryId)
      .pipe(finalize(() => this.loadingCities = false))
      .subscribe({
        next: (cities) => {
          this.filteredCities = cities;
        },
        error: (error) => {
          console.error(`Error al cargar las ciudades para el país ${countryId}:`, error);
        }
      });
  }
  
  isFieldInvalid(fieldName: string): boolean {
    const control = this.addressForm.get(fieldName);
    return (control?.invalid && control?.touched) || false;
  }
  
  getDivisionTypeLabel(type: string): string {
    const divisionType = this.divisionTypes.find(t => t.value === type);
    return divisionType ? divisionType.label : 'División';
  }
  
  nextStep(): void {
    // Validar campos del paso actual antes de avanzar
    if (this.currentStep === 0) {
      // Validar país y ciudad
      const countryControl = this.addressForm.get('countryId');
      const cityControl = this.addressForm.get('cityId');
      
      // Marcar estos campos como tocados para mostrar errores
      countryControl?.markAsTouched();
      cityControl?.markAsTouched();
      
      if (countryControl?.invalid || cityControl?.invalid) {
        // Mostrar un mensaje o impedir el avance
        // No avanzar si son inválidos
        return;
      }
    }
    
    // Avanzar al siguiente paso si hay validación
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
    }
  }
  
  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }
  
  cancel(): void {
    this.cancelled.emit();
  }
  
  onSubmit(): void {
    // Marcar todos los campos como tocados para mostrar errores
    Object.keys(this.addressForm.controls).forEach(key => {
      this.addressForm.get(key)?.markAsTouched();
    });
    
    if (this.addressForm.invalid) {
      this.snackBar.open('Por favor corrige los errores en el formulario', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return; // No continuar si hay errores
    }
    
    const formValue = this.addressForm.value;
    let address: Address;
    
    if (this.showCustomCity) {
      // Usar datos de ciudad personalizada
      const selectedCountry = this.countries.find(c => c.id === formValue.countryId);
      const city: City = {
        id: 0, // El ID será asignado por el backend
        name: formValue.customCityName,
        divisionName: formValue.customDivisionName,
        divisionType: formValue.customDivisionType as DivisionType,
        country: {
          id: formValue.countryId,
          name: selectedCountry?.name || ''
        }
      };
      
      address = {
        ...(this.isEditMode && this.existingAddress ? { id: this.existingAddress.id } : {}),
        streetName: formValue.streetName,
        streetNumber: formValue.streetNumber,
        floor: formValue.floor,
        apartment: formValue.apartment,
        postalCode: formValue.postalCode,
        city: city
      };
    } else {
      // Usar ciudad seleccionada de la lista
      const selectedCity = this.filteredCities.find(city => city.id === formValue.cityId);
      
      if (!selectedCity) {
        console.error('No se encontró la ciudad seleccionada');
        return;
      }
      
      address = {
        ...(this.isEditMode && this.existingAddress ? { id: this.existingAddress.id } : {}),
        streetName: formValue.streetName,
        streetNumber: formValue.streetNumber,
        floor: formValue.floor,
        apartment: formValue.apartment,
        postalCode: formValue.postalCode,
        city: selectedCity
      };
    }
    
    // Actualizar los datos de dirección actuales
    this.currentAddressData = address;
    
    // Verificar que el userId esté definido para crear una nueva dirección
    if (!this.userId && !this.isEditMode) {
      return;
    }
    
    // Guardar la dirección en el backend
    this.isLoading = true;
    
    if (this.isEditMode && this.existingAddress?.id) {
      // Actualizar dirección existente
      this.addressService.updateAddress(this.existingAddress.id, address)
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: (updatedAddress) => {
            // Mostrar notificación de éxito
            this.snackBar.open('¡Dirección actualizada con éxito!', 'Cerrar', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            // Emitir evento con la dirección actualizada
            this.addressSaved.emit(updatedAddress);
          },
          error: (error) => {
            console.error('Error al actualizar la dirección', error);
            this.snackBar.open('Error al actualizar la dirección', 'Cerrar', {
              duration: 3000,
              panelClass: ['error-snackbar']
            });
          }
        });
    } else {
      // Crear nueva dirección
      this.addressService.saveAddress(address, this.userId!)
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: (savedAddress) => {
            // Mostrar notificación de éxito
            this.snackBar.open('¡Dirección guardada con éxito!', 'Cerrar', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            // Emitir evento con la dirección guardada
            this.addressSaved.emit(savedAddress);
          },
          error: (error) => {
            console.error('Error al guardar la dirección', error);
            this.snackBar.open('Error al guardar la dirección', 'Cerrar', {
              duration: 3000,
              panelClass: ['error-snackbar']
            });
          }
        });
    }
  }
  
  // Método para obtener los datos de dirección actuales
  getCurrentAddressData(): Partial<Address> {
    return this.currentAddressData;
  }
} 