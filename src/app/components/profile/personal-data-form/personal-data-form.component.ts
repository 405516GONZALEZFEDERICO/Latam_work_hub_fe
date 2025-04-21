import { Component, EventEmitter, OnInit, Output, ViewEncapsulation, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
    MatIconModule
  ],
  templateUrl: './personal-data-form.component.html',
  styleUrls: ['./personal-data-form.component.css'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es' },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]
})
export class PersonalDataFormComponent implements OnInit, OnDestroy {
  @Output() formSubmitted = new EventEmitter<any>();
  @Output() profileDataLoaded = new EventEmitter<any>();
  
  personalDataForm: FormGroup;
  profilePicture: string | null = null;
  isLoading = false;
  currentUserId: string = '';
  dataLoaded = false;
  
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
  
  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router,
    private location: Location
  ) {
    this.personalDataForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      birthDate: ['', Validators.required],
      documentType: ['', Validators.required],
      documentNumber: ['', Validators.required],
      jobTitle: [''],
      department: ['']
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
  }
  
  ngOnInit(): void {
    // Añadir clases para prevenir scroll
    document.body.classList.add('no-scroll-form');
    
    const user = this.authService.getCurrentUserSync();
    if (user && user.uid) {
      this.currentUserId = user.uid;
      
      // Solo cargar los datos del usuario si no se han cargado previamente
      if (!this.dataLoaded) {
        this.loadUserData();
      }
    } else {
      this.snackBar.open('No se pudo identificar el usuario actual', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-error']
      });
    }
  }
  
  // Cargar datos del usuario
  loadUserData(): void {
    if (this.dataLoaded) {
      console.log('PersonalDataFormComponent: Datos ya cargados, evitando petición adicional');
      return;
    }

    this.isLoading = true; // Muestra un indicador de carga mientras se obtienen los datos
    console.log('PersonalDataFormComponent: Cargando datos del usuario:', this.currentUserId);
    
    this.profileService.getPersonalData(this.currentUserId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.isLoading = false;
          console.error('Error al obtener datos personales:', error);
          this.snackBar.open('Error al cargar los datos personales', 'Cerrar', { duration: 3000 });
          return EMPTY;
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(data => {
        console.log('PersonalDataFormComponent: Datos de perfil cargados:', data);
        this.dataLoaded = true;
        
        // Convertir la fecha a un objeto Date para que funcione correctamente con el datepicker
        let birthDateObj = null;
        if (data.birthDate) {
          // Corregir el problema de la zona horaria al convertir a objeto Date
          // Usar split y crear la fecha con año, mes, día para evitar ajustes de zona horaria
          const parts = data.birthDate.split('-');
          if (parts.length === 3) {
            // Crear fecha usando año, mes (0-based), día y forzar hora local
            birthDateObj = new Date(
              parseInt(parts[0]), 
              parseInt(parts[1]) - 1, 
              parseInt(parts[2]), 
              12, 0, 0
            );
          } else {
            // Fallback si el formato no es el esperado
            birthDateObj = new Date(data.birthDate + 'T12:00:00');
          }
        }
        
        // Actualizar el formulario con los datos recibidos
        this.personalDataForm.patchValue({
          fullName: data.name,
          email: data.email,
          birthDate: birthDateObj, // Usar el objeto Date
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          jobTitle: data.jobTitle,
          department: data.department
        });

        if (data.photoUrl) {
          this.profilePicture = this.ensureCompleteUrl(data.photoUrl);
        } else {
          console.log('No se recibió URL de imagen de perfil');
          this.profilePicture = null;
        }
        
        // Emitir los datos cargados al componente padre
        this.profileDataLoaded.emit(data);
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
    console.log('Método onSubmit() llamado');
    console.log('Estado del formulario:', this.personalDataForm.valid ? 'válido' : 'inválido');
    console.log('Valores del formulario:', this.personalDataForm.value);
    
    if (this.personalDataForm.valid) {
      this.isLoading = true;
      console.log('Formulario válido, procesando envío...');

      // Obtener el usuario actual
      const user = this.authService.getCurrentUserSync();
      console.log('Usuario actual:', user);
      
      if (!user || !user.uid) {
        this.snackBar.open('No se pudo identificar el usuario actual', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error']
        });
        console.error('No se encontró UID de usuario');
        return;
      }

      // Formatear la fecha correctamente para Java LocalDate (YYYY-MM-DD)
      let formattedBirthDate: string | null = null;
      const birthDate = this.personalDataForm.value.birthDate;
      
      if (birthDate) {
        // Si es Date object, convertir pero considerando zona horaria
        if (birthDate instanceof Date) {
          // Formato YYYY-MM-DD usando directamente getFullYear, getMonth y getDate
          // para evitar ajustes de zona horaria
          const year = birthDate.getFullYear();
          // getMonth() es 0-indexed, necesitamos sumar 1 y formatear con padding
          const month = String(birthDate.getMonth() + 1).padStart(2, '0');
          const day = String(birthDate.getDate()).padStart(2, '0');
          formattedBirthDate = `${year}-${month}-${day}`;
        } 
        // Si ya es string, verificar formato
        else if (typeof birthDate === 'string') {
          // Si ya tiene el formato correcto, usarlo directamente
          if (/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
            formattedBirthDate = birthDate;
          } else {
            // Intentar convertir otras representaciones de fecha manualmente
            try {
              const tempDate = new Date(birthDate);
              const year = tempDate.getFullYear();
              const month = String(tempDate.getMonth() + 1).padStart(2, '0');
              const day = String(tempDate.getDate()).padStart(2, '0');
              formattedBirthDate = `${year}-${month}-${day}`;
            } catch(e) {
              console.error('Error al formatear la fecha:', e);
            }
          }
        }
      }
      
      console.log('Fecha de nacimiento formateada:', formattedBirthDate);

      // Preparar los datos para enviar al backend
      const personalData: PersonalDataUserDto = {
        uid: user.uid,
        fullName: this.personalDataForm.value.fullName,
        name: this.personalDataForm.value.fullName,
        email: this.personalDataForm.value.email,
        birthDate: formattedBirthDate || undefined,
        documentType: this.personalDataForm.value.documentType,
        documentNumber: this.personalDataForm.value.documentNumber,
        jobTitle: this.personalDataForm.value.jobTitle,
        department: this.personalDataForm.value.department
      };
      
      console.log('Datos a enviar:', personalData);

      // Llamar al servicio para guardar los datos
      console.log('Llamando al servicio updateOrCreatePersonalData...');
      this.profileService.updateOrCreatePersonalData(user.uid, personalData)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            this.isLoading = false;
            console.error('Error al guardar los datos personales:', error);
            this.snackBar.open('Error al guardar los datos personales. Inténtelo de nuevo.', 'Cerrar', {
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
          console.log('Datos guardados correctamente:', response);
          this.snackBar.open('Datos personales guardados correctamente', 'Cerrar', {
            duration: 3000
          });
          
          // Emitir los datos completos
          this.formSubmitted.emit(personalData);
          
          // Comprobar si el usuario es CLIENTE para redirigir al formulario de empresa
          this.checkUserRoleAndRedirect();
        });
    } else {
      console.warn('Formulario inválido:', this.personalDataForm.errors);
      console.log('Errores por campo:');
      Object.keys(this.personalDataForm.controls).forEach(key => {
        const control = this.personalDataForm.get(key);
        if (control?.errors) {
          console.log(`Campo ${key}:`, control.errors);
        }
      });
      
      // Marcar todos los campos como tocados para mostrar errores de validación
      Object.keys(this.personalDataForm.controls).forEach(key => {
        this.personalDataForm.get(key)?.markAsTouched();
      });
      
      this.snackBar.open('Por favor complete todos los campos requeridos', 'Cerrar', {
        duration: 3000
      });
    }
  }
  
  private checkUserRoleAndRedirect(): void {
    const user = this.authService.getCurrentUserSync();
    if (user && user.role === 'CLIENTE') {
      console.log('Redirigiendo a cliente al formulario de empresa...');
      
      // Usamos varias estrategias de redirección para asegurar que funcione
      
      // 1. Usando Location para forzar un cambio de URL completo
      this.location.go('/home/profile/company');
      
      // 2. Usando Router con replaceUrl para forzar navegación
      this.router.navigate(['/home/profile/company'], { 
        replaceUrl: true,
        skipLocationChange: false,
      });
      
      // 3. Como último recurso, usar redirección mediante window.location
      setTimeout(() => {
        const baseHref = document.getElementsByTagName('base')[0].href || '/';
        const currentUrl = window.location.href;
        const baseUrl = currentUrl.split('/home')[0];
        window.location.href = baseUrl + '/home/profile/company';
      }, 300);
    }
  }
  
  // Método para redirigir si el usuario es cliente (llamado desde el HTML)
  redirectIfClient(): void {
    // Este método es un gancho para el evento click del botón
    // La lógica real se maneja en onSubmit
    if (this.isClientUser()) {
      console.log('Click detectado, redirección programada si la validación es exitosa');
    }
  }
  
  // Método para verificar si el usuario es cliente
  isClientUser(): boolean {
    const user = this.authService.getCurrentUserSync();
    return user?.role === 'CLIENTE';
  }
}