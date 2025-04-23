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
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('ProviderTypeSelectionComponent - ngOnInit - initialType:', this.initialType);
    
    // Intentar cargar el tipo desde el servicio si no fue proporcionado como input
    if (!this.initialType) {
      const typeFromService = this.providerTypeService.getCurrentProviderType();
      console.log('Tipo de proveedor desde el servicio:', typeFromService);
      
      if (typeFromService) {
        this.initialType = typeFromService;
        console.log('Utilizando tipo desde servicio:', this.initialType);
      } else {
        // Si no hay tipo en el servicio, intentar cargar datos de empresa para inferir
        this.checkCompanyData();
      }
    }
    
    this.updateSelectedType();
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
    if (this.initialType) {
      console.log('Setting selectedType to initialType:', this.initialType);
      this.selectedType = this.initialType;
      
      // Forzar la detección inmediata para que la UI se actualice
      setTimeout(() => {
        // Verificar que la selección fue efectiva
        console.log('Verificando selección efectiva, selectedType ahora es:', this.selectedType);
      }, 0);
    } else {
      console.log('No initialType provided, selectedType remains:', this.selectedType);
    }
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
    // Log para depuración
    console.log(`Checking if ${type} is selected:`, result, 'Current selectedType:', this.selectedType);
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

    // For individual provider type, we need to submit to the backend directly
    if (this.selectedType === 'INDIVIDUAL') {
      // Create minimal company data with provider type
      const emptyCompanyData = {
        name: '',
        legalName: '',
        taxId: '',
        phone: '',
        email: currentUser.email || '',
        website: '',
        contactPerson: '',
        country: 0,
        providerType: 'INDIVIDUAL' as 'INDIVIDUAL' // Type assertion to match expected type
      };

      console.log('Saving INDIVIDUAL provider type to backend');
      // Submit directly to backend to store provider type
      this.companyService.createOrUpdateCompanyInfo(currentUser.uid, emptyCompanyData)
        .subscribe({
          next: () => {
            console.log('Successfully saved INDIVIDUAL provider type');
            // Actualizar también el servicio
            this.providerTypeService.setProviderType('INDIVIDUAL', true);
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