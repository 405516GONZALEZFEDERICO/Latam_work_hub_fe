import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ProfileService } from '../../../services/profile/profile.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface CompanyData {
  name: string;
  legalName: string;
  taxId: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  contactPerson: string;
  country: any;
  operatingCountries: string[];
}

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatChipsModule,
    MatAutocompleteModule
  ],
  templateUrl: './company-form.component.html',
  styleUrls: ['./company-form.component.scss']
})
export class CompanyFormComponent implements OnInit {
  @Input() initialData: Partial<CompanyData> = {};
  @Output() saved = new EventEmitter<boolean>();
  @Output() formSubmitted = new EventEmitter<CompanyData>();
  @Output() back = new EventEmitter<void>();
  
  companyForm!: FormGroup;
  isSubmitting = false;
  
  // Datos demo para países (normalmente vendrían de un servicio)
  countries = [
    { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Chile' },
    { code: 'CO', name: 'Colombia' },
    { code: 'MX', name: 'México' },
    { code: 'PE', name: 'Perú' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'VE', name: 'Venezuela' }
  ];
  
  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}
  
  ngOnInit(): void {
    this.initForm();
  }
  
  
  private initForm(): void {
    this.companyForm = this.fb.group({
      name: [this.initialData.name || '', Validators.required],
      legalName: [this.initialData.legalName || '', Validators.required],
      taxId: [this.initialData.taxId || '', Validators.required],
      phone: [this.initialData.phone || '', Validators.required],
      email: [this.initialData.email || '', [Validators.required, Validators.email]],
      website: [this.initialData.website || ''],
      description: [this.initialData.description || ''],
      contactPerson: [this.initialData.contactPerson || ''],
      country: [this.initialData.country || null, Validators.required],
      operatingCountries: [this.initialData.operatingCountries || []]
    });
  }
  
  get formControls() {
    return this.companyForm.controls;
  }
  
  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  
  showMessage(message: string) {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
  
  removeOperatingCountry(countryCode: string): void {
    const countries = this.companyForm.get('operatingCountries')?.value as string[];
    if (countries) {
      const index = countries.indexOf(countryCode);
      if (index >= 0) {
        countries.splice(index, 1);
        this.companyForm.get('operatingCountries')?.setValue([...countries]);
      }
    }
  }
  
  addOperatingCountry(countryCode: string): void {
    const countries = this.companyForm.get('operatingCountries')?.value as string[] || [];
    if (!countries.includes(countryCode)) {
      countries.push(countryCode);
      this.companyForm.get('operatingCountries')?.setValue([...countries]);
    }
  }
  
  getCountryName(code: string): string {
    const country = this.countries.find(c => c.code === code);
    return country ? country.name : code;
  }
  
  goBack(): void {
    this.back.emit();
  }
  
  onSubmit(): void {
    if (this.companyForm.invalid) {
      this.markFormGroupTouched(this.companyForm);
      return;
    }
    
    this.isSubmitting = true;
    
    const companyData: CompanyData = {
      name: this.companyForm.value.name,
      legalName: this.companyForm.value.legalName,
      taxId: this.companyForm.value.taxId,
      phone: this.companyForm.value.phone,
      email: this.companyForm.value.email,
      website: this.companyForm.value.website,
      description: this.companyForm.value.description,
      contactPerson: this.companyForm.value.contactPerson,
      country: this.companyForm.value.country,
      operatingCountries: this.companyForm.value.operatingCountries
    };
    
    // Save the company data
    this.profileService.saveCompanyData(companyData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.formSubmitted.emit(companyData);
        this.saved.emit(true);
        this.showMessage('Información de empresa guardada correctamente');
        this.router.navigate(['/home']);
      },
      error: (error) => {
        console.error('Error saving company data:', error);
        this.isSubmitting = false;
        this.showMessage('Error al guardar la información de empresa');
      }
    });
  }
} 