import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfileData, ProfileService } from '../../../services/profile/profile.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

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
  @Output() profileUpdated = new EventEmitter<ProfileData>();
  
  personalDataForm!: FormGroup;
  isLoading = false;
  submitted = false;
  profilePicture: string | null = null;
  selectedFile: File | null = null;
  
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
    private snackBar: MatSnackBar
  ) {}
  
  ngOnInit(): void {
    this.initForm();
  }
  
  private initForm(): void {
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
    this.submitted = true;
    
    if (this.personalDataForm.invalid) {
      return;
    }
    
    this.isLoading = true;
    
    // Map form values to profile data structure
    const profileData: Partial<ProfileData> = {
      fullName: this.personalDataForm.value.fullName,
      email: this.personalDataForm.value.email,
      birthDate: this.personalDataForm.value.birthDate,
      documentType: this.personalDataForm.value.documentType,
      documentNumber: this.personalDataForm.value.documentNumber,
      jobTitle: this.personalDataForm.value.jobTitle,
      department: this.personalDataForm.value.department
    };
    
    // If there's a selected image, upload it first
    if (this.selectedFile) {
      this.profileService.uploadProfileImage(this.selectedFile).subscribe({
        next: (imageUrl) => {
          if (imageUrl) {
            this.saveProfileData({ ...profileData, photoUrl: imageUrl });
          } else {
            this.saveProfileData(profileData);
          }
        },
        error: (error) => {
          console.error('Error al subir imagen:', error);
          this.isLoading = false;
          this.snackBar.open('Error al subir la imagen. Intenta nuevamente.', 'Cerrar', {
            duration: 3000
          });
          this.saveProfileData(profileData);
        }
      });
    } else {
      this.saveProfileData(profileData);
    }
  }
  
  private saveProfileData(profileData: Partial<ProfileData>): void {
    this.profileService.savePersonalData(profileData).subscribe({
      next: (updatedProfile) => {
        this.isLoading = false;
        this.formSubmitted.emit(profileData);
        this.profileUpdated.emit(updatedProfile);
        
        this.snackBar.open('Datos personales guardados correctamente', 'OK', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error al guardar perfil:', error);
        this.isLoading = false;
        
        this.snackBar.open('Error al guardar datos. Intenta nuevamente.', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }
} 