import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ProfileService } from '../../../services/profile/profile.service';
import { ProfileData } from '../../../models/profile';
import { PersonalDataFormComponent } from '../personal-data-form/personal-data-form.component';
import { CompanyFormComponent } from '../company-form/company-form.component';
import { ProviderTypeSelectionComponent, ProviderType } from '../provider-type-selection/provider-type-selection.component';
import { AddressStepperComponent } from '../address-stepper/address-stepper.component';
import { UserRole } from '../../../models/user';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Address } from '../../../models/address.model';
import { AuthService } from '../../../services/auth-service/auth.service';
import { catchError, EMPTY } from 'rxjs';

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
    ProviderTypeSelectionComponent,
    AddressStepperComponent,
    RouterModule
  ],
  templateUrl: './complete-profile.component.html',
  styleUrls: ['./complete-profile.component.css']
})
export class CompleteProfileComponent implements OnInit {
  activeTab: number = ProfileTab.PERSONAL;
  showAddressStepper: boolean = false;
  userData: ProfileData | null = null;
  addressData: Address | null = null;
  providerType: ProviderType = null;
  showProviderSelection: boolean = true;
  showBackButton: boolean = false;
  
  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    console.log('CompleteProfileComponent constructor - Initializing component');
  }
  
  ngOnInit(): void {
    console.log('CompleteProfileComponent ngOnInit - Starting initialization');
    
    // Suscribirse al observable de usuario actual para manejar cambios de autenticación
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        console.log('Usuario autenticado:', user);
        this.userData = {
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoUrl: user.photoURL || '',
          role: user.role,
          profileCompletion: 10 // Indicar que es un perfil básico
        };

        console.log('Rol del usuario en profile:', user.role);
        
        // Configuración inicial según el rol del usuario
        if (user.role === 'CLIENTE') {
          this.showProviderSelection = false;
          console.log('Usuario es CLIENTE, showProviderSelection = false');
        } else if (user.role === 'PROVEEDOR') {
          // Por defecto los proveedores deben seleccionar tipo
          this.showProviderSelection = true;
          console.log('Usuario es PROVEEDOR, showProviderSelection = true');
          
          // Verificar si el proveedor ya había seleccionado un tipo anteriormente
          if (this.userData.providerType) {
            this.providerType = this.userData.providerType === 'INDIVIDUAL' ? 'individual' : 'company';
            console.log('El proveedor ya tiene un tipo seleccionado:', this.providerType);
          }
        }

        // Cargar datos del perfil desde el backend
        this.loadProfileData();
      } else {
        // Fallback a valores por defecto si no hay usuario
        console.log('No hay usuario autenticado');
        this.userData = {
          displayName: 'Usuario',
          email: 'usuario@example.com',
          role: 'CLIENTE' as UserRole,
          profileCompletion: 0
        } as ProfileData;
        
        // Para el usuario por defecto, también establecemos showProviderSelection = false
        this.showProviderSelection = false;
        console.log('No hay usuario autenticado en profile, redirigiendo al login');
        this.router.navigate(['/login']);
      }
    });

    // Determinar la pestaña activa basada en los datos de la ruta
    this.route.data.subscribe(data => {
      console.log('Route data:', data);
      if (data['activeTab']) {
        switch (data['activeTab']) {
          case 'personal':
            this.activeTab = ProfileTab.PERSONAL;
            console.log('Activando pestaña personal');
            break;
          case 'company':
            this.activeTab = ProfileTab.PROVIDER_OR_COMPANY;
            this.showProviderSelection = false; // Mostrar formulario de empresa directamente
            console.log('Activando pestaña company, showProviderSelection = false');
            break;
          case 'provider-type':
            this.activeTab = ProfileTab.PROVIDER_OR_COMPANY;
            // Si es proveedor, mostrar selección de tipo
            if (this.isProviderRole()) {
              this.showProviderSelection = true;
              console.log('Usuario es PROVEEDOR, activando pestaña provider-type, showProviderSelection = true');
            } else {
              // Si no es proveedor, mostrar form de empresa
              this.showProviderSelection = false;
              console.log('Usuario NO es PROVEEDOR, mostrando formulario de empresa, showProviderSelection = false');
            }
            break;
          default:
            this.activeTab = ProfileTab.PERSONAL;
            console.log('Activando pestaña personal (default)');
        }
      }
    });

    // Logging para debugging
    console.log('userData en init:', this.userData);
    console.log('isProviderRole:', this.isProviderRole());
    console.log('showProviderSelection:', this.showProviderSelection);
  }

  // Método para cargar datos del perfil desde el backend
  private loadProfileData(): void {
    // Implementar aquí la lógica para cargar datos adicionales del perfil
    // Esto puede incluir llamadas a servicios para obtener datos más detallados
    console.log('Cargando datos de perfil adicionales...');
    
    // Verificar que tenemos un usuario con ID
    if (!this.userData || !this.authService.getCurrentUserSync()?.uid) {
      console.log('No hay usuario para cargar datos');
      return;
    }
    
    const userId = this.authService.getCurrentUserSync()?.uid || '';
    
    // Llamada al servicio para obtener datos del perfil
    this.profileService.getPersonalData(userId)
      .pipe(
        catchError((error: any) => {
          console.error('Error al cargar datos del perfil:', error);
          return EMPTY;
        })
      )
      .subscribe((profileData: ProfileData) => {
        console.log('Datos de perfil cargados:', profileData);
        if (profileData) {
          // Actualizar los datos del usuario con la información del backend
          this.userData = {
            ...this.userData,
            ...profileData
          };
          
          // Si el usuario es proveedor y ya tiene un tipo seleccionado
          if (this.isProviderRole() && profileData.providerType) {
            // Mapear el tipo de proveedor del backend a nuestro formato
            this.providerType = profileData.providerType === 'INDIVIDUAL' ? 'individual' : 'company';
            
            // Si ya tiene un tipo seleccionado, mostrar el formulario de empresa
            this.showProviderSelection = false;
            console.log('Proveedor con tipo existente, mostrando formulario empresa');
          }
        }
      });
  }

  setActiveTab(index: number): void {
    console.log('setActiveTab called with index:', index, 'user role:', this.userData?.role);
    this.activeTab = index;
    
    // Actualizar la URL según la pestaña seleccionada
    if (index === ProfileTab.PERSONAL) {
      this.router.navigate(['/home/profile/personal']);
    } else if (index === ProfileTab.PROVIDER_OR_COMPANY) {
      // Lógica específica según el rol del usuario
      if (this.isProviderRole()) {
        if (this.showProviderSelection) {
          this.router.navigate(['/home/profile/provider-type']);
        } else {
          this.router.navigate(['/home/profile/company']);
        }
      } else {
        // Para CLIENTE, siempre mostrar directamente el formulario de empresa
        this.showProviderSelection = false;
        this.router.navigate(['/home/profile/company']);
      }
      
      console.log('Después de setActiveTab - showProviderSelection:', this.showProviderSelection);
    }
  }

  toggleAddressStepper(): void {
    this.showAddressStepper = !this.showAddressStepper;
    console.log('Toggle address stepper:', this.showAddressStepper);
  }

  handleFormSubmitted(formData: any): void {
    console.log('Datos del formulario recibidos:', formData);
    this.snackBar.open('Información guardada correctamente', 'Cerrar', {
      duration: 3000
    });
    
    // Si el usuario es CLIENTE, simplemente cambiar la pestaña y navegar
    if (this.userData?.role === 'CLIENTE') {
      this.activeTab = ProfileTab.PROVIDER_OR_COMPANY;
      this.router.navigate(['/home/profile/company']);
    }
  }

  handleAddressSaved(address: Address): void {
    this.addressData = address;
    this.showAddressStepper = false;
    this.snackBar.open('Dirección guardada correctamente', 'Cerrar', {
      duration: 3000
    });
  }

  isProviderRole(): boolean {
    return this.userData?.role === 'PROVEEDOR';
  }

  handleProviderTypeSelection(type: ProviderType): void {
    this.providerType = type;
    console.log('Tipo de proveedor seleccionado:', type);
  }

  handleProviderTypeSaved(): void {
    console.log('handleProviderTypeSaved llamado');
    
    if (!this.providerType) {
      this.snackBar.open('Por favor selecciona un tipo de proveedor', 'Cerrar', {
        duration: 3000
      });
      return;
    }
    
    // Al guardar el tipo de proveedor, cambiamos a la vista de empresa
    this.showProviderSelection = false;
    
    // Guardar el tipo de proveedor en el perfil
    if (this.userData) {
      this.userData.providerType = this.providerType === 'individual' ? 'INDIVIDUAL' : 'COMPANY';
      
      // Aquí podrías agregar lógica para guardar esto en el backend
      console.log('Guardando tipo de proveedor en el perfil:', this.userData.providerType);
    }
    
    // Navegar al formulario de empresa usando la ruta absoluta
    this.router.navigate(['/home/profile/company']);
    
    this.snackBar.open('Tipo de proveedor guardado correctamente', 'Cerrar', {
      duration: 3000
    });
    
    console.log('Navegando a formulario de empresa después de guardar tipo de proveedor');
  }

  backToProviderSelection(): void {
    // Solo permitimos volver a la selección si el usuario es proveedor
    if (this.isProviderRole()) {
      this.showProviderSelection = true;
      this.router.navigate(['/home/profile/provider-type']);
      console.log('Volviendo a selección de tipo de proveedor');
    } else {
      console.warn('Usuario no es proveedor, no puede volver a selección de tipo');
    }
  }
}
