import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ProfileData, ProfileService } from '../../../services/profile/profile.service';
import { PersonalDataFormComponent } from '../personal-data-form/personal-data-form.component';
import { CompanyFormComponent } from '../company-form/company-form.component';
import { ProviderTypeSelectionComponent } from '../provider-type-selection/provider-type-selection.component';
import { UserRole } from '../../../models/user';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

enum ProfileTab {
  PERSONAL = 0,
  PROVIDER_OR_COMPANY = 1
}

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    PersonalDataFormComponent,
    CompanyFormComponent,
    ProviderTypeSelectionComponent
  ],
  templateUrl: './complete-profile.component.html',
  styleUrls: ['./complete-profile.component.scss']
})
export class CompleteProfileComponent implements OnInit {
  userData: ProfileData = {
    email: '',
    role: 'DEFAULT' as UserRole,
    profileCompletion: 0
  };
  
  activeTab = ProfileTab.PERSONAL;
  isAssociatedWithCompany = false;
  showProviderSelection = true;
  providerType?: 'INDIVIDUAL' | 'COMPANY';
  
  // Controla si se muestra el botón volver en el selector de tipo de proveedor
  showBackButton = false;
  
  constructor(
    private profileService: ProfileService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}
  
  ngOnInit(): void {
    // Determinar la pestaña activa basada en los datos de la ruta
    this.route.data.subscribe(data => {
      if (data['activeTab'] === 'company') {
        this.activeTab = ProfileTab.PROVIDER_OR_COMPANY;
        this.showProviderSelection = false; // Mostrar directamente el formulario de empresa
        this.providerType = 'COMPANY';
        this.showBackButton = true; // Mostrar el botón volver cuando venimos directamente a la pestaña de empresa
      } else if (data['activeTab'] === 'personal') {
        this.activeTab = ProfileTab.PERSONAL;
        this.showBackButton = false; // No mostrar el botón volver en la pestaña personal
      }
    });
    
    this.loadUserProfile();
  }
  
  loadUserProfile(): void {
    this.profileService.getProfileData().subscribe(
      profile => {
        this.userData = profile;
        
        // Si el usuario ya tiene perfil de empresa, actualizamos el estado
        if (profile.companyData) {
          this.isAssociatedWithCompany = true;
          
          if (this.isProviderRole() && profile.providerType) {
            this.providerType = profile.providerType;
            this.showProviderSelection = false;
          }
        }
        
        // Si el usuario es proveedor y ya tiene un tipo definido pero no se muestra el formulario adecuado
        if (this.isProviderRole() && profile.providerType) {
          this.providerType = profile.providerType;
          if (this.providerType === 'COMPANY') {
            this.showProviderSelection = false;
          }
        }
        
        // Si venimos directamente a la pestaña de empresa, asegurarnos de que no muestre la selección de proveedor
        if (this.activeTab === ProfileTab.PROVIDER_OR_COMPANY && this.route.snapshot.data['activeTab'] === 'company') {
          this.showProviderSelection = false;
          this.providerType = 'COMPANY';
          this.showBackButton = true; // Mostrar el botón volver
        }
      }
    );
  }
  
  isProviderRole(): boolean {
    return this.userData.role === 'PROVIDER' as UserRole;
  }
  
  handleProviderTypeSelection(type: string): void {
    const providerType = type === 'individual' ? 'INDIVIDUAL' : 'COMPANY';
    this.providerType = providerType;
  }
  
  handleProviderTypeSaved(saved: boolean): void {
    if (saved && this.providerType) {
      // Actualizar el tipo de proveedor en el backend
      this.profileService.updateProviderType(this.providerType).subscribe({
        next: () => {
          this.showMessage('Tipo de proveedor guardado correctamente');
          // Si seleccionó empresa, mostrar el formulario de empresa
          if (this.providerType === 'COMPANY') {
            this.showProviderSelection = false;
          } else {
            // Si es proveedor individual, redirigir al home
            this.router.navigate(['/home']);
          }
        },
        error: (error) => {
          console.error('Error al guardar el tipo de proveedor:', error);
          this.showMessage('Error al guardar el tipo de proveedor');
        }
      });
    }
  }
  
  backToProviderSelection(): void {
    this.showProviderSelection = true;
  }
  
  setActiveTab(index: number): void {
    this.activeTab = index;
  }
  
  private showMessage(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000
    });
  }
}
