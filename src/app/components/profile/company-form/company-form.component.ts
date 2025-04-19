import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserRole } from '../../../models/user';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './company-form.component.html',
  styleUrls: ['./company-form.component.css']
})
export class CompanyFormComponent implements OnInit {
  @Input() userRole: UserRole = 'CLIENTE';
  @Output() back = new EventEmitter<void>();
  @Output() formSubmitted = new EventEmitter<any>();
  
  companyForm!: FormGroup;
  isSubmitting = false;
  
  countries = [
    { code: 'AR', name: 'Argentina' },
    { code: 'BR', name: 'Brasil' },
    { code: 'CL', name: 'Chile' },
    { code: 'CO', name: 'Colombia' },
    { code: 'MX', name: 'México' },
    { code: 'PE', name: 'Perú' },
    { code: 'UY', name: 'Uruguay' }
  ];
  
  constructor(private fb: FormBuilder) {}
  
  ngOnInit(): void {
    this.initForm();
    console.log('CompanyFormComponent inicializado');
    console.log('¿Tiene observadores el evento back?:', this.back.observed);
    console.log('Rol de usuario:', this.userRole);
  }
  
  initForm(): void {
    this.companyForm = this.fb.group({
      name: ['', Validators.required],
      legalName: ['', Validators.required],
      taxId: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      website: [''],
      contactPerson: [''],
      country: ['', Validators.required]
    });
  }
  
  get formControls() {
    return this.companyForm.controls;
  }
  
  goBack(): void {
    this.back.emit();
  }
  
  canShowBackButton(): boolean {
    return this.back.observed && (this.userRole === 'CLIENTE' || this.userRole === 'ADMIN' || this.userRole === 'PROVEEDOR');
  }
  
  onSubmit(): void {
    if (this.companyForm.valid) {
      this.isSubmitting = true;
      
      // Emit form data
      this.formSubmitted.emit(this.companyForm.value);
      
      // Reset form submission state after a delay (simulating API call)
      setTimeout(() => {
        this.isSubmitting = false;
      }, 1000);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.companyForm.controls).forEach(key => {
        const control = this.companyForm.get(key);
        if (control) control.markAsTouched();
      });
    }
  }
} 