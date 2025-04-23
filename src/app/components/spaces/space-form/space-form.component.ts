import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Space, Amenity, SpaceDto, AmenityDto } from '../../../models/space';
import { AmenityItemComponent } from '../amenity-item/amenity-item.component';
import { AuthService } from '../../../services/auth-service/auth.service';
import { AddressService } from '../../../services/address/address.service';
import { Country } from '../../../models/country.model';
import { City } from '../../../models/city.model';
import { AmenityService } from '../../../services/space/amenity.service';
import { SpaceTypeService } from '../../../services/space/space-type.service';
import { SpaceType } from '../../../models/space-type.model';
import { Observable, map, startWith } from 'rxjs';

// Importación del SpaceService ajustada según la ubicación en el proyecto
import { SpaceService } from '../../../services/space/space.service';

@Component({
  selector: 'app-space-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
  
  // Amenity autocomplete properties
  amenityCtrl = new FormControl('');
  filteredAmenities: Observable<any[]> = new Observable<any[]>();
  predefinedAmenities: any[] = [];
  selectedAmenity: any = null;
  
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
    this.authService.getUserProfile().subscribe(
      (profile: any) => {
        if (profile) {
          this.currentUserId = profile.uid || '';
        }
      }
    );
    
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
          this.loadSpace(this.spaceId);
        }
      }
    });
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
    });
  }
  
  loadPredefinedAmenities(): void {
    this.amenityService.getPredefinedAmenities().subscribe(amenities => {
      this.predefinedAmenities = amenities;
      this.setupAmenityFilter();
    });
  }
  
  setupAmenityFilter(): void {
    this.filteredAmenities = this.amenityCtrl.valueChanges.pipe(
      startWith(''),
      map((value: any) => {
        const name = typeof value === 'string' ? value : (value ? value.name : '');
        return name ? this._filterAmenities(name) : this.predefinedAmenities.slice();
      }),
    );
  }
  
  private _filterAmenities(value: string): any[] {
    const filterValue = value.toLowerCase();
    return this.predefinedAmenities.filter(amenity => 
      amenity.name.toLowerCase().includes(filterValue));
  }
  
  displayAmenity(amenity: any): string {
    return amenity && amenity.name ? amenity.name : '';
  }
  
  onSelectAmenity(event: any): void {
    this.selectedAmenity = event.option.value;
    // Add the predefined amenity to the form
    if (this.selectedAmenity) {
      this.addSelectedAmenity();
      // Reset the control
      setTimeout(() => {
        this.amenityCtrl.setValue('');
        this.selectedAmenity = null;
      }, 0);
    }
  }
  
  addSelectedAmenity(): void {
    const amenityGroup = this.fb.group({
      name: [this.selectedAmenity.name, Validators.required],
      price: [this.selectedAmenity.price, [Validators.required, Validators.min(0)]]
    });
    (this.spaceForm.get('amenities') as FormArray).push(amenityGroup);
    
    // Show success message
    this.snackBar.open(`Comodidad "${this.selectedAmenity.name}" agregada`, 'Cerrar', {
      duration: 2000
    });
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
        this.loadCitiesByCountry(countryId);
        this.addressForm.get('cityId')?.setValue('');
      } else {
        this.filteredCities = [];
      }
    });
  }
  
  // Cargar países desde el servicio
  loadCountries(): void {
    this.loading.countries = true;
    this.addressService.getAllCountries().subscribe(
      (data: Country[]) => {
        this.countries = data;
        this.loading.countries = false;
      },
      (error) => {
        console.error('Error loading countries:', error);
        this.loading.countries = false;
        this.snackBar.open('Error al cargar países', 'Cerrar', {
          duration: 3000
        });
      }
    );
  }
  
  // Cargar ciudades por país desde el servicio
  loadCitiesByCountry(countryId: number): void {
    this.loading.cities = true;
    this.addressService.getCitiesByCountry(countryId).subscribe(
      (data: City[]) => {
        this.filteredCities = data;
        this.loading.cities = false;
      },
      (error) => {
        console.error('Error loading cities:', error);
        this.loading.cities = false;
        this.snackBar.open('Error al cargar ciudades', 'Cerrar', {
          duration: 3000
        });
      }
    );
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
    this.spaceService.getSpaceById(id).subscribe(
      (space: Space) => {
        if (space) {
          // Populate form with space data
          this.spaceForm.patchValue({
            name: space.name,
            description: space.description,
            type: space.type,
            capacity: space.capacity,
            area: space.area,
            priceHour: space.priceHour,
            priceDay: space.priceDay,
            priceMonth: space.priceMonth
          });

          // Load amenities if any
          if (space.amenities && space.amenities.length > 0) {
            // Clear existing amenities
            while (this.amenities.length) {
              this.removeAmenity(0);
            }
            
            // Add each amenity
            space.amenities.forEach((amenity: Amenity) => {
              this.amenities.push(this.fb.control(amenity));
            });
          }

          // Load address if available
          if (space.address) {
            this.addressData = space.address;
            this.hasAddress = true;
            
            // Cargar datos en el formulario de dirección
            if (this.addressData.countryId) {
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
          }
        }
      },
      (error: any) => {
        this.snackBar.open('Error al cargar el espacio', 'Cerrar', {
          duration: 3000
        });
      }
    );
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
      address: this.addressForm.getRawValue(),
      amenities: formValue.amenities.map((amenity: AmenityDto) => ({
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

    // Validar que se haya ingresado una dirección
    if (!this.hasAddress) {
      this.snackBar.open('Por favor ingrese la dirección del espacio', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    this.spaceService.createSpace(spaceDto, this.images).subscribe({
      next: (response) => {
        this.snackBar.open('Espacio creado correctamente', 'Cerrar', {
          duration: 3000
        });
        this.router.navigate(['/home/spaces']);
      },
      error: (error) => {
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
      return;
    }
    
    // Preparar los datos de la dirección
    const formValues = this.addressForm.value;
    const selectedCountry = this.countries.find(c => c.id === formValues.countryId);
    const selectedCity = this.filteredCities.find(c => c.id === formValues.cityId);
    
    this.addressData = {
      streetName: formValues.streetName,
      streetNumber: formValues.streetNumber,
      floor: formValues.floor,
      apartment: formValues.apartment,
      postalCode: formValues.postalCode,
      countryId: formValues.countryId,
      countryName: selectedCountry?.name || '',
      cityId: formValues.cityId,
      cityName: selectedCity?.name || '',
      userId: this.currentUserId
    };
    
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
    this.spaceTypeService.getAllSpaceTypes().subscribe({
      next: (types: SpaceType[]) => {
        this.spaceTypes = types.map(type => ({
          value: type.name,
          label: this.formatSpaceTypeName(type.name)
        }));
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