// provider-type-selection.component.ts
import { Component, EventEmitter, Output, Input, OnInit, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CompanyService } from '../../../services/company/company.service';
import { AuthService } from '../../../services/auth-service/auth.service';
import { Router } from '@angular/router';
import { ProfileTab } from '../../../models/profile-tab.enum';
import { ProviderTypeService } from '../../../services/provider.service/provider-type.service';
import { ProfileService } from '../../../services/profile/profile.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-provider-type-selection',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './provider-type-selection.component.html',
  styleUrls: ['./provider-type-selection.component.css']
})
export class ProviderTypeSelectionComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() userRole: string = 'PROVEEDOR';
  @Input() initialType: 'INDIVIDUAL' | 'COMPANY' | null = null;
  @Output() tabChange = new EventEmitter<ProfileTab>();
  @Output() typeSelected = new EventEmitter<'INDIVIDUAL' | 'COMPANY'>();

  selectedType: 'INDIVIDUAL' | 'COMPANY' | null = null;
  isLoading = false;
  error: string | null = null;

  constructor(
    private companyService: CompanyService,
    private authService: AuthService,
    private providerTypeService: ProviderTypeService,
    private profileService: ProfileService,
    private router: Router
  ) {}

 // ...existing code...

ngOnInit(): void {

  // Obtener usuario actual
  const currentUser = this.authService.getCurrentUserSync();
  if (currentUser?.uid) {
    this.isLoading = true;
    
    // Primero intentar obtener el tipo del backend
    this.profileService.getProviderType(currentUser.uid)
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response) => {
          if (response.providerType) {
            this.selectedType = response.providerType;
            this.providerTypeService.setProviderType(response.providerType, true);
            localStorage.setItem('providerType', response.providerType);
          } else {
            // Si no hay tipo en el backend, intentar obtener de localStorage
            const storedType = localStorage.getItem('providerType');
            if (storedType === 'INDIVIDUAL' || storedType === 'COMPANY') {
              this.selectedType = storedType;
              this.providerTypeService.setProviderType(storedType, true);
            }
          }
        },
        error: (error) => {
          console.error('Error al obtener tipo de proveedor:', error);
          // En caso de error, intentar obtener de localStorage
          const storedType = localStorage.getItem('providerType');
          if (storedType === 'INDIVIDUAL' || storedType === 'COMPANY') {
            this.selectedType = storedType;
            this.providerTypeService.setProviderType(storedType, true);
          }
        }
      });
  }
}
  
  ngAfterViewInit(): void {
    // Forzar actualización visual después de que la vista esté lista
    setTimeout(() => {
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialType']) {
      this.updateSelectedType();
    }
  }

  private checkCompanyData(): void {
    const currentUser = this.authService.getCurrentUserSync();
    if (!currentUser?.uid) return;
    
    this.isLoading = true;
    this.companyService.getCompanyInfo(currentUser.uid).subscribe({
      next: (companyData) => {
        this.isLoading = false;
        if (companyData && Object.keys(companyData).length > 0) {
          // Si hay datos de empresa, seleccionar tipo COMPANY
          this.selectedType = 'COMPANY';
          this.initialType = 'COMPANY';
          
          // También actualizar el servicio
          this.providerTypeService.setProviderType('COMPANY', true);
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private updateSelectedType(): void {
    
    // Verificar primero localStorage como fuente prioritaria
    const storedType = localStorage.getItem('providerType');
    if (storedType === 'INDIVIDUAL' || storedType === 'COMPANY') {
      this.selectedType = storedType as 'INDIVIDUAL' | 'COMPANY';
      
      // Si no hay initialType, también actualizarlo
      if (!this.initialType) {
        this.initialType = this.selectedType;
      }
    }
    // Si hay initialType pero no selectedType o son diferentes
    else if (this.initialType && (!this.selectedType || this.initialType !== this.selectedType)) {
      this.selectedType = this.initialType;
    }
    
    // Verificar tipo en el servicio como respaldo
    const typeFromService = this.providerTypeService.getCurrentProviderType();
    if (typeFromService && !this.selectedType) {
      this.selectedType = typeFromService;
    }
    
    // Forzar la detección inmediata para que la UI se actualice
    setTimeout(() => {
      // Verificar que la selección fue efectiva
      
      // Actualizar DOM para forzar re-renderizado
      if (this.selectedType) {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
          if (card.classList.contains('selected')) {
            // Forzar reflujo del DOM usando HTMLElement
            void (card as HTMLElement).offsetWidth;
          }
        });
      }
    }, 0);
  }

  selectType(type: 'INDIVIDUAL' | 'COMPANY'): void {
    if (this.isLoading) return;
    if (this.selectedType === type) return; // Don't reselect same type
    
    this.selectedType = type;
    this.error = null;
    
  }

  isSelected(type: 'INDIVIDUAL' | 'COMPANY'): boolean {
    const result = this.selectedType === type;
    return result;
  }

  continue(): void {
    if (!this.selectedType || this.isLoading) return;
    
    const currentUser = this.authService.getCurrentUserSync();
    if (!currentUser?.uid) {
      this.error = 'Usuario no identificado';
      return;
    }

    this.isLoading = true;
    this.error = null;

    // Guardar explícitamente en localStorage para asegurar persistencia
    localStorage.setItem('providerType', this.selectedType);

    // For individual provider type, we need to submit to the backend directly
    if (this.selectedType === 'INDIVIDUAL') {
      // Create minimal company data with provider type - Make sure it has all required fields
      const emptyCompanyData = {
        name: 'Individual Provider', // Provide a default name for the backend
        legalName: currentUser.displayName || 'Individual Provider',
        taxId: '',
        phone: '',
        email: currentUser.email || '',
        website: '',
        contactPerson: currentUser.displayName || '',
        country: 0,
        providerType: 'INDIVIDUAL' as 'INDIVIDUAL'
      };

      // Submit directly to backend to store provider type
      this.companyService.createOrUpdateCompanyInfo(currentUser.uid, emptyCompanyData)
        .subscribe({
          next: (response) => {
            // Save to localStorage to ensure persistence
            this.providerTypeService.setProviderType('INDIVIDUAL', true);
            
            
            // Force reload from backend to verify it was saved
            setTimeout(() => {
              this.providerTypeService.loadProviderType();
            }, 500);
            
            // Emit the selected type on success
            this.typeSelected.emit(this.selectedType!); // Non-null assertion
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Error saving provider type:', err);
            this.error = 'Error al guardar el tipo de proveedor';
            this.isLoading = false;
          }
        });
    } else {
      // Actualizar también el servicio
      this.providerTypeService.setProviderType('COMPANY', true);
      // For company type, just emit the type and let the company form handle it
      this.typeSelected.emit(this.selectedType);
      this.isLoading = false;
    }
  }

  canShowBackButton(): boolean {
    return false;
  }

  goBack(): void {
    this.tabChange.emit(ProfileTab.PERSONAL);
  }
}