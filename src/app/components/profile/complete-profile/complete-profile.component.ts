import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProfileService } from '../../../services/profile/profile.service';
import { ProfileData } from '../../../models/profile';
import { PersonalDataFormComponent } from '../personal-data-form/personal-data-form.component';
import { CompanyFormComponent } from '../company-form/company-form.component';
import { ProviderTypeSelectionComponent } from '../provider-type-selection/provider-type-selection.component';
import { AddressStepperComponent } from '../address-stepper/address-stepper.component';
import { UserRole } from '../../../models/user';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Address } from '../../../models/address.model';
import { AuthService } from '../../../services/auth-service/auth.service';
import { catchError, EMPTY, finalize, Subject, takeUntil, take } from 'rxjs';
import { AddressService } from '../../../services/address/address.service';
import { ProfileTab } from '../../../models/profile-tab.enum';
import { ProviderTypeService, ProviderType } from '../../../services/provider.service/provider-type.service';

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
    MatProgressSpinnerModule,
    PersonalDataFormComponent,
    CompanyFormComponent,
    ProviderTypeSelectionComponent,
    AddressStepperComponent,
    RouterModule
  ],
  templateUrl: './complete-profile.component.html',
  styleUrls: ['./complete-profile.component.css']
})
export class CompleteProfileComponent implements OnInit, OnDestroy {
  @ViewChild(AddressStepperComponent) addressStepper!: AddressStepperComponent;
  @ViewChild(PersonalDataFormComponent) personalDataForm!: PersonalDataFormComponent;
  @ViewChild(CompanyFormComponent) companyForm!: CompanyFormComponent;
  @ViewChild(ProviderTypeSelectionComponent) providerTypeSelection!: ProviderTypeSelectionComponent;

  activeTab = ProfileTab.PERSONAL;
  showAddressStepper: boolean = false;
  showAddressContent: boolean = false;
  userData: ProfileData | null = null;
  addressData: Address | null = null;
  providerType: ProviderType = null;
  showProviderSelection: boolean = true;
  showBackButton: boolean = false;
  currentUserId: string = '';
  isEditingAddress: boolean = false;
  isLoadingAddress: boolean = false;
  addressDataLoaded: boolean = false;
  private personalDataLoaded = false;
  private companyDataLoaded = false;
  private profileDataLoaded = false;
  private isLoadingProviderType = false;

  // Para manejar la limpieza de suscripciones
  private destroy$ = new Subject<void>();

  constructor(
    private profileService: ProfileService,
    public authService: AuthService,
    private addressService: AddressService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private providerTypeService: ProviderTypeService,
    private cdr: ChangeDetectorRef
  ) {
  }
  ngOnInit(): void {
    
    // Inicializar el estado de la sección de dirección (por defecto cerrada)
    this.showAddressContent = false;

    // Analizar la ruta actual para determinar qué tab debería estar activa
    const currentPath = this.router.url;
    
    if (currentPath.includes('/provider-type')) {
      this.activeTab = ProfileTab.PROVIDER_OR_COMPANY;
      this.showProviderSelection = true;
    } else if (currentPath.includes('/company')) {
      this.activeTab = ProfileTab.PROVIDER_OR_COMPANY;
      this.showProviderSelection = false;
    } else {
      this.activeTab = ProfileTab.PERSONAL;
    }

    // Forzar la carga del tipo de proveedor desde el servicio
    this.loadProviderType();
    
    // Suscribirse al cambio del tipo de proveedor
    this.providerTypeService.getProviderType()
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        if (!this.isLoadingProviderType && type !== this.providerType) {
          this.providerType = type;
          this.handleProviderTypeChange();
        }
      });

    // Suscribirse al observable de usuario actual para manejar cambios de autenticación
    this.authService.currentUser$
      .pipe(
        takeUntil(this.destroy$),
        take(1)
      )
      .subscribe(user => {
        if (user) {
          this.currentUserId = user.uid;
          this.userData = {
            role: user.role,
            email: user.email
          };
          
          // Solo cargar datos necesarios para el tab activo inicialmente
          this.loadDataForActiveTab();
        } else {
          this.router.navigate(['/login']);
        }
      });

    // Handle URL parameters last
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['providerType']) {
          this.isLoadingProviderType = true;
          this.providerType = params['providerType'] as ProviderType;
          this.providerTypeService.setProviderType(this.providerType);
          this.isLoadingProviderType = false;
        }
      });
  }
  ngOnDestroy(): void {
    // Limpiar todas las suscripciones al destruir el componente
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getTabIndexFromRoute(tab: string): number {
    switch (tab) {
      case 'personal':
        return ProfileTab.PERSONAL;
      case 'company':
      case 'provider-type':
        return ProfileTab.PROVIDER_OR_COMPANY;
      default:
        return ProfileTab.PERSONAL;
    }
  }
  setActiveTab(index: ProfileTab): void {
 
    
    // Primero, actualizar la pestaña activa
    this.activeTab = index;
    
    // Cargar datos necesarios para el nuevo tab activo
    this.loadDataForActiveTab();
    
    // Verificar si el usuario es proveedor y estamos en la pestaña de empresa/proveedor
    if (this.isProviderRole() && index === ProfileTab.PROVIDER_OR_COMPANY) {
      // Forzar carga del tipo de proveedor desde el servicio para asegurarnos de tener la última versión
      this.providerType = this.providerTypeService.getCurrentProviderType();
      
      // Si no hay tipo seleccionado, siempre mostrar el selector
      if (!this.providerType) {
        this.showProviderSelection = true;
        if (!this.router.url.includes('/provider-type')) {
          this.router.navigate(['/home/profile/provider-type'], { replaceUrl: true });
        }
        return;
      } 
      
      // Si es tipo empresa, mostrar el formulario de empresa
      if (this.providerType === 'COMPANY') {
        this.showProviderSelection = false;
        if (!this.router.url.includes('/company')) {
          this.router.navigate(['/home/profile/company'], { replaceUrl: true });
        }
        return;
      } 
      
      // Si es tipo individual, mostrar el mensaje de confirmación
      if (this.providerType === 'INDIVIDUAL') {
        this.showProviderSelection = false;
        if (!this.router.url.includes('/provider-type')) {
          this.router.navigate(['/home/profile/provider-type'], { replaceUrl: true });
        }
        return;
      }
    }
    
    // Para usuarios no proveedores o pestaña personal
    if (index === ProfileTab.PERSONAL) {
      if (!this.router.url.includes('/personal')) {
        this.router.navigate(['/home/profile/personal'], { replaceUrl: true });
      }
    } else if (index === ProfileTab.PROVIDER_OR_COMPANY && !this.isProviderRole()) {
      if (!this.router.url.includes('/company')) {
        this.router.navigate(['/home/profile/company'], { replaceUrl: true });
      }
    }
  }
  private loadDataForActiveTab(): void {
    
    if (this.activeTab === ProfileTab.PERSONAL) {
      // Tab Personal - Cargar datos personales si no se han cargado
      if (!this.personalDataLoaded) {
        this.loadProfileData();
      }
    } else if (this.activeTab === ProfileTab.PROVIDER_OR_COMPANY) {
      // Tab Empresa/Proveedor
      if (this.isProviderRole()) {
        // Si es proveedor, verificar tipo para decidir qué cargar
        if (this.providerType === 'COMPANY' && !this.companyDataLoaded) {
          // Para proveedores tipo empresa, cargar datos de empresa
          this.companyDataLoaded = true;
          // No cargamos los datos aquí - los cargará el componente CompanyForm cuando sea necesario
        }
      } else {
        // Si es cliente, cargar datos de empresa
        if (!this.companyDataLoaded) {
          this.companyDataLoaded = true;
          // No cargamos los datos aquí - los cargará el componente CompanyForm cuando sea necesario
        }
      }
    }
  }

  private loadProfileData(): void {
    if (this.personalDataLoaded) {
      return;
    }
    
    this.profileService.getProfileData()
      .pipe(
        takeUntil(this.destroy$),
        take(1),
        catchError(error => {
          if (error.status !== 404) {
            console.error('Error al cargar datos del perfil:', error);
            this.snackBar.open('Error al cargar los datos del perfil', 'Cerrar', {
              duration: 3000
            });
          } else {
          }
          return EMPTY;
        }),
        finalize(() => {
          this.personalDataLoaded = true;
          this.profileDataLoaded = true;
        })
      )
      .subscribe({
        next: (profileData) => {
          this.handleProfileDataLoaded(profileData);
        }
      });
  }

  toggleAddressStepper(isEditing: boolean = false): void {
    this.isEditingAddress = isEditing;
    this.showAddressStepper = !this.showAddressStepper;
  }

  handleFormSubmitted(formData: any): void {
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
    this.isEditingAddress = false;

    // Actualizar el perfil del usuario con la nueva dirección
    if (this.userData) {
      this.userData.address = address;
    }

    this.snackBar.open(this.isEditingAddress ? 'Dirección actualizada correctamente' : 'Dirección guardada correctamente', 'Cerrar', {
      duration: 3000
    });
  }

  isProviderRole(): boolean {
    return this.userData?.role === 'PROVEEDOR';
  }
  handleProviderTypeSelection(type: ProviderType): void {
  
    
    this.providerType = type;
    this.providerTypeService.setProviderType(type, true); // Forzar la actualización
    
    // Solo cambiamos la visibilidad del selector sin hacer cargas adicionales
    if (type === 'COMPANY') {
      this.showProviderSelection = false;
      
      // Marcar como no cargado para que se cargue cuando sea necesario
      this.companyDataLoaded = false;
      
      // Navegar a la vista de empresa
      if (!this.router.url.includes('/company')) {
        this.router.navigate(['/home/profile/company'], { replaceUrl: true });
      }
    } else {
      this.showProviderSelection = false;
      
      // Navegar a la vista de proveedor individual
      if (!this.router.url.includes('/provider-type')) {
        this.router.navigate(['/home/profile/provider-type'], { replaceUrl: true });
      }
    }
    
    // Forzar actualización de la interfaz
    this.cdr.detectChanges();
    
    // Programar una segunda actualización para capturar cambios asíncronos
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 300);
  }
  handleProviderTypeSaved(): void {
    // Ya manejado en handleProviderTypeSelection
  }

  backToProviderSelection(): void {
    // Solo permitimos volver a la selección si el usuario es proveedor
    if (this.isProviderRole()) {
      // Resetear el selector y mostrar la selección de tipo
      this.showProviderSelection = true;
      
      // Mantener el tipo actual solo como referencia pero permitir nueva selección
      // No resetear completamente el tipo para mantener la selección previa visible
      
      // Asegurarse de estar en la URL correcta
      if (!this.router.url.includes('/provider-type')) {
        this.router.navigate(['/home/profile/provider-type']);
      }
      
      // Notificar al servicio que estamos en modo selección
      // Nota: No podemos acceder directamente a selectedType porque puede no estar
      // disponible en este momento.
      

      // En lugar de intentar acceder directamente al componente hijo,
      // el componente hijo usará initialType en su ngOnInit
    } else {
      console.warn('Usuario no es proveedor, no puede volver a selección de tipo');
    }
  }

  handleCancelAddress(): void {
    this.showAddressStepper = false;
    this.isEditingAddress = false;
  }

  handleAddressLoaded(address: Address | null): void {
    // Este método ya no es necesario, la dirección se carga directamente en este componente
    // Se mantiene por compatibilidad con el evento del componente hijo
  }
  handleProfileDataLoaded(profileData: any): void {
    
    if (profileData) {
      // Actualizar los datos del usuario con la información del backend
      this.userData = {
        ...this.userData,
        ...profileData
      };
      
      // Si el usuario es proveedor, gestionar el tipo
      if (this.isProviderRole()) {
        if (profileData.providerType) {
          // Convertir el formato de backend a frontend
          const newProviderType = profileData.providerType === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'COMPANY';
          
          // Actualizar el tipo de proveedor solo si ha cambiado
          if (this.providerType !== newProviderType) {
            this.providerType = newProviderType;
            
            // Actualizar el servicio
            this.providerTypeService.setProviderType(this.providerType);
          }
          
          // Actualizar la vista según el tipo de proveedor
          if (this.activeTab === ProfileTab.PROVIDER_OR_COMPANY) {
            if (this.providerType === 'COMPANY') {
              // Si es tipo empresa y estamos en la pestaña de empresa, mostrar el formulario
              this.showProviderSelection = false;
              if (!this.router.url.includes('/company')) {
                this.router.navigate(['/home/profile/company'], { replaceUrl: true });
              }
            } else {
              // Si es tipo individual, mostrar mensaje de confirmación
              this.showProviderSelection = false; // No mostrar selector sino el mensaje de confirmación
              if (!this.router.url.includes('/provider-type')) {
                this.router.navigate(['/home/profile/provider-type'], { replaceUrl: true });
              }
            }
          }
          
          // Forzar la actualización del estado del componente hijo
          this.cdr.detectChanges();
          
          // Asegurarse de que el componente hijo tenga el valor correcto
          setTimeout(() => {
            if (this.providerTypeSelection) {
              this.providerTypeSelection.selectedType = this.providerType;
              this.cdr.detectChanges();
            } else {
            }
          }, 0);
        } else {
          // No hay tipo en el perfil
          this.providerType = null;
          this.providerTypeService.setProviderType(null);
          
          // Si estamos en la pestaña de empresa, mostrar la selección de tipo
          if (this.activeTab === ProfileTab.PROVIDER_OR_COMPANY) {
            this.showProviderSelection = true;
            if (!this.router.url.includes('/provider-type')) {
              this.router.navigate(['/home/profile/provider-type'], { replaceUrl: true });
            }
          }
        }
      }
      
      this.profileDataLoaded = true;
      this.cdr.detectChanges();
    }
  }
  // Método para cargar datos de dirección directamente desde este componente
  loadAddressData(userId: string): void {
    if (!userId) {
      console.error('CompleteProfileComponent: No hay ID de usuario para cargar la dirección');
      return;
    }

    if (this.addressDataLoaded) {
      return;
    }

    this.isLoadingAddress = true;

    this.addressService.getAddressByUserUid(userId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error al cargar la dirección del usuario:', error);
          this.isLoadingAddress = false;
          this.addressData = null;
          return EMPTY;
        }),
        finalize(() => {
          this.isLoadingAddress = false;
          this.addressDataLoaded = true;
        })
      )
      .subscribe((address) => {

        if (address) {
          this.addressData = address;

          // Actualizar el perfil del usuario con la nueva dirección
          if (this.userData) {
            this.userData.address = address;
          }
        } else {
          this.addressData = null;
        }
      });
  }

  toggleAddressSection(): void {
    this.showAddressContent = !this.showAddressContent;
  }

  private handleProviderTypeChange(): void {
    if (this.activeTab === ProfileTab.PROVIDER_OR_COMPANY) {
      if (this.providerType === 'COMPANY') {
        this.showProviderSelection = false;
        if (!this.router.url.includes('/company')) {
          this.router.navigate(['/home/profile/company'], { replaceUrl: true });
        }
      } else {
        this.showProviderSelection = true;
        if (!this.router.url.includes('/provider-type')) {
          this.router.navigate(['/home/profile/provider-type'], { replaceUrl: true });
        }
      }
    }
  }

  // Método para cargar explícitamente el tipo de proveedor
  private loadProviderType(): void {
    
    // Obtener el tipo de proveedor actual desde el servicio
    this.providerType = this.providerTypeService.getCurrentProviderType();
    
    // Si el usuario es proveedor, intentar cargar el tipo desde el backend
    if (this.isProviderRole()) {
      // Forzar la carga desde el backend
      this.providerTypeService.loadProviderType();
      
      // También forzar actualización de la vista después de cargar los datos
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 500);
    }
  }
}
