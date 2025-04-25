import { Component, EventEmitter, OnInit, Output, ViewEncapsulation, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfileService } from '../../../services/profile/profile.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth-service/auth.service';
import { User, UserRole } from '../../../models/user';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Location } from '@angular/common';
import { PersonalDataUserDto } from '../../../models/personal-data-user-dto';
import { catchError, EMPTY, finalize, Subject, takeUntil } from 'rxjs';
import { Address } from '../../../models/address.model';
import { AddressStepperComponent } from '../address-stepper/address-stepper.component';
import { AddressService } from '../../../services/address/address.service';

// Formato de fecha personalizado
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY'
  }
};

// Validador personalizado para verificar que el usuario tenga al menos 18 años
export function ageValidator(minAge: number = 18): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Si no hay valor, otros validadores manejarán esto
    }
    
    const birthDate = new Date(control.value);
    if (isNaN(birthDate.getTime())) {
      return { invalidDate: true };
    }
    
    // Usar la fecha actual en lugar de un año fijo
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    
    // Ajustar la edad si aún no se ha cumplido años en este año
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age < minAge ? { minAge: { required: minAge, actual: age } } : null;
  };
}

// Validador personalizado para verificar que el número de documento coincida con el tipo
export function documentValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    if (!(group instanceof FormGroup)) {
      return null;
    }
    
    const documentType = group.get('documentType')?.value;
    const documentNumber = group.get('documentNumber')?.value;
    
    if (!documentType || !documentNumber) {
      return null; // Si no hay valores, otros validadores manejarán esto
    }
    
    let isValid = true;
    let errorType = '';
    
    switch (documentType) {
      case 'DNI':
        // Validar DNI: 8 dígitos
        isValid = /^\d{8}$/.test(documentNumber);
        errorType = 'dniFormat';
        break;
      case 'CEDULA':
        // Validar Cédula: Formato de cédula de varios países
        isValid = /^[A-Z0-9]{6,12}$/.test(documentNumber);
        errorType = 'cedulaFormat';
        break;
      case 'CURP':
        // Validar CURP: Formato de CURP mexicana
        isValid = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/.test(documentNumber);
        errorType = 'curpFormat';
        break;
      case 'CPF':
        // Validar CPF: Formato de CPF brasileño
        isValid = /^\d{11}$/.test(documentNumber) || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(documentNumber);
        errorType = 'cpfFormat';
        break;
      case 'PASSPORT':
        // Validar Pasaporte: Letras y números, generalmente 8-9 caracteres
        isValid = /^[A-Z0-9]{6,9}$/.test(documentNumber);
        errorType = 'passportFormat';
        break;
      case 'FOREIGN_ID':
        // ID extranjera: más flexible, pero al menos requiere algo
        isValid = /^[A-Z0-9-]{4,20}$/.test(documentNumber);
        errorType = 'foreignIdFormat';
        break;
      // 'OTHER' no tiene validación específica
    }
    
    if (!isValid) {
      const error: ValidationErrors = {};
      error[errorType] = true;
      group.get('documentNumber')?.setErrors(error);
      return { [errorType]: true };
    }
    
    // Limpiar errores anteriores si ahora es válido
    const currentErrors = group.get('documentNumber')?.errors;
    if (currentErrors) {
      const { [errorType]: removed, ...rest } = currentErrors;
      group.get('documentNumber')?.setErrors(Object.keys(rest).length ? rest : null);
    }
    
    return null;
  };
}

@Component({
  selector: 'app-personal-data-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    AddressStepperComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './personal-data-form.component.html',
  styleUrls: ['./personal-data-form.component.css'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es' },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]
})
export class PersonalDataFormComponent implements OnInit, OnDestroy, OnChanges {
  @Output() formSubmitted = new EventEmitter<any>();
  @Output() profileDataLoaded = new EventEmitter<any>();
  
  // Input para controlar si el componente está activo
  @Input() isActiveTab: boolean = false;
  @Input() shouldLoadData: boolean = true;
  
  personalDataForm: FormGroup;
  profilePicture: string | null = null;
  isLoading = false;
  currentUserId: string = '';
  dataLoaded = false;
  addressDataLoaded = false;
  
  // Para limpieza de suscripciones
  private destroy$ = new Subject<void>();
  
  documentTypes = [
    { value: 'DNI', label: 'DNI' },
    { value: 'CEDULA', label: 'Cédula' },
    { value: 'CURP', label: 'CURP' },
    { value: 'CPF', label: 'CPF' },
    { value: 'PASSPORT', label: 'Pasaporte' },
    { value: 'FOREIGN_ID', label: 'Identificación Extranjera' },
    { value: 'OTHER', label: 'Otro' }
  ];

  showAddressContent = false;
  address: Address | null = null;
  addressStepperVisible = false;
  
  documentPatterns: Record<string, string> = {
    DNI: 'Debe contener 8 dígitos numéricos',
    CEDULA: 'Debe contener entre 6 y 12 caracteres alfanuméricos',
    CURP: 'Debe tener formato CURP mexicano válido',
    CPF: 'Debe contener 11 dígitos o formato ###.###.###-##',
    PASSPORT: 'Debe contener entre 6 y 9 caracteres alfanuméricos',
    FOREIGN_ID: 'Debe contener entre 4 y 20 caracteres alfanuméricos o guiones',
    OTHER: 'Ingrese su número de documento'
  };
  
  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private location: Location,
    private addressService: AddressService
  ) {
    this.personalDataForm = this.fb.group({
      fullName: ['', Validators.required],
      email: [{value: '', disabled: true}, [Validators.required, Validators.email]],
      birthDate: ['', [Validators.required, ageValidator(18)]],
      documentType: ['', Validators.required],
      documentNumber: ['', Validators.required],
      jobTitle: [''],
      department: ['']
    }, { validators: documentValidator() });

    // Suscribirse a cambios en el campo birthDate para mostrar inmediatamente el formato
    this.personalDataForm.get('birthDate')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value) {
          // Asegurarse de que sea un objeto Date
          if (!(value instanceof Date)) {
            try {
              // Si es string, convertir correctamente sin zona horaria
              if (typeof value === 'string') {
                if (value.includes('-')) {
                  // Formato YYYY-MM-DD
                  const parts = value.split('-');
                  if (parts.length === 3) {
                    const dateObj = new Date(
                      parseInt(parts[0]),
                      parseInt(parts[1]) - 1,
                      parseInt(parts[2]),
                      12, 0, 0
                    );
                    this.personalDataForm.get('birthDate')?.setValue(dateObj, { emitEvent: false });
                  }
                } else {
                  // Otro formato de fecha
                  const dateObj = new Date(value);
                  if (!isNaN(dateObj.getTime())) {
                    // Ajustar para evitar problemas de zona horaria
                    const year = dateObj.getFullYear();
                    const month = dateObj.getMonth();
                    const day = dateObj.getDate();
                    // Crear una nueva fecha al mediodía para evitar problemas
                    const adjustedDate = new Date(year, month, day, 12, 0, 0);
                    this.personalDataForm.get('birthDate')?.setValue(adjustedDate, { emitEvent: false });
                  }
                }
              }
            } catch (e) {
              console.error('Error al convertir fecha:', e);
            }
          }
        }
      });

    // Suscribirse a cambios en el tipo de documento para mostrar el patrón correcto
    this.personalDataForm.get('documentType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        if (type) {
          // Revalidar el número de documento cuando cambia el tipo
          const documentNumber = this.personalDataForm.get('documentNumber');
          if (documentNumber?.value) {
            documentNumber.updateValueAndValidity();
          }
        }
      });
  }
  
  ngOnInit(): void {
    // Obtener el ID del usuario una sola vez
    const user = this.authService.getCurrentUserSync();
    if (user && user.uid) {
      this.currentUserId = user.uid;
      
      // Cargar datos solo si se debe cargar y la pestaña está activa
      if (this.shouldLoadData && this.isActiveTab) {
        this.loadDataIfNeeded();
      }
    }
  }
  
  // Nuevo método para cargar datos cuando cambia la tab
  loadDataIfNeeded(): void {
    console.log('PersonalDataFormComponent: Verificando si se deben cargar datos', {
      dataLoaded: this.dataLoaded,
      addressDataLoaded: this.addressDataLoaded
    });
    
    // Solo cargar los datos del usuario si no se han cargado previamente
    if (!this.dataLoaded && this.currentUserId) {
      this.loadUserData();
    }

    // Cargar la dirección si no se ha cargado previamente
    if (!this.addressDataLoaded && this.currentUserId) {
      this.loadAddress();
    }
  }
  
  // Cargar datos del usuario
  loadUserData(): void {
    console.log('Cargando datos de usuario');
    
    // Activar indicador de carga
    this.isLoading = true;
    this.dataLoaded = false;
    
    // Obtener el usuario actual
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user && user.uid) {
        console.log('Usuario actual encontrado:', user.uid);
        this.currentUserId = user.uid;
        
        // Cargar datos personales
        console.log('Solicitando datos personales desde el servidor');
        this.profileService.getPersonalData(this.currentUserId).pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            // Finalizar carga después de obtener datos o error
            setTimeout(() => {
              this.isLoading = false;
              this.dataLoaded = true;
            }, 300); // Pequeño delay para mostrar el spinner
          })
        ).subscribe({
          next: (personalData) => {
            console.log('Datos personales recibidos:', personalData);
            
            if (personalData) {
              // Rellenar formulario con datos recibidos
              if (personalData.photoUrl) {
                this.profilePicture = this.ensureCompleteUrl(personalData.photoUrl);
              }
              
              this.personalDataForm.patchValue({
                fullName: personalData.name || '',
                email: personalData.email || user.email || '',
                birthDate: personalData.birthDate ? new Date(personalData.birthDate) : null,
                documentType: personalData.documentType || '',
                documentNumber: personalData.documentNumber || '',
                jobTitle: personalData.jobTitle || '',
                department: personalData.department || ''
              });
              
              // Emitir evento de datos cargados
              this.profileDataLoaded.emit(personalData);
            } else {
              // No hay datos personales, llenar solo el email desde el usuario
              this.personalDataForm.patchValue({
                email: user.email || ''
              });
            }
            
            // Continuar con la carga de dirección
            this.loadAddress();
          },
          error: (error) => {
            console.error('Error al cargar datos personales:', error);
            // Llenar solo el email en caso de error
            this.personalDataForm.patchValue({
              email: user.email || ''
            });
            
            // Mostrar mensaje de error
            this.snackBar.open('Error al cargar datos personales', 'Cerrar', {
              duration: 5000,
              panelClass: ['snackbar-error']
            });
          }
        });
      } else {
        console.error('No hay usuario autenticado o falta UID');
        this.isLoading = false;
        this.dataLoaded = true;
      }
    });
  }

  loadAddress(): void {
    console.log('PersonalDataFormComponent: Cargando dirección');
    this.addressService.getAddressByUserUid(this.currentUserId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          if (error.status !== 404) {
            console.error('Error al cargar la dirección:', error);
          } else {
            console.log('No se encontró dirección registrada');
          }
          return EMPTY;
        }),
        finalize(() => {
          this.addressDataLoaded = true;
        })
      )
      .subscribe({
        next: (address) => {
          if (address) {
            this.address = address;
            this.showAddressContent = true;
          }
        }
      });
  }
  
  ngOnDestroy(): void {
    // Limpiar clases cuando el componente se destruye
    document.body.classList.remove('no-scroll-form');
    
    // Limpiar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    
    // Mostrar la imagen seleccionada localmente
    const reader = new FileReader();
    reader.onload = (e) => {
      this.profilePicture = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    
    // Obtener el ID del usuario actual
    const user = this.authService.getCurrentUserSync();
    if (!user || !user.uid) {
      this.snackBar.open('No se pudo identificar el usuario actual', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-error']
      });
      return;
    }

    // Mostrar indicador de carga
    this.isLoading = true;
    
    // Crear FormData para enviar el archivo
    const formData = new FormData();
    
    // Es importante que el nombre del campo sea exactamente 'image' como espera el backend
    formData.append('image', file, file.name);
    
    console.log('Enviando imagen al servidor:', file);
    console.log('Nombre del archivo:', file.name);
    console.log('Tipo de archivo:', file.type);
    console.log('Tamaño del archivo:', file.size, 'bytes');
    
    // Llamar al servicio para subir la imagen
    this.profileService.uploadProfilePicture(user.uid, formData)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.isLoading = false;
          console.error('Error al subir la imagen:', error);
          this.snackBar.open('Error al subir la imagen. Inténtelo de nuevo.', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-error']
          });
          return EMPTY;
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(response => {
        this.snackBar.open('Foto de perfil actualizada correctamente', 'Cerrar', {
          duration: 3000
        });
        // Actualizar la URL de la imagen si el servidor devuelve una
        if (response && response.photoUrl) {
          this.profilePicture = this.ensureCompleteUrl(response.photoUrl);
        }
      });
  }
  
  ensureCompleteUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
 
    return `https://example.com/images/${url}`;
  }
  
  isFieldInvalid(field: string): boolean {
    const control = this.personalDataForm.get(field);
    return (control?.invalid && (control?.dirty || control?.touched)) || false;
  }
  
  onSubmit(): void {
    if (this.personalDataForm.invalid) {
      return;
    }
    
    // Activar spinner durante el envío
    this.isLoading = true;
    
    // Obtener valores del formulario
    const formValues = this.personalDataForm.value;
    
    // Construir objeto de datos personales
    const personalData: PersonalDataUserDto = {
      uid: this.currentUserId,
      name: formValues.fullName,
      email: formValues.email,
      birthDate: formValues.birthDate ? formValues.birthDate.toISOString().split('T')[0] : null,
      documentType: formValues.documentType,
      documentNumber: formValues.documentNumber,
      jobTitle: formValues.jobTitle || '',
      department: formValues.department || '',
    };
    
    console.log('Enviando datos personales:', personalData);
    
    // Enviar datos al servicio
    this.profileService.updateOrCreatePersonalData(this.currentUserId, personalData)
      .pipe(
        finalize(() => {
          // Añadir un pequeño retraso para que el spinner sea visible
          setTimeout(() => {
            this.isLoading = false;
          }, 300);
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Datos personales guardados exitosamente:', response);
          
          // Notificar al usuario
          this.snackBar.open('Información personal guardada correctamente', 'Cerrar', {
            duration: 3000,
          });
          
          // Emitir evento de formulario enviado
          this.formSubmitted.emit(personalData);
        },
        error: (error) => {
          console.error('Error al guardar datos personales:', error);
          
          // Notificar al usuario
          this.snackBar.open('Error al guardar la información personal', 'Cerrar', {
            duration: 5000,
            panelClass: ['snackbar-error']
          });
        }
      });
  }

  toggleAddressSection(): void {
    this.showAddressContent = !this.showAddressContent;
  }

  addAddress(): void {
    this.addressStepperVisible = true;
  }

  editAddress(): void {
    this.addressStepperVisible = true;
  }

  handleAddressSaved(savedAddress: Address): void {
    this.address = savedAddress;
    this.addressStepperVisible = false;
    this.showAddressContent = true;
  }

  handleAddressCancelled(): void {
    this.addressStepperVisible = false;
  }

  // Método para obtener el mensaje de error de fecha de nacimiento
  getBirthDateErrorMessage(): string {
    const control = this.personalDataForm.get('birthDate');
    
    if (control?.hasError('required')) {
      return 'La fecha de nacimiento es requerida';
    }
    
    if (control?.hasError('invalidDate')) {
      return 'Fecha inválida';
    }
    
    if (control?.hasError('minAge')) {
      return `Debe ser mayor de 18 años`;
    }
    
    return '';
  }
  
  // Método para obtener el mensaje de error del documento según el tipo
  getDocumentErrorMessage(): string {
    const control = this.personalDataForm.get('documentNumber');
    const type = this.personalDataForm.get('documentType')?.value;
    
    if (control?.hasError('required')) {
      return 'El número de documento es requerido';
    }
    
    if (type && this.documentPatterns[type] && 
        (control?.hasError('dniFormat') || 
         control?.hasError('cedulaFormat') || 
         control?.hasError('curpFormat') || 
         control?.hasError('cpfFormat') || 
         control?.hasError('passportFormat') || 
         control?.hasError('foreignIdFormat'))) {
      return `Formato inválido. ${this.documentPatterns[type]}`;
    }
    
    return '';
  }
  
  // Método para obtener el placeholder según el tipo de documento
  getDocumentPlaceholder(): string {
    const type = this.personalDataForm.get('documentType')?.value;
    return type && this.documentPatterns[type] 
      ? this.documentPatterns[type]
      : 'Ingrese su número de documento';
  }

  // Detector de cambios para reaccionar cuando la pestaña se activa
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isActiveTab'] && changes['isActiveTab'].currentValue === true && this.shouldLoadData) {
      console.log('PersonalDataFormComponent: Tab activada, verificando si se deben cargar datos');
      this.loadDataIfNeeded();
    }
    
    if (changes['shouldLoadData'] && changes['shouldLoadData'].currentValue === true && this.isActiveTab) {
      console.log('PersonalDataFormComponent: shouldLoadData activado, verificando si se deben cargar datos');
      this.loadDataIfNeeded();
    }
  }
}