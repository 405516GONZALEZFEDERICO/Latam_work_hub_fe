import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormControl, AbstractControl, ValidatorFn } from '@angular/forms';
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
import { SpaceTypeService } from '../../../services/space/space-type.service';
import { SpaceType } from '../../../models/space-type.model';
import { Observable, map, startWith } from 'rxjs';
import { SpaceService } from '../../../services/space/space.service';
import { AmenityDto, SpaceDto, AddressEntity, Amenity } from '../../../models/space.model';

@Component({
  selector: 'app-space-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule,
    AmenityItemComponent
  ],
  templateUrl: './space-form.component.html',
  styleUrls: ['./space-form.component.css']
})
export class SpaceFormComponent implements OnInit {
  @Input() isEdit = false;
  spaceForm!: FormGroup;
  spaceId: string | null = null;
  currentUserId: string = '';
  showAddressModal = false;
  hasAddress = false;
  addressData: any = null;
  images: File[] = [];
  imagePreviewUrls: string[] = ['', '', ''];
  
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
  
  spaceTypes: { value: string, label: string }[] = [];
  isLoadingSpaceTypes = false;
  
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
    this.authService.getUserProfile().subscribe({
      next: (profile: any) => {
        if (profile) {
          this.currentUserId = profile.uid || '';
          console.log('Usuario actual ID:', this.currentUserId);
        }
      },
      error: (err) => console.error('Error al obtener perfil de usuario:', err)
    });
    
    // Initialize form
    this.initForm();
    this.initAddressForm();
    
    // Load countries
    this.loadCountries();
    
    // Load predefined amenities
    this.loadPredefinedAmenities();
    
    // Load space types
    this.loadSpaceTypes();
    
    // Check if we're in edit mode
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEdit = true;
        this.spaceId = params['id'];
        if (this.spaceId) {
          console.log('Cargando espacio con ID:', this.spaceId);
          this.loadSpace(this.spaceId);
        }
      }
    });
    
    // Configurar validadores adicionales dinámicos para el formulario
    this.setupDynamicValidators();
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
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      type: ['', [Validators.required]],
      capacity: [1, [Validators.required, Validators.min(1)]],
      area: [null, [Validators.min(1)]],
      priceHour: [0, [Validators.required, Validators.min(0)]],
      priceDay: [0, [Validators.min(0)]],
      priceMonth: [0, [Validators.min(0)]],
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
    console.log('Solicitando amenidades predefinidas...');
    
    this.amenityService.getPredefinedAmenities().subscribe({
      next: (amenities) => {
        console.log('Amenidades recibidas:', amenities);
        if (amenities && amenities.length > 0) {
          // Asegurar que cada amenidad tenga un ID
          this.predefinedAmenities = amenities.map((amenity, index) => ({
            ...amenity,
            id: amenity.id || index + 1
          }));
        } else {
          console.warn('No se recibieron amenidades del servidor');
        }
      },
      error: (error) => {
        console.error('Error al cargar amenidades:', error);
        this.snackBar.open('Error al cargar amenidades predefinidas', 'Cerrar', {
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
      streetName: ['', Validators.required],
      streetNumber: ['', Validators.required],
      floor: [''],
      apartment: [''],
      postalCode: ['', Validators.required]
    });
    
    // Configurar listener para el cambio de país
    this.addressForm.get('countryId')?.valueChanges.subscribe(countryId => {
      if (countryId) {
        console.log('País seleccionado ID:', countryId, 'tipo:', typeof countryId);
        this.loadCitiesByCountry(countryId);
        this.addressForm.get('cityId')?.setValue('');
      } else {
        this.filteredCities = [];
      }
    });
    
    console.log('Formulario de dirección inicializado');
  }
  // Cargar países desde el servicio
  loadCountries(): void {
    this.loading.countries = true;
    console.log('Solicitando lista de países...');
    
    this.addressService.getAllCountries().subscribe({
      next: (data: Country[]) => {
        this.countries = data;
        console.log(`${this.countries.length} países cargados`);
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
    console.log(`Cargando ciudades para el país ID: ${id}, tipo: ${typeof id}`);
    
    this.addressService.getCitiesByCountry(id).subscribe({
      next: (data: City[]) => {
        this.filteredCities = data;
        console.log(`${this.filteredCities.length} ciudades cargadas para país ID ${id}`);
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
  console.log(`Cargando datos del espacio ID: ${id}`);
  
  this.spaceService.getSpaceById(id).subscribe({
    next: (space: any) => {
      if (space) {
        console.log('Datos del espacio recibidos:', space);
        
        // Populate form with space data
        this.spaceForm.patchValue({
          name: space.name || space.title,
          description: space.description || '',
          type: space.type || '',
          capacity: space.capacity,
          area: space.area,
          priceHour: space.priceHour || space.hourlyPrice,
          priceDay: space.priceDay || 0,
          priceMonth: space.priceMonth || space.monthlyPrice
        });

        // Load amenities if any
        if (space.amenities && space.amenities.length > 0) {
          console.log(`Cargando ${space.amenities.length} amenidades`);
          
          // Clear existing amenities
          while (this.amenities.length) {
            this.removeAmenity(0);
          }
          
          // Add each amenity
          space.amenities.forEach((amenity: any) => {
            const amenityGroup = this.fb.group({
              name: [amenity.name, Validators.required],
              price: [amenity.price, [Validators.required, Validators.min(0)]]
            });
            this.amenities.push(amenityGroup);
          });
        }

        // Load address if available
        if (space.address) {
          console.log('Dirección del espacio:', space.address);
          this.addressData = space.address;
          this.hasAddress = true;
          
          // Cargar datos en el formulario de dirección
          if (this.addressData.countryId) {
            // Asegurar que los IDs sean números
            const countryId = typeof this.addressData.countryId === 'string' 
              ? parseInt(this.addressData.countryId, 10) 
              : this.addressData.countryId;
              
            const cityId = typeof this.addressData.cityId === 'string' 
              ? parseInt(this.addressData.cityId, 10) 
              : this.addressData.cityId;
            
            // Actualizar el objeto addressData con los valores convertidos
            this.addressData.countryId = countryId;
            this.addressData.cityId = cityId;
            
            console.log('Valores de dirección procesados:', {
              countryId: countryId,
              cityId: cityId,
              tipo_countryId: typeof countryId,
              tipo_cityId: typeof cityId
            });
            
            this.addressForm.patchValue({
              countryId: countryId,
              cityId: cityId,
              streetName: this.addressData.streetName,
              streetNumber: this.addressData.streetNumber,
              floor: this.addressData.floor || '',
              apartment: this.addressData.apartment || '',
              postalCode: this.addressData.postalCode
            });
            
            // Cargar las ciudades del país seleccionado
            this.loadCitiesByCountry(countryId);
          }
        }
      }
    },
    error: (error: any) => {
      console.error('Error al cargar el espacio:', error);
      this.snackBar.open('Error al cargar el espacio', 'Cerrar', {
        duration: 3000
      });
    }
  });
}
  
  onSubmit(): void {
    if (this.spaceForm.invalid) {
      this.spaceForm.markAllAsTouched();
      this.snackBar.open('Por favor complete todos los campos requeridos', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    const formValue = this.spaceForm.getRawValue();
    
    // Asegurar que los countryId y cityId sean números
    if (this.addressData) {
      // Convertir IDs a números si vienen como strings
      if (typeof this.addressData.countryId === 'string') {
        this.addressData.countryId = parseInt(this.addressData.countryId, 10);
      }
      if (typeof this.addressData.cityId === 'string') {
        this.addressData.cityId = parseInt(this.addressData.cityId, 10);
      }
    }

    // Validar que tengamos los IDs de ciudad y país
    if (!this.hasAddress || !this.addressData || !this.addressData.countryId || !this.addressData.cityId) {
      this.snackBar.open('Por favor complete la información de dirección con país y ciudad', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    // Log para depuración
    console.log('Datos de dirección a enviar:', this.addressData);
    
    // Crear SpaceDto con formato plano (propiedades de dirección directamente en el objeto principal)
    const spaceDto: SpaceDto = {
      name: formValue.name,
      description: formValue.description,
      capacity: formValue.capacity,
      area: formValue.area,
      pricePerHour: formValue.priceHour,
      pricePerDay: formValue.priceDay,
      pricePerMonth: formValue.priceMonth,
      uid: this.currentUserId,
      type: {
        name: formValue.type
      },
      // Propiedades de dirección planas según el formato del backend
      cityId: Number(this.addressData.cityId),
      countryId: Number(this.addressData.countryId),
      streetName: this.addressData.streetName,
      streetNumber: this.addressData.streetNumber,
      floor: this.addressData.floor || '',
      apartment: this.addressData.apartment || '',
      postalCode: this.addressData.postalCode,
      // Amenidades con precio como número
      amenities: formValue.amenities.map((amenity: any) => ({
        name: amenity.name,
        price: Number(amenity.price)
      }))
    };

    // Validar que se haya seleccionado un tipo de espacio
    if (!spaceDto.type.name) {
      this.snackBar.open('Por favor seleccione un tipo de espacio', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    // Log para depuración
    console.log('SpaceDto a enviar:', spaceDto);

    this.spaceService.createSpace(spaceDto, this.images).subscribe({
      next: (response: any) => {
        this.snackBar.open('Espacio creado correctamente', 'Cerrar', {
          duration: 3000
        });
        this.router.navigate(['/home/spaces']);
      },
      error: (error: any) => {
        console.error('Error al crear el espacio:', error);
        this.snackBar.open('Error al crear el espacio: ' + error.message, 'Cerrar', {
          duration: 3000
        });
      }
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
    const field = this.addressForm.get(fieldName);
    return !!field && field.invalid && (field.touched || field.dirty);
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
    console.log('Dirección guardada:', this.addressData);
    console.log('Tipos de IDs:', {
      countryId: typeof this.addressData.countryId,
      cityId: typeof this.addressData.cityId
    });
    
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
    console.log('Solicitando tipos de espacios...');
    
    this.spaceTypeService.getAllSpaceTypes().subscribe({
      next: (types: SpaceType[]) => {
        this.spaceTypes = types.map(type => ({
          value: type.name,
          label: this.formatSpaceTypeName(type.name)
        }));
        console.log(`${this.spaceTypes.length} tipos de espacios cargados`);
        this.isLoadingSpaceTypes = false;
      },
      error: (error) => {
        console.error('Error loading space types:', error);
        this.isLoadingSpaceTypes = false;
        this.snackBar.open('Error al cargar los tipos de espacio', 'Cerrar', {
          duration: 3000
        });
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
    
    console.log('addressData completo:', this.addressData);
    console.log('countryId:', this.addressData.countryId);
    console.log('tipo de countryId:', typeof this.addressData.countryId);
    console.log('cityId:', this.addressData.cityId);
    console.log('tipo de cityId:', typeof this.addressData.cityId);
    
    // Verificar si los valores son realmente números válidos
    const countryIdNum = Number(this.addressData.countryId);
    const cityIdNum = Number(this.addressData.cityId);
    
    console.log('countryId como número:', countryIdNum, '¿es número válido?', !isNaN(countryIdNum));
    console.log('cityId como número:', cityIdNum, '¿es número válido?', !isNaN(cityIdNum));
    
    // Verificar referencias a los objetos originales
    const selectedCountry = this.countries.find(c => c.id === countryIdNum);
    const selectedCity = this.filteredCities.find(c => c.id === cityIdNum);
    
    console.log('País correspondiente:', selectedCountry);
    console.log('Ciudad correspondiente:', selectedCity);
    
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
}