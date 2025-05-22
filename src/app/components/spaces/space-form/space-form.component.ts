import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormControl, AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Space } from '../../../models/space';
import { Country, City } from '../../../models/address.model';
import { AmenityItemComponent } from '../amenity-item/amenity-item.component';
import { AuthService } from '../../../services/auth-service/auth.service';
import { AddressService } from '../../../services/address/address.service';
import { AmenityService } from '../../../services/amenity/amenity.service';
import { SpaceTypeService } from '../../../services/space-type/space-type.service';
import { SpaceType } from '../../../models/space-type.model';
import { Observable, map, startWith, Subject, timer, takeUntil } from 'rxjs';
import { SpaceService } from '../../../services/space/space.service';
import { AmenityDto, SpaceCreationDto, AddressEntity, Amenity } from '../../../models/space.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpParams } from '@angular/common/http';

// Validador para campos de texto (sin números)
export function textOnlyValidator(): ValidatorFn {
  return (control: AbstractControl): {[key: string]: any} | null => {
    if (!control.value) {
      return null;
    }
    
    // Permite solo letras, espacios y caracteres acentuados
    const isValid = /^[a-zA-ZÀ-ÿ\s.,]+$/.test(control.value);
    return isValid ? null : { onlyText: true };
  };
}

// Validador para campos numéricos
export function numberOnlyValidator(): ValidatorFn {
  return (control: AbstractControl): {[key: string]: any} | null => {
    if (!control.value) {
      return null;
    }
    
    // Permite solo dígitos
    const isValid = /^\d+$/.test(control.value.toString());
    return isValid ? null : { onlyNumbers: true };
  };
}

// Validador para campos alfanuméricos
export function alphanumericValidator(): ValidatorFn {
  return (control: AbstractControl): {[key: string]: any} | null => {
    if (!control.value) {
      return null;
    }
    
    // Permite letras, números y algunos caracteres especiales comunes en direcciones
    const isValid = /^[a-zA-ZÀ-ÿ0-9\s.,\-#]+$/.test(control.value);
    return isValid ? null : { onlyAlphanumeric: true };
  };
}

// Validador para apartamentos (solo letras)
export function apartmentLetterValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Valor vacío es válido
    }
    
    // Permite solo letras (A-Z, a-z)
    const isValid = /^[a-zA-Z]+$/.test(control.value);
    return isValid ? null : { apartmentFormat: true };
  };
}

@Component({
  selector: 'app-space-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule,
    AmenityItemComponent,
    MatProgressSpinnerModule
  ],
  templateUrl: './space-form.component.html',
  styleUrls: ['./space-form.component.css']
})
export class SpaceFormComponent implements OnInit, OnDestroy {
  @Input() isEdit = false;
  spaceForm!: FormGroup;
  spaceId: string | null = null;
  currentUserId: string = '';
  showAddressModal = false;
  hasAddress = false;
  addressData: any = null;
  images: File[] = [];
  imagePreviewUrls: string[] = ['', '', ''];
  isSubmitting: boolean = false;
  submitTimer: any = null;
  formChanged: boolean = false;
  // Nueva propiedad para el mat-select de amenidades
  selectedAmenityId: number | null = null;
  predefinedAmenities: any[] = [];
  
  // Datos para selección de dirección
  currentStep = 0;
  addressForm!: FormGroup;
  countries: Country[] = [];
  cities: City[] = [];
  filteredCities: City[] = [];
  loading = {
    countries: false,
    cities: false
  };
  
  spaceTypes: { value: number | string, name: string, label: string }[] = [];
  isLoadingSpaceTypes = false;
  
  showImageModal = false;
  selectedImageIndex: number = 0;
  private destroy$ = new Subject<void>();
  
  existingImages: boolean[] = [false, false, false];
  
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private spaceService: SpaceService,
    private authService: AuthService,
    private addressService: AddressService,
    private amenityService: AmenityService,
    private spaceTypeService: SpaceTypeService,
    private snackBar: MatSnackBar
  ) {
    this.spaceForm = this.fb.group({
      name: [''],
      description: [''],
      type: [''],
      capacity: [''],
      area: [''],
      priceHour: [''],
      priceDay: [''],
      priceMonth: [''],
    });

    this.addressForm = this.fb.group({
      countryId: [''],
      cityId: [''],
      streetName: [''],
      streetNumber: [''],
      floor: [''],
      apartment: [''],
      postalCode: [''],
    });
  }
  
  ngOnInit(): void {
    // Get current user ID
    this.authService.getUserProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile: any) => {
          if (profile) {
            this.currentUserId = profile.uid || '';
          }
        },
        error: (err) => console.error('Error al obtener perfil de usuario:', err)
      });
    
    // Initialize form
    this.initForm();
    this.initAddressForm();
    
    // Resetear arrays de imágenes
    this.images = [];
    this.imagePreviewUrls = ['', '', ''];
    this.existingImages = [false, false, false];
    
    // Load countries
    this.loadCountries();
    
    // Load predefined amenities
    this.loadPredefinedAmenities();
    
    // Load space types
    this.loadSpaceTypes();
    
    // Check if we're in edit mode
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.isEdit = true;
          this.spaceId = params['id'];
          if (this.spaceId) {
            this.loadSpace(this.spaceId);
          }
        }
      });
    
    // Configurar validadores adicionales dinámicos para el formulario
    this.setupDynamicValidators();
    
    // Suscribirse a los cambios del formulario para detectar modificaciones
    this.spaceForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.formChanged = true;
      });
    
    this.addressForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.formChanged = true;
      });
  }
  
  setupDynamicValidators(): void {
    // Agregar validadores adicionales según necesidades
    const priceHourControl = this.spaceForm.get('priceHour');
    const priceDayControl = this.spaceForm.get('priceDay');
    const priceMonthControl = this.spaceForm.get('priceMonth');
    
    // Asegurar que al menos un precio esté definido
    const priceValidator = (control: AbstractControl): { [key: string]: boolean } | null => {
      const priceHour = this.spaceForm?.get('priceHour')?.value;
      const priceDay = this.spaceForm?.get('priceDay')?.value;
      const priceMonth = this.spaceForm?.get('priceMonth')?.value;
      
      const hasAtLeastOnePrice = 
        (priceHour && priceHour > 0) || 
        (priceDay && priceDay > 0) || 
        (priceMonth && priceMonth > 0);
      
      return hasAtLeastOnePrice ? null : { 'noPriceSpecified': true };
    };
    
    // Aplicar validador personalizado
    if (priceHourControl && priceDayControl && priceMonthControl) {
      priceHourControl.addValidators(priceValidator);
      priceDayControl.addValidators(priceValidator);
      priceMonthControl.addValidators(priceValidator);
    }
  }
  
  initForm(): void {
    this.spaceForm = this.fb.group({
      name: ['', [Validators.required, textOnlyValidator()]],
      description: ['', [Validators.required]],
      type: ['', [Validators.required]],
      capacity: [1, [Validators.required, Validators.min(1), numberOnlyValidator()]],
      area: [null, [Validators.min(1), numberOnlyValidator()]],
      priceHour: [0, [Validators.required, Validators.min(0), numberOnlyValidator()]],
      priceDay: [0, [Validators.min(0), numberOnlyValidator()]],
      priceMonth: [0, [Validators.min(0), numberOnlyValidator()]],
      amenities: this.fb.array([])
    }, { validators: this.atLeastOnePriceValidator() });
  }
  
  // Validador personalizado para precios
  atLeastOnePriceValidator(): ValidatorFn {
    return (control: AbstractControl): {[key: string]: any} | null => {
      const priceHour = control.get('priceHour')?.value;
      const priceDay = control.get('priceDay')?.value;
      const priceMonth = control.get('priceMonth')?.value;
      
      const hasAtLeastOnePrice = 
        (priceHour && priceHour > 0) || 
        (priceDay && priceDay > 0) || 
        (priceMonth && priceMonth > 0);
      
      return hasAtLeastOnePrice ? null : { 'noPriceSpecified': true };
    };
  }
  
  loadPredefinedAmenities(): void {
    this.amenityService.getAmenities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (amenities: any) => {
          this.predefinedAmenities = amenities;
        },
        error: (error: any) => {
          console.error('Error loading amenities:', error);
          this.snackBar.open('Error al cargar comodidades', 'Cerrar', {
            duration: 3000
          });
        }
      });
  }
  // Nuevo método para agregar la amenidad seleccionada desde el mat-select
  addSelectedAmenityFromSelect(): void {
    if (!this.selectedAmenityId) {
      this.snackBar.open('Por favor seleccione una comodidad primero', 'Cerrar', {
        duration: 3000
      });
      return;
    }
    
    const selectedAmenity = this.predefinedAmenities.find(a => a.id === this.selectedAmenityId);
    if (!selectedAmenity) {
      return;
    }
    
    const amenityGroup = this.fb.group({
      name: [selectedAmenity.name, Validators.required],
      price: [selectedAmenity.price, [Validators.required, Validators.min(0)]]
    });
    
    this.amenities.push(amenityGroup);
    
    // Mostrar mensaje de éxito
    this.snackBar.open(`Comodidad "${selectedAmenity.name}" agregada`, 'Cerrar', {
      duration: 2000
    });
    
    // Reiniciar la selección
    this.selectedAmenityId = null;
  }
  
  initAddressForm(): void {
    this.addressForm = this.fb.group({
      countryId: ['', Validators.required],
      cityId: ['', Validators.required],
      streetName: ['', [Validators.required, textOnlyValidator()]],
      streetNumber: ['', [Validators.required, numberOnlyValidator()]],
      floor: ['', [numberOnlyValidator()]],
      apartment: ['', [apartmentLetterValidator()]],
      postalCode: ['', [Validators.required, numberOnlyValidator()]]
    }, { updateOn: 'change' });
    
    // Configurar listener para el cambio de país
    this.addressForm.get('countryId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(countryId => {
        if (countryId) {
          this.loadCitiesByCountry(countryId);
          this.addressForm.get('cityId')?.setValue('');
        } else {
          this.filteredCities = [];
        }
      });
    
    // Forzar la validación inmediata al marcar los campos como tocados
    this.addressForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        Object.keys(this.addressForm.controls).forEach(key => {
          const control = this.addressForm.get(key);
          if (control && !control.pristine) {
            control.markAsTouched();
          }
        });
      });
  }
  // Cargar países desde el servicio
  loadCountries(): void {
    this.loading.countries = true;
    
    this.addressService.getAllCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Country[]) => {
          this.countries = data;
          this.loading.countries = false;
        },
        error: (error) => {
          console.error('Error loading countries:', error);
          this.loading.countries = false;
          this.snackBar.open('Error al cargar países', 'Cerrar', {
            duration: 3000
          });
        }
      });
  }
  
  loadCitiesByCountry(countryId: number | string): void {
    // Asegurar que countryId sea un número válido
    let id: number;
    
    if (typeof countryId === 'string') {
      id = parseInt(countryId, 10);
      if (isNaN(id)) {
        console.error('ID de país inválido (string):', countryId);
        this.snackBar.open('ID de país inválido, intente de nuevo', 'Cerrar', {
          duration: 3000
        });
        return;
      }
    } else {
      id = countryId;
    }
    
    if (id <= 0) {
      console.error('ID de país debe ser mayor a 0:', id);
      return;
    }
    
    this.loading.cities = true;
    
    this.addressService.getCitiesByCountry(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: City[]) => {
          this.filteredCities = data;
          this.loading.cities = false;
        },
        error: (error) => {
          console.error('Error loading cities:', error);
          this.loading.cities = false;
          this.snackBar.open('Error al cargar ciudades', 'Cerrar', {
            duration: 3000
          });
        }
      });
  }
  get amenities(): FormArray {
    return this.spaceForm.get('amenities') as FormArray;
  }
  
  addAmenity(): void {
    const amenityGroup = this.fb.group({
      name: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]]
    });
    (this.spaceForm.get('amenities') as FormArray).push(amenityGroup);
  }
  
  removeAmenity(index: number): void {
    this.amenities.removeAt(index);
  }
  
  onAmenityChange(event: { index: number, field: 'name' | 'price', value: string }): void {
    const currentAmenity = this.amenities.at(event.index).value;
    const updatedAmenity = { 
      ...currentAmenity,
      [event.field]: event.value
    };
    this.amenities.at(event.index).setValue(updatedAmenity);
  }
  
  loadSpace(id: string): void {
    // Mostrar loading state
    this.isLoadingSpaceTypes = true;
    console.log('ID del espacio:', id);
    this.spaceService.getSpaceById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (space: any) => {
          if (space) {
            console.log('Espacio cargado:', space);
            
            // Asignar datos básicos del espacio al formulario
            this.spaceForm.patchValue({
              name: space.name || space.title,
              description: space.description,
              capacity: space.capacity,
              area: space.area,
              priceHour: space.pricePerHour || space.priceHour || space.hourlyPrice,
              priceDay: space.pricePerDay || space.priceDay,
              priceMonth: space.pricePerMonth || space.priceMonth || space.monthlyPrice
            });

            // Asignar el tipo de espacio
            let spaceTypeName = '';
            
            // Verificar cada posible ubicación del tipo de espacio en orden de prioridad
            if (typeof space.spaceType === 'string') {
              spaceTypeName = space.spaceType;
            } 
            else if (space.spaceType && typeof space.spaceType === 'object' && space.spaceType.name) {
              spaceTypeName = space.spaceType.name;
            }
            else if (space.type && typeof space.type === 'string') {
              spaceTypeName = space.type;
            }
            else if (space.typeObj && space.typeObj.name) {
              spaceTypeName = space.typeObj.name;
            }
            
            // Asignar tipo solo cuando spaceTypes ya esté cargado
            if (this.spaceTypes.length > 0) {
              this.setSpaceType(spaceTypeName);
            } else {
              // Si los tipos no están cargados aún, esperar y reintentar
              const checkTypesInterval = setInterval(() => {
                if (this.spaceTypes.length > 0) {
                  this.setSpaceType(spaceTypeName);
                  clearInterval(checkTypesInterval);
                }
              }, 500);
              
              // Limpieza de seguridad después de 10 segundos
              setTimeout(() => clearInterval(checkTypesInterval), 10000);
            }

            // Cargar imágenes si están disponibles
            if (space.photoUrl && Array.isArray(space.photoUrl)) {
              space.photoUrl.forEach((image: string, index: number) => {
                if (index < 3) {
                  this.imagePreviewUrls[index] = image;
                  // Marcar que esta posición tiene una imagen existente
                  this.existingImages[index] = true;
                }
              });
            }

            // Cargar dirección si está disponible
            if (space.address) {
              // Verificar si la dirección tiene nombres de país y ciudad en lugar de IDs
              const addressWithNames = {
                ...space.address,
                country: space.address.country,
                city: space.address.city
              };
              this.loadAddressData(addressWithNames);
            } else {
              // Si no viene con el espacio, intentamos obtenerlo por el ID del espacio
              this.addressService.getAddressBySpaceId(Number(id)) 
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  next: address => {
                    if (address) {
                      this.loadAddressData(address);
                    }
                  },
                  error: error => {
                    console.error('Error al cargar la dirección:', error);
                  }
                });
            }
            
            // Cargar amenidades
            this.loadAmenities(space);
            
            // Marcar como cargado
            this.isLoadingSpaceTypes = false;
          }
        },
        error: (error) => {
          console.error('Error al cargar el espacio:', error);
          this.isLoadingSpaceTypes = false;
          this.snackBar.open('Error al cargar los datos del espacio', 'Cerrar', {
            duration: 3000
          });
        }
      });
  }

  // Método auxiliar para asignar tipo de espacio
  private setSpaceType(spaceTypeName: string): void {
    if (!spaceTypeName) return;
    
    // Buscar en el array de tipos de espacio
    const spaceTypeOption = this.spaceTypes.find(
      type => {
        // Verificar por nombre
        if (typeof type.value === 'string' && spaceTypeName) {
          return type.value.toLowerCase() === spaceTypeName.toLowerCase() ||
                type.name.toLowerCase() === spaceTypeName.toLowerCase();
        }
        // Verificar por ID si es un valor numérico
        if (typeof type.value === 'number' && !isNaN(Number(spaceTypeName))) {
          return type.value === Number(spaceTypeName);
        }
        return false;
      }
    );
    
    if (spaceTypeOption) {
      this.spaceForm.patchValue({
        type: spaceTypeOption.value
      });
      console.log('Tipo de espacio seleccionado:', spaceTypeOption);
    } else {
      console.warn('No se encontró el tipo de espacio en las opciones disponibles:', spaceTypeName);
      // Si no encontramos el tipo exacto, intentar añadirlo dinámicamente
      if (spaceTypeName) {
        // Crear un nuevo tipo con ID dinámico para evitar conflictos
        const newType = {
          value: 'custom_' + spaceTypeName.replace(/\s+/g, '_').toLowerCase(),
          name: spaceTypeName,
          label: this.formatSpaceTypeName(spaceTypeName)
        };
        this.spaceTypes.push(newType);
        this.spaceForm.patchValue({
          type: newType.value
        });
      }
    }
  }

  // Método auxiliar para cargar dirección
  private loadAddressData(address: any): void {
    this.hasAddress = true;
    
    // Guardar datos iniciales para uso posterior
    this.addressData = {
      countryId: address.countryId,
      cityId: address.cityId,
      streetName: address.streetName,
      streetNumber: address.streetNumber,
      floor: address.floor || '',
      apartment: address.apartment || '',
      postalCode: address.postalCode,
      // Guardar nombres si están disponibles
      countryName: address.country || address.countryName || '',
      cityName: address.city || address.cityName || ''
    };
    
    console.log('Datos de dirección cargados:', this.addressData);
    
    // Si tenemos country y city como nombres pero no tenemos IDs, obtener IDs del backend
    if (address.country && address.city && (!address.countryId || !address.cityId)) {
      console.log('Obteniendo IDs de ciudad y país por nombre...');
      this.addressService.getCityAndCountryIds(address.city, address.country)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            if (result) {
              console.log('IDs obtenidos:', result);
              // Actualizar los datos con los IDs obtenidos
              this.addressData.countryId = result.countryId;
              this.addressData.cityId = result.cityId;
              // Actualizar también los nombres por si vienen del backend
              this.addressData.countryName = result.countryName || address.country;
              this.addressData.cityName = result.cityName || address.city;
              
              this.selectCountryAndCity(result.countryId, result.cityId);
            }
          },
          error: (error) => {
            console.error('Error al obtener IDs de ciudad y país:', error);
          }
        });
    } else {
      // Comportamiento cuando ya tenemos IDs
      this.selectCountryAndCity(address.countryId, address.cityId);
    }
  }
  
  // Nuevo método para seleccionar país y ciudad en los combos
  private selectCountryAndCity(countryId: number | string, cityId: number | string): void {
    // Asegurarse de que tenemos países cargados
    if (this.countries.length === 0) {
      // Si no tenemos países, cargarlos y después seleccionar
      this.addressService.getAllCountries()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (countries) => {
            this.countries = countries;
            this.continueSelectingCountryAndCity(countryId, cityId);
          },
          error: (error) => {
            console.error('Error cargando países:', error);
          }
        });
    } else {
      this.continueSelectingCountryAndCity(countryId, cityId);
    }
  }
  
  // Método auxiliar para continuar con la selección después de cargar países
  private continueSelectingCountryAndCity(countryId: number | string, cityId: number | string): void {
    // Seleccionar el país
    this.addressForm.get('countryId')?.setValue(countryId);
    
    // Cargar las ciudades para ese país
    this.loadCitiesByCountry(countryId);
    
    // Esperar a que se carguen las ciudades y luego seleccionar la ciudad
    const maxRetries = 10;
    let retryCount = 0;
    
    const cityCheckInterval = setInterval(() => {
      retryCount++;
      
      if (this.filteredCities.length > 0) {
        console.log('Ciudades cargadas, seleccionando ciudad ID:', cityId);
        
        // Una vez cargadas las ciudades, establecer todo el formulario
        this.addressForm.patchValue({
          cityId: cityId,
          streetName: this.addressData.streetName,
          streetNumber: this.addressData.streetNumber,
          floor: this.addressData.floor || '',
          apartment: this.addressData.apartment || '',
          postalCode: this.addressData.postalCode
        });
        
        // Actualizar los nombres en addressData para mostrarlos en la UI
        const selectedCountry = this.countries.find(c => c.id === Number(countryId));
        const selectedCity = this.filteredCities.find(c => c.id === Number(cityId));
        
        if (selectedCountry) {
          this.addressData.countryName = selectedCountry.name;
        }
        
        if (selectedCity) {
          this.addressData.cityName = selectedCity.name;
        }
        
        console.log('Datos de dirección actualizados con nombres:', this.addressData);
        
        clearInterval(cityCheckInterval);
      } else if (retryCount >= maxRetries) {
        console.log('Reintentando cargar ciudades para el país:', countryId);
        this.loadCitiesByCountry(countryId);
        
        setTimeout(() => {
          this.addressForm.patchValue({
            cityId: cityId,
            streetName: this.addressData.streetName,
            streetNumber: this.addressData.streetNumber,
            floor: this.addressData.floor || '',
            apartment: this.addressData.apartment || '',
            postalCode: this.addressData.postalCode
          });
          
          // Actualizar los nombres en addressData para mostrarlos en la UI
          const selectedCountry = this.countries.find(c => c.id === Number(countryId));
          const selectedCity = this.filteredCities.find(c => c.id === Number(cityId));
          
          if (selectedCountry) {
            this.addressData.countryName = selectedCountry.name;
          }
          
          if (selectedCity) {
            this.addressData.cityName = selectedCity.name;
          }
        }, 500);
        
        clearInterval(cityCheckInterval);
      }
    }, 300);
  }

  // Método auxiliar para cargar amenidades
  private loadAmenities(space: any): void {
    if (space.amenities && Array.isArray(space.amenities) && space.amenities.length > 0) {
      // Limpiar el FormArray de amenidades
      (this.spaceForm.get('amenities') as FormArray).clear();
      
      // Añadir cada amenidad al FormArray
      space.amenities.forEach((amenity: any) => {
        const amenityForm = this.fb.group({
          name: [amenity.name || '', Validators.required],
          price: [amenity.price || 0],
          description: [amenity.description || '']
        });
        
        (this.spaceForm.get('amenities') as FormArray).push(amenityForm);
      });
    }
  }
  
  onSubmit(): void {
    if (this.spaceForm.invalid) {
      this.spaceForm.markAllAsTouched();
      return;
    }
    
    if (!this.hasAddress || !this.addressData) {
      this.snackBar.open('Debes agregar una dirección para tu espacio', 'Cerrar', {
        duration: 5000,
        panelClass: ['warning-snackbar']
      });
      return;
    }
    
    // Comprobar si hay imágenes nuevas o existentes
    const hasImages = this.images.some(img => !!img) || this.existingImages.some(exists => exists);
    
    if (!hasImages) {
      this.snackBar.open('Debes agregar al menos una imagen para tu espacio', 'Cerrar', {
        duration: 5000,
        panelClass: ['warning-snackbar']
      });
      return;
    }
    
    // Si el formulario ha sido modificado, configurar un temporizador para retrasar el envío
    if (this.formChanged) {
      this.isSubmitting = true;
      
      // Mostrar mensaje informativo
      this.snackBar.open('Preparando para guardar... Puedes seguir haciendo cambios', 'Cancelar', {
        duration: 3000,
        panelClass: ['info-snackbar']
      }).onAction().subscribe(() => {
        // Si el usuario hace clic en "Cancelar", detener el envío
        this.cancelSubmission();
      });
      
      // Establecer un temporizador de 2 segundos antes de enviar el formulario
      this.submitTimer = setTimeout(() => {
        this.proceedWithSubmission();
      }, 2000);
      
      return;
    }
    
    // Si no hay cambios, proceder directamente
    this.proceedWithSubmission();
  }
  
  cancelSubmission(): void {
    if (this.submitTimer) {
      clearTimeout(this.submitTimer);
      this.submitTimer = null;
    }
    this.isSubmitting = false;
    this.snackBar.open('Envío cancelado', 'Cerrar', {
      duration: 2000
    });
  }
  
  proceedWithSubmission(): void {
    this.isSubmitting = true;
    
    const formValues = this.spaceForm.value;
    const addressData = this.getAddressData();
    
    // Construir objeto SpaceCreationDto con los nombres de campos que espera el backend
    const spaceDto: SpaceCreationDto = {
      name: formValues.name,
      description: formValues.description,
      type: {
        id: Number(formValues.type)
      },
      capacity: Number(formValues.capacity),
      area: Number(formValues.area || 0),
      pricePerHour: Number(formValues.priceHour || 0),
      pricePerDay: Number(formValues.priceDay || 0),
      pricePerMonth: Number(formValues.priceMonth || 0),
      uid: this.currentUserId,
      amenities: this.getAmenityDtos(),
      // Datos de dirección directamente en el DTO
      countryId: Number(addressData.countryId),
      cityId: Number(addressData.cityId),
      streetName: addressData.streetName,
      streetNumber: addressData.streetNumber,
      floor: addressData.floor,
      apartment: addressData.apartment,
      postalCode: addressData.postalCode
    };
    
    console.log('Datos a enviar:', JSON.stringify(spaceDto, null, 2));
    
    // Filtrar solo imágenes que realmente sean archivos (ignorar posiciones vacías)
    const imagesToSend = this.images.filter(img => !!img);
    
    // Enviar datos al servicio
    if (this.isEdit && this.spaceId) {
      this.spaceService.updateSpace(this.spaceId, spaceDto, imagesToSend).subscribe({
        next: (response) => {
          this.handleSubmitSuccess('Espacio actualizado correctamente');
        },
        error: (error) => {
          this.handleSubmitError(error);
        }
      });
    } else {
      this.spaceService.createSpace(spaceDto, imagesToSend).subscribe({
        next: (response) => {
          this.handleSubmitSuccess('Espacio creado correctamente');
        },
        error: (error) => {
          this.handleSubmitError(error);
        }
      });
    }
  }
  
  handleSubmitSuccess(message: string): void {
    this.isSubmitting = false;
    this.formChanged = false;
    
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
    
    // Navegar a la ruta correcta
    setTimeout(() => {
      this.router.navigate(['/home/spaces']);
    }, 1000);
  }
  
  handleSubmitError(error: any): void {
    console.error('Error al guardar el espacio:', error);
    this.isSubmitting = false;
    
    this.snackBar.open('Error al guardar el espacio. Inténtalo de nuevo.', 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
  
  cancel(): void {
    this.router.navigate(['/home/spaces']);
  }
  
  // Methods to handle file uploads
  onFileSelected(event: any, index: number): void {
    const fileInput = event.target;
    const file = fileInput.files?.[0];
    
    if (file) {
      // Validación básica de tipo y tamaño
      if (!file.type.startsWith('image/')) {
        this.snackBar.open('Por favor selecciona un archivo de imagen válido', 'Cerrar', {
          duration: 3000
        });
        fileInput.value = ''; // Limpiar el input
        return;
      }
      
      // Límite de tamaño (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.snackBar.open('La imagen es demasiado grande. Máximo 10MB permitido.', 'Cerrar', {
          duration: 3000
        });
        fileInput.value = ''; // Limpiar el input
        return;
      }
      
      // Almacenar el archivo y crear la vista previa
      this.images[index] = file;
      
      // Si había una imagen existente en esta posición, ya no la hay
      this.existingImages[index] = false;
      
      // Create a preview URL for the image
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviewUrls[index] = e.target.result;
        // Mostrar un mensaje de éxito
        this.snackBar.open('Imagen cargada correctamente', 'Cerrar', {
          duration: 2000
        });
      };
      
      reader.onerror = () => {
        this.snackBar.open('Error al cargar la imagen. Intenta de nuevo.', 'Cerrar', {
          duration: 3000
        });
        fileInput.value = ''; // Limpiar el input
      };
      
      reader.readAsDataURL(file);
    }
  }

  // Address modal methods
  openAddressModal(): void {
    this.showAddressModal = true;
    document.body.classList.add('modal-open');
    
    // Inicializar valores de los selectores si ya hay una dirección
    if (this.hasAddress && this.addressData) {
      setTimeout(() => {
        this.addressForm.patchValue({
          countryId: this.addressData.countryId,
          cityId: this.addressData.cityId
        });
        
        // Cargar las ciudades del país seleccionado
        this.loadCitiesByCountry(this.addressData.countryId);
      }, 0);
    }
    
    // Reiniciar el paso actual
    this.currentStep = 0;
  }

  closeAddressModal(): void {
    this.showAddressModal = false;
    document.body.classList.remove('modal-open');
  }
  
  // Nuevo método para editar dirección existente
  editAddress(): void {
    // Cargar datos de dirección en el formulario
    if (this.addressData) {
      this.addressForm.patchValue({
        countryId: this.addressData.countryId,
        cityId: this.addressData.cityId,
        streetName: this.addressData.streetName,
        streetNumber: this.addressData.streetNumber,
        floor: this.addressData.floor || '',
        apartment: this.addressData.apartment || '',
        postalCode: this.addressData.postalCode
      });
      
      // Cargar las ciudades del país seleccionado
      this.loadCitiesByCountry(this.addressData.countryId);
    }
    
    // Cambiar estado para mostrar el formulario
    this.hasAddress = false;
    this.currentStep = 0;
  }
  
  isFieldInvalid(fieldName: string): boolean {
    const control = this.spaceForm.get(fieldName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
  
  getErrorMessage(fieldName: string): string {
    const control = this.spaceForm.get(fieldName);
    
    if (!control) return '';
    
    if (control.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    
    if (control.hasError('min')) {
      return `El valor debe ser mayor o igual a ${control.getError('min').min}`;
    }
    
    if (control.hasError('onlyText')) {
      return 'Este campo solo acepta texto, sin números';
    }
    
    if (control.hasError('onlyNumbers')) {
      return 'Este campo solo acepta números';
    }
    
    if (control.hasError('onlyAlphanumeric')) {
      return 'Este campo solo acepta letras, números y caracteres especiales básicos';
    }
    
    return 'Campo inválido';
  }
  
  isAddressFieldInvalid(fieldName: string): boolean {
    const control = this.addressForm.get(fieldName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
  
  getAddressErrorMessage(fieldName: string): string {
    const control = this.addressForm.get(fieldName);
    if (!control) {
      return '';
    }
    
    if (control.hasError('required')) {
      return 'Este campo es requerido';
    }
    
    if (control.hasError('onlyText')) {
      return 'El nombre debe contener solo texto, no números';
    }
    
    if (control.hasError('onlyNumbers')) {
      return 'Solo se permiten números en este campo';
    }
    
    if (control.hasError('apartmentFormat')) {
      return 'Ingrese solo letras (A, B, C...)';
    }
    
    // Mensaje por defecto para cualquier otro error
    return 'Campo inválido. Verifique el formato.';
  }
  
  nextStep(): void {
    if (this.currentStep < 1) {
      this.currentStep++;
    }
  }
  
  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }
  saveAddress(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      console.warn('Formulario de dirección inválido');
      return;
    }
    
    // Preparar los datos de la dirección
    const formValues = this.addressForm.value;
    
    // Convertir explícitamente a números
    const countryId = Number(formValues.countryId);
    const cityId = Number(formValues.cityId);
    
    // Validar que sean números válidos
    if (isNaN(countryId) || countryId <= 0) {
      console.error('ID de país inválido:', formValues.countryId);
      this.snackBar.open('ID de país inválido', 'Cerrar', {
        duration: 3000
      });
      return;
    }
    
    if (isNaN(cityId) || cityId <= 0) {
      console.error('ID de ciudad inválido:', formValues.cityId);
      this.snackBar.open('ID de ciudad inválido', 'Cerrar', {
        duration: 3000
      });
      return;
    }
    
    const selectedCountry = this.countries.find(c => c.id === countryId);
    const selectedCity = this.filteredCities.find(c => c.id === cityId);
    
    if (!selectedCountry || !selectedCity) {
      console.error('País o ciudad no encontrados:', {
        countryId,
        cityId,
        selectedCountry,
        selectedCity
      });
      this.snackBar.open('País o ciudad no encontrados', 'Cerrar', {
        duration: 3000
      });
      return;
    }
    
    this.addressData = {
      streetName: formValues.streetName,
      streetNumber: formValues.streetNumber,
      floor: formValues.floor,
      apartment: formValues.apartment,
      postalCode: formValues.postalCode,
      countryId: countryId, // Número validado
      countryName: selectedCountry.name,
      cityId: cityId, // Número validado
      cityName: selectedCity.name,
      userId: this.currentUserId
    };
    
    // Log para depuración

    
    this.hasAddress = true;
    this.closeAddressModal();
    this.snackBar.open('Dirección guardada correctamente', 'Cerrar', {
      duration: 3000
    });
  }
  
  
  cancelAddress(): void {
    this.closeAddressModal();
  }
  
  loadSpaceTypes(): void {
    this.isLoadingSpaceTypes = true;
    
    this.spaceTypeService.getAllSpaceTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types: SpaceType[]) => {
          // Transformar a formato requerido para mat-select
          this.spaceTypes = types.map(type => ({
            value: type.id || 0, // Valor por defecto si id es undefined
            name: type.name,
            label: this.formatSpaceTypeName(type.name)
          }));
          
          this.isLoadingSpaceTypes = false;
        },
        error: (error: any) => {
          console.error('Error loading space types:', error);
          this.snackBar.open('Error al cargar tipos de espacios', 'Cerrar', {
            duration: 3000
          });
          this.isLoadingSpaceTypes = false;
        }
      });
  }
  private debugAddressData(): void {
    console.group('Depuración de datos de dirección');
    
    if (!this.addressData) {
      console.error('addressData es null');
      console.groupEnd();
      return;
    }
    
    // Verificar si los valores son realmente números válidos
    const countryIdNum = Number(this.addressData.countryId);
    const cityIdNum = Number(this.addressData.cityId);
    
    
    // Verificar referencias a los objetos originales
    const selectedCountry = this.countries.find(c => c.id === countryIdNum);
    const selectedCity = this.filteredCities.find(c => c.id === cityIdNum);
  
    
    console.groupEnd();
  }
  /**
   * Formatea el nombre del tipo de espacio para mostrarlo en la UI
   */
  private formatSpaceTypeName(name: string): string {
    // Convertir camelCase a texto normal con espacios y primera letra mayúscula
    if (!name) return '';
    
    // Si contiene espacios, sólo capitalizar la primera letra de cada palabra
    if (name.includes(' ')) {
      return name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    // Para camelCase, insertar espacios antes de cada letra mayúscula y capitalizar la primera
    const formatted = name.replace(/([A-Z])/g, ' $1').trim();
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  openImageModal(index: number): void {
    this.selectedImageIndex = index;
    this.showImageModal = true;
  }

  closeImageModal(): void {
    this.showImageModal = false;
  }

  ngOnDestroy() {
    // Cancelar timers o operaciones pendientes si existen
    if (this.submitTimer) {
      clearTimeout(this.submitTimer);
    }
    
    // Limpiar las suscripciones para evitar memory leaks
    this.destroy$.next();
    this.destroy$.complete();
    
    // Limpiar recursos de imágenes
    for (let i = 0; i < this.imagePreviewUrls.length; i++) {
      if (this.imagePreviewUrls[i]) {
        URL.revokeObjectURL(this.imagePreviewUrls[i]);
      }
    }
  }

  // Método auxiliar para obtener los DTOs de amenidades
  getAmenityDtos(): AmenityDto[] {
    const amenitiesFormArray = this.spaceForm.get('amenities') as FormArray;
    if (!amenitiesFormArray) return [];
    
    return amenitiesFormArray.controls.map(control => {
      const group = control as FormGroup;
      return {
        name: group.get('name')?.value || '',
        price: Number(group.get('price')?.value || 0)
      };
    });
  }
  
  // Método auxiliar para obtener los datos de dirección
  getAddressData(): AddressEntity {
    if (!this.addressData) {
      return {
        countryId: 0,
        cityId: 0,
        streetName: '',
        streetNumber: '',
        floor: '',
        apartment: '',
        postalCode: ''
      };
    }
    
    return {
      countryId: typeof this.addressData.countryId === 'string' 
        ? parseInt(this.addressData.countryId, 10) 
        : this.addressData.countryId,
      cityId: typeof this.addressData.cityId === 'string' 
        ? parseInt(this.addressData.cityId, 10) 
        : this.addressData.cityId,
      streetName: this.addressData.streetName || '',
      streetNumber: this.addressData.streetNumber || '',
      floor: this.addressData.floor || '',
      apartment: this.addressData.apartment || '',
      postalCode: this.addressData.postalCode || ''
    };
  }
}