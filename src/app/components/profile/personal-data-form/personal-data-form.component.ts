import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfileData } from '../../../models/profile';
import { ProfileService } from '../../../services/profile/profile.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth-service/auth.service';
import { User, UserRole } from '../../../models/user';

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
    MatNativeDateModule
  ],
  templateUrl: './personal-data-form.component.html',
  styleUrls: ['./personal-data-form.component.scss']
})
export class PersonalDataFormComponent implements OnInit {
  @Input() initialData: Partial<ProfileData> = {};
  @Output() formSubmitted = new EventEmitter<Partial<ProfileData>>();
  
  personalDataForm!: FormGroup;
  isLoading = false;
  submitted = false;
  profilePicture: string | null = null;
  selectedFile: File | null = null;
  currentUser: User | null = null;
  
  // Opciones para el tipo de documento
  documentTypes = [
    { value: 'DNI', label: 'DNI' },
    { value: 'PASSPORT', label: 'Pasaporte' },
    { value: 'DRIVERS_LICENSE', label: 'Licencia de conducir' },
    { value: 'OTHER', label: 'Otro' }
  ];
  
  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private snackBar: MatSnackBar,
    private router: Router,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    this.initForm();
    // Add auth state listener
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }
  
  private initForm(): void {
    // Same as before
    this.personalDataForm = this.fb.group({
      fullName: [
        this.initialData.fullName || '', 
        [Validators.required]
      ],
      email: [
        this.initialData.email || '', 
        [Validators.required, Validators.email]
      ],
      birthDate: [
        this.initialData.birthDate || null,
        [Validators.required]
      ],
      documentType: [
        this.initialData.documentType || '',
        [Validators.required]
      ],
      documentNumber: [
        this.initialData.documentNumber || '',
        [Validators.required]
      ],
      jobTitle: [
        this.initialData.jobTitle || '',
        []
      ],
      department: [
        this.initialData.department || '',
        []
      ]
    });
    
    if (this.initialData.photoUrl) {
      this.profilePicture = this.initialData.photoUrl;
    }
  }
  
  // Property getter for easy access to form fields
  get formControls() {
    return this.personalDataForm.controls;
  }
  
  // Check if a field is invalid
  isFieldInvalid(fieldName: string): boolean {
    const field = this.personalDataForm.get(fieldName);
    return (field?.invalid && (field?.touched || this.submitted)) || false;
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.profilePicture = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
      
      // Show success message
      this.snackBar.open('Imagen seleccionada correctamente', 'Cerrar', {
        duration: 2000
      });
    }
  }
  
   
  onSubmit(): void {
    console.log('Form submission started');
    this.submitted = true;
    
    if (this.personalDataForm.invalid) {
      console.log('Form is invalid, stopping submission');
      return;
    }
    
    // Check if user is authenticated before proceeding
    if (!this.authService.isAuthenticated()) {
      console.log('User not authenticated');
      this.snackBar.open('Sesión no válida. Por favor inicia sesión nuevamente.', 'Cerrar', {
        duration: 3000
      });
      this.router.navigate(['/login']);
      return;
    }
    
    // Verify user has required role
    const userRole = this.authService.getUserRole();
    console.log('Current user role:', userRole);
    if (!userRole || (userRole !== 'CLIENTE' && userRole !== 'PROVEEDOR')) {
      console.log('User does not have required role');
      this.snackBar.open('No tienes permisos para realizar esta acción.', 'Cerrar', {
        duration: 3000
      });
      return;
    }
    
    this.isLoading = true;
    
    // Map form values to profile data structure
    const profileData = {
      fullName: this.personalDataForm.value.fullName,
      email: this.personalDataForm.value.email,
      birthDate: this.personalDataForm.value.birthDate,
      documentType: this.personalDataForm.value.documentType,
      documentNumber: this.personalDataForm.value.documentNumber,
      jobTitle: this.personalDataForm.value.jobTitle,
      department: this.personalDataForm.value.department
    };
    
    console.log('Form data prepared:', profileData);
    
    // Refresh token and save data
 
    this.saveProfileData(profileData);
     
      
  }
  
  private uploadImageAndSaveData(profileData: any): void {
    if (!this.selectedFile) {
      this.saveProfileData(profileData);
      return;
    }
    
    this.profileService.uploadProfileImage(this.selectedFile).subscribe({
      next: (imageUrl) => {
        if (imageUrl) {
          profileData.photoUrl = imageUrl;
          this.saveProfileData(profileData);
        } else {
          this.saveProfileData(profileData);
        }
      },
      error: (error) => {
        // Handle unauthorized errors specifically
        if (error.status === 403) {
          this.isLoading = false;
          this.snackBar.open('No tienes permisos para subir imágenes. Por favor inicia sesión nuevamente.', 'Cerrar', {
            duration: 3000
          });
          this.router.navigate(['/login']);
          return;
        }
        
        console.error('Error al subir imagen:', error);
        this.snackBar.open('Error al subir la imagen. Guardando datos sin imagen.', 'Cerrar', {
          duration: 3000
        });
        this.saveProfileData(profileData);
      }
    });
  }
  
  
  private saveProfileData(profileData: any): void {
    console.log('Saving profile data to backend', profileData);
    
    this.profileService.savePersonalData(profileData).subscribe({
      next: (response) => {
        console.log('Profile data saved successfully:', response);
        this.isLoading = false;
        this.formSubmitted.emit(profileData);
        
        this.snackBar.open('Datos personales guardados correctamente', 'OK', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error saving profile data. Status:', error.status, 'Message:', error.message);
        // Handle unauthorized errors specifically
        if (error.status === 403) {
          this.isLoading = false;
          this.snackBar.open('No tienes permisos para guardar datos. Por favor inicia sesión nuevamente.', 'Cerrar', {
            duration: 3000
          });
          this.router.navigate(['/login']);
          return;
        }
        
        this.isLoading = false;
        this.snackBar.open('Error al guardar los datos. Por favor intenta nuevamente.', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }
} 