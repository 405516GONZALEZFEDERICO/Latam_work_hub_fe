import { Component, EventEmitter, OnInit, Output, ViewEncapsulation, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, Input, OnChanges, SimpleChanges, LOCALE_ID, Inject } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfileService } from '../../../services/profile/profile.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth-service/auth.service';
import { User, UserRole } from '../../../models/user';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Location } from '@angular/common';
import { PersonalDataUserDto } from '../../../models/personal-data-user-dto';
import { catchError, EMPTY, finalize, Subject, takeUntil, take } from 'rxjs';
import { Address } from '../../../models/address.model';
import { AddressStepperComponent } from '../address-stepper/address-stepper.component';
import { AddressService } from '../../../services/address/address.service';

// Registrar los datos de localización español
registerLocaleData(localeEs);

// Adaptador de fecha personalizado para forzar formato DD/MM/YYYY
export class CustomDateAdapter extends NativeDateAdapter {
  override parse(value: any): Date | null {
    if (!value || value === '') return null;
    
    // Forzar formato DD/MM/YYYY para entradas como "03/09/1997"
    if (typeof value === 'string') {
      // Verificar si es formato DD/MM/YYYY
      const ddmmyyyyRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const ddmmyyyyMatch = ddmmyyyyRegex.exec(value);
      
      if (ddmmyyyyMatch) {
        const day = parseInt(ddmmyyyyMatch[1], 10);
        const month = parseInt(ddmmyyyyMatch[2], 10) - 1; // Los meses en JS empiezan en 0
        const year = parseInt(ddmmyyyyMatch[3], 10);
        
        return new Date(year, month, day, 12, 0, 0);
      }
      
      // Verificar si es formato DDMMYYYY (sin separadores)
      const noSeparatorRegex = /^(\d{2})(\d{2})(\d{4})$/;
      const noSeparatorMatch = noSeparatorRegex.exec(value);
      
      if (noSeparatorMatch) {
        const day = parseInt(noSeparatorMatch[1], 10);
        const month = parseInt(noSeparatorMatch[2], 10) - 1; // Los meses en JS empiezan en 0
        const year = parseInt(noSeparatorMatch[3], 10);
        
        return new Date(year, month, day, 12, 0, 0);
      }
    }
    
    // Si no coincide con nuestros formatos, dejar que el adaptador nativo lo maneje
    return super.parse(value);
  }
  
  override format(date: Date, displayFormat: Object): string {
    // Siempre formatear como DD/MM/YYYY
    if (displayFormat === 'input') {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    return super.format(date, displayFormat);
  }
}

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

// Validador para campos numéricos
export function numberOnlyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    
    // Permite solo dígitos
    const isValid = /^\d+$/.test(control.value.toString());
    return isValid ? null : { onlyNumbers: true };
  };
}

// Validador para campos de texto (sin números)
export function textOnlyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    
    // Permite solo letras, espacios y caracteres acentuados
    const isValid = /^[a-zA-ZÀ-ÿ\s]+$/.test(control.value);
    return isValid ? null : { onlyText: true };
  };
}

// Validador para formato de fecha
export function dateFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    
    // Si es un objeto Date, es válido
    if (control.value instanceof Date && !isNaN(control.value.getTime())) {
      return null;
    }
    
    // Si es un string, validar formato DD/MM/YYYY
    if (typeof control.value === 'string') {
      const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const match = regex.exec(control.value);
      
      if (!match) return { invalidDateFormat: true };
      
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // Los meses en JS empiezan en 0
      const year = parseInt(match[3], 10);
      
      const date = new Date(year, month, day);
      
      // Verificar que la fecha sea válida
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month ||
        date.getDate() !== day
      ) {
        return { invalidDate: true };
      }
      
      return null;
    }
    
    return { invalidDateFormat: true };
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
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: DateAdapter, useClass: CustomDateAdapter, deps: [MAT_DATE_LOCALE] }
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
      fullName: ['', [Validators.required, textOnlyValidator()]],
      email: [{value: '', disabled: true}, [Validators.required, Validators.email]],
      birthDate: ['', [Validators.required, ageValidator(18), dateFormatValidator()]],
      documentType: ['', Validators.required],
      documentNumber: ['', [Validators.required, numberOnlyValidator()]],
      jobTitle: ['', [textOnlyValidator()]],
      department: ['', [textOnlyValidator()]]
    }, { validators: documentValidator(), updateOn: 'change' });
    
    // Preload email from current user
    const currentUser = this.authService.getCurrentUserSync();
    if (currentUser && currentUser.email) {
      this.personalDataForm.get('email')?.setValue(currentUser.email);
      // Always disable the email field
      this.personalDataForm.get('email')?.disable();
    }

    // Aplicar validación inmediata al cambiar valores
    this.personalDataForm.valueChanges.subscribe(() => {
      Object.keys(this.personalDataForm.controls).forEach(key => {
        const control = this.personalDataForm.get(key);
        control?.markAsDirty();
        control?.updateValueAndValidity();
      });
    });

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
    // Inicializar el formulario con validadores
    this.personalDataForm = this.fb.group({
      fullName: ['', [Validators.required, textOnlyValidator()]],
      email: [{value: '', disabled: true}, [Validators.required, Validators.email]],
      birthDate: ['', [Validators.required, ageValidator(18), dateFormatValidator()]],
      documentType: ['', Validators.required],
      documentNumber: ['', [Validators.required, numberOnlyValidator()]],
      jobTitle: ['', [textOnlyValidator()]],
      department: ['', [textOnlyValidator()]]
    }, { validators: documentValidator(), updateOn: 'change' });
    
    // Marcar todos los campos como tocados para mostrar errores de inmediato
    Object.keys(this.personalDataForm.controls).forEach(key => {
      const control = this.personalDataForm.get(key);
      control?.markAsTouched();
      control?.markAsDirty();
    });
    
    // Obtener el usuario actual y su ID
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$),
      take(1) // tomar solo una emisión
    ).subscribe(user => {
      if (user && user.uid) {
        this.currentUserId = user.uid;
        // Cargar datos del usuario
        this.loadUserData();
        // Cargar dirección
        this.loadAddress();
      }
    });
    
    // Suscribirse a cambios en documentType para mostrar validaciones dinámicas
    this.personalDataForm.get('documentType')?.valueChanges.subscribe(() => {
      this.personalDataForm.get('documentNumber')?.updateValueAndValidity();
      this.personalDataForm.get('documentNumber')?.markAsTouched();
    });
    
    // Suscribirse a cambios en birthDate para convertir formatos de texto a Date si es necesario
    this.personalDataForm.get('birthDate')?.valueChanges.subscribe(value => {
      if (typeof value === 'string' && value) {
        const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = regex.exec(value);
        
        if (match) {
          const day = parseInt(match[1], 10);
          const month = parseInt(match[2], 10) - 1;
          const year = parseInt(match[3], 10);
          
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            this.personalDataForm.get('birthDate')?.setValue(date, { emitEvent: false });
          }
        } else if (/^\d{8}$/.test(value)) {
          // Formato DDMMYYYY sin separadores
          const day = parseInt(value.substring(0, 2), 10);
          const month = parseInt(value.substring(2, 4), 10) - 1;
          const year = parseInt(value.substring(4, 8), 10);
          
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            this.personalDataForm.get('birthDate')?.setValue(date, { emitEvent: false });
          }
        }
      }
    });
  }
  
  // Nuevo método para cargar datos cuando cambia la tab
  loadDataIfNeeded(): void {
  
    
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
    // Si ya se cargaron los datos, no volver a cargar
    if (this.dataLoaded) {
      return;
    }
    
    // Activar indicador de carga
    this.isLoading = true;
    this.dataLoaded = false;
    
    if (!this.currentUserId) {
      console.error('No se puede cargar datos sin un ID de usuario');
      this.isLoading = false;
      this.dataLoaded = true;
      return;
    }
    
    // Cargar datos personales usando el servicio
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
        
        // Obtener el email del usuario actual para asegurarnos de tenerlo
        const currentUser = this.authService.getCurrentUserSync();
        const userEmail = currentUser?.email || '';
        
        if (personalData) {
          // Rellenar formulario con datos recibidos
          if (personalData.photoUrl) {
            this.profilePicture = this.ensureCompleteUrl(personalData.photoUrl);
          }
          
          this.personalDataForm.patchValue({
            fullName: personalData.name || '',
            email: personalData.email || userEmail,
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
            email: userEmail
          });
        }
      },
      error: (error) => {
        console.error('Error al cargar datos personales:', error);
        // Llenar solo el email en caso de error
        const currentUser = this.authService.getCurrentUserSync();
        if (currentUser?.email) {
          this.personalDataForm.patchValue({
            email: currentUser.email
          });
        }
        
        // Mostrar mensaje de error
        this.snackBar.open('Error al cargar datos personales', 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  loadAddress(): void {
    // Si ya se cargaron los datos de dirección, no volver a cargar
    if (this.addressDataLoaded) {
      return;
    }
    
    this.addressService.getAddressByUserUid(this.currentUserId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          if (error.status !== 404) {
          } else {
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
          const photoUrl = this.ensureCompleteUrl(response.photoUrl);
          this.profilePicture = photoUrl;
          
          // Actualizar el usuario en el AuthService para que se refleje en toda la aplicación
          if (user) {
            const updatedUser = { ...user, photoURL: photoUrl };
            this.authService.updateCurrentUser(updatedUser);
          }
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
    // Considera el campo inválido incluso si solo está tocado (más estricto)
    return !!control && control.invalid && control.touched;
  }
  
  onSubmit(): void {
    // Si el formulario no es válido, marcar todos los campos como tocados
    if (this.personalDataForm.invalid) {
      this.personalDataForm.markAllAsTouched();
      return;
    }
    
    this.isLoading = true;
    
    // Construir el DTO con los datos del formulario
    const userData: PersonalDataUserDto = {
      uid: this.currentUserId,
      name: this.personalDataForm.get('fullName')?.value,
      email: this.personalDataForm.get('email')?.value,
      birthDate: this.personalDataForm.get('birthDate')?.value,
      documentType: this.personalDataForm.get('documentType')?.value,
      documentNumber: this.personalDataForm.get('documentNumber')?.value,
      jobTitle: this.personalDataForm.get('jobTitle')?.value,
      department: this.personalDataForm.get('department')?.value,
      photoUrl: this.profilePicture || ''
    };

    // Guardar los datos del usuario
    this.profileService.updateOrCreatePersonalData(this.currentUserId, userData)
      .pipe(
        finalize(() => this.isLoading = false),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response: PersonalDataUserDto) => {
          console.log('Datos personales actualizados:', response);
          this.formSubmitted.emit(userData);
          
          // Mostrar mensaje de éxito mejorado
          this.snackBar.open('¡Información personal guardada con éxito!', 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['success-snackbar', 'custom-notification']
          });
        },
        error: (error: any) => {
          console.error('Error al actualizar datos personales:', error);
          this.snackBar.open('Error al guardar la información personal', 'Cerrar', {
            duration: 3000,
            panelClass: ['error-snackbar']
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
    const birthDateControl = this.personalDataForm.get('birthDate');
    if (!birthDateControl) return '';
    
    if (birthDateControl.hasError('required')) {
      return 'La fecha de nacimiento es requerida';
    }
    
    if (birthDateControl.hasError('minAge')) {
      return `Debes tener al menos 18 años de edad`;
    }
    
    if (birthDateControl.hasError('invalidDate') || birthDateControl.hasError('invalidDateFormat')) {
      return 'El formato de fecha debe ser DD/MM/AAAA';
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
      this.loadDataIfNeeded();
    }
    
    if (changes['shouldLoadData'] && changes['shouldLoadData'].currentValue === true && this.isActiveTab) {
      this.loadDataIfNeeded();
    }
  }
}