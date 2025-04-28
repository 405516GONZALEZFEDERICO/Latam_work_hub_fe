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
  console.log('ProviderTypeSelectionComponent - ngOnInit');
  
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
            console.log('Tipo de proveedor obtenido del backend:', response.providerType);
            this.selectedType = response.providerType;
            this.providerTypeService.setProviderType(response.providerType, true);
            localStorage.setItem('providerType', response.providerType);
          } else {
            // Si no hay tipo en el backend, intentar obtener de localStorage
            const storedType = localStorage.getItem('providerType');
            if (storedType === 'INDIVIDUAL' || storedType === 'COMPANY') {
              console.log('Tipo de proveedor obtenido de localStorage:', storedType);
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
      console.log('AfterViewInit - Verificando selección final:', this.selectedType);
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('ProviderTypeSelectionComponent - ngOnChanges', changes);
    if (changes['initialType']) {
      console.log('initialType changed from', changes['initialType'].previousValue, 'to', changes['initialType'].currentValue);
      this.updateSelectedType();
    }
  }

  private checkCompanyData(): void {
    console.log('Verificando si existen datos de empresa...');
    const currentUser = this.authService.getCurrentUserSync();
    if (!currentUser?.uid) return;
    
    this.isLoading = true;
    this.companyService.getCompanyInfo(currentUser.uid).subscribe({
      next: (companyData) => {
        this.isLoading = false;
        if (companyData && Object.keys(companyData).length > 0) {
          console.log('Datos de empresa encontrados:', companyData);
          // Si hay datos de empresa, seleccionar tipo COMPANY
          this.selectedType = 'COMPANY';
          this.initialType = 'COMPANY';
          
          // También actualizar el servicio
          this.providerTypeService.setProviderType('COMPANY', true);
          console.log('Tipo COMPANY establecido basado en datos de empresa existentes');
        }
      },
      error: () => {
        this.isLoading = false;
        console.log('No se encontraron datos de empresa');
      }
    });
  }

  private updateSelectedType(): void {
    console.log('updateSelectedType: initialType =', this.initialType, 'selectedType =', this.selectedType);
    
    // Verificar primero localStorage como fuente prioritaria
    const storedType = localStorage.getItem('providerType');
    if (storedType === 'INDIVIDUAL' || storedType === 'COMPANY') {
      console.log('Usando tipo desde localStorage en updateSelectedType:', storedType);
      this.selectedType = storedType as 'INDIVIDUAL' | 'COMPANY';
      
      // Si no hay initialType, también actualizarlo
      if (!this.initialType) {
        this.initialType = this.selectedType;
      }
    }
    // Si hay initialType pero no selectedType o son diferentes
    else if (this.initialType && (!this.selectedType || this.initialType !== this.selectedType)) {
      console.log('Setting selectedType to initialType:', this.initialType);
      this.selectedType = this.initialType;
    }
    
    // Verificar tipo en el servicio como respaldo
    const typeFromService = this.providerTypeService.getCurrentProviderType();
    if (typeFromService && !this.selectedType) {
      console.log('Recuperando tipo desde servicio como último recurso:', typeFromService);
      this.selectedType = typeFromService;
    }
    
    // Forzar la detección inmediata para que la UI se actualice
    setTimeout(() => {
      // Verificar que la selección fue efectiva
      console.log('Verificando selección efectiva, selectedType ahora es:', this.selectedType);
      
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
    console.log('User selected type:', type);
    if (this.isLoading) return;
    if (this.selectedType === type) return; // Don't reselect same type
    
    this.selectedType = type;
    this.error = null;
    
    // Log para confirmar la selección
    console.log('Type successfully selected:', this.selectedType);
  }

  isSelected(type: 'INDIVIDUAL' | 'COMPANY'): boolean {
    const result = this.selectedType === type;
    // Log detallado para depuración
    console.log(`Checking if ${type} is selected. Current selectedType:`, this.selectedType, 'Result:', result);
    console.log('Stored provider type in localStorage:', localStorage.getItem('providerType'));
    return result;
  }

  continue(): void {
    console.log('Continue clicked with selectedType:', this.selectedType);
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
    console.log(`Tipo de proveedor "${this.selectedType}" guardado en localStorage`);

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

      console.log('Saving INDIVIDUAL provider type to backend with data:', emptyCompanyData);
      // Submit directly to backend to store provider type
      this.companyService.createOrUpdateCompanyInfo(currentUser.uid, emptyCompanyData)
        .subscribe({
          next: (response) => {
            console.log('Successfully saved INDIVIDUAL provider type, response:', response);
            // Save to localStorage to ensure persistence
            this.providerTypeService.setProviderType('INDIVIDUAL', true);
            
            // Mostrar información de depuración adicional
            console.log('Estado actual:');
            console.log('- localStorage providerType:', localStorage.getItem('providerType'));
            console.log('- Servicio providerType:', this.providerTypeService.getCurrentProviderType());
            console.log('- Componente selectedType:', this.selectedType);
            
            // Force reload from backend to verify it was saved
            setTimeout(() => {
              this.providerTypeService.loadProviderType();
              
              // Verificar que la card se actualizó correctamente
              setTimeout(() => {
                console.log('Verificación final:');
                console.log('- localStorage providerType:', localStorage.getItem('providerType'));
                console.log('- Servicio providerType:', this.providerTypeService.getCurrentProviderType());
                console.log('- Componente selectedType:', this.selectedType);
              }, 500);
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
      console.log('Emitting COMPANY provider type selection');
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