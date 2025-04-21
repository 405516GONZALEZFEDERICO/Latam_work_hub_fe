import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
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
import { catchError, EMPTY, finalize, Subject, takeUntil } from 'rxjs';
import { AddressService } from '../../../services/address/address.service';
import { ProfileTab } from '../../../models/profile-tab.enum';
import { ProviderTypeService, ProviderType } from '../../../services/provider/provider-type.service';

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
  
  // Para manejar la limpieza de suscripciones
  private destroy$ = new Subject<void>();
  
  constructor(
    private profileService: ProfileService,
    public authService: AuthService,
    private addressService: AddressService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private providerTypeService: ProviderTypeService
  ) {
    console.log('CompleteProfileComponent constructor - Initializing component');
  }
  
  ngOnInit(): void {
    console.log('CompleteProfileComponent ngOnInit - Starting initialization');
    
    // Inicializar el estado de la sección de dirección (por defecto cerrada)
    this.showAddressContent = false;
    
    // Suscribirse al cambio de tipo de proveedor desde el servicio
    this.providerTypeService.getProviderType()
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        if (type !== this.providerType) {
          console.log('Actualizando tipo de proveedor desde servicio:', type);
          this.providerType = type;
          
          // Si tenemos un tipo de proveedor, ocultar la selección
          if (this.providerType && this.isProviderRole()) {
            this.showProviderSelection = false;
          }
        }
      });
    
    // Verificar si hay un tipo de proveedor en los parámetros de la URL
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['providerType']) {
          console.log('Recuperando tipo de proveedor de la URL:', params['providerType']);
          this.providerType = params['providerType'] as ProviderType;
          
          // Actualizar el servicio con el tipo de proveedor de la URL
          this.providerTypeService.setProviderType(this.providerType);
          
          // Si tenemos un tipo de proveedor, mostrar el formulario de empresa
          if (this.providerType && this.isProviderRole()) {
            this.showProviderSelection = false;
            console.log('Mostrando formulario de empresa basado en el tipo de proveedor de la URL');
          }
        } else {
          // Si no hay tipo en la URL, intentar cargar desde el servicio
          const currentType = this.providerTypeService.getCurrentProviderType();
          if (currentType) {
            this.providerType = currentType;
            if (this.isProviderRole()) {
              this.showProviderSelection = false;
            }
          }
        }
      });
    
    // Suscribirse al observable de usuario actual para manejar cambios de autenticación
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          console.log('Usuario autenticado:', user);
          this.userData = {
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoUrl: user.photoURL || '',
            role: user.role,
            profileCompletion: 10 // Indicar que es un perfil básico
          };
          
          // Guardar el ID del usuario
          this.currentUserId = user.uid;
          
          // Cargar datos de dirección solo si no se han cargado previamente
          if (!this.addressDataLoaded) {
            console.log('Cargando datos de dirección por primera vez');
            this.loadAddressData(this.currentUserId);
            this.addressDataLoaded = true;
          }

          console.log('Rol del usuario en profile:', user.role);
          
          // Configuración inicial según el rol del usuario
          if (user.role === 'CLIENTE') {
            this.showProviderSelection = false;
            console.log('Usuario es CLIENTE, showProviderSelection = false');
          } else if (user.role === 'PROVEEDOR') {
            // Por defecto los proveedores deben seleccionar tipo (a menos que ya tengamos uno)
            if (!this.providerType) {
              this.showProviderSelection = true;
              console.log('Usuario es PROVEEDOR sin tipo, showProviderSelection = true');
            }
            
            // Verificar si el proveedor ya había seleccionado un tipo anteriormente
            if (this.userData.providerType && !this.providerType) {
              this.providerType = this.userData.providerType === 'INDIVIDUAL' ? 'individual' : 'company';
              // Actualizar el servicio con el tipo de proveedor detectado
              this.providerTypeService.setProviderType(this.providerType);
              console.log('El proveedor ya tiene un tipo seleccionado:', this.providerType);
            }
          }

          // Asegurar que el servicio esté actualizado con el tipo de proveedor actual
          if (this.providerType) {
            this.providerTypeService.setProviderType(this.providerType);
          }
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
    this.route.data
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        console.log('Route data:', data);
        if (data['activeTab']) {
          switch (data['activeTab']) {
            case 'personal':
              this.activeTab = ProfileTab.PERSONAL;
              console.log('Activando pestaña personal');
              break;
            case 'company':
              this.activeTab = ProfileTab.PROVIDER_OR_COMPANY;
              // Solo ocultar la selección de tipo si no somos proveedor o ya tenemos un tipo
              if (!this.isProviderRole() || this.providerType) {
                this.showProviderSelection = false;
                console.log('Activando pestaña company, showProviderSelection = false');
              }
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
    console.log('providerType:', this.providerType);
  }

  ngOnDestroy(): void {
    // Limpiar todas las suscripciones al destruir el componente
    this.destroy$.next();
    this.destroy$.complete();
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

  toggleAddressStepper(isEditing: boolean = false): void {
    this.isEditingAddress = isEditing;
    this.showAddressStepper = !this.showAddressStepper;
    console.log('Toggle address stepper:', this.showAddressStepper, 'isEditing:', this.isEditingAddress);
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
    console.log('Dirección guardada/actualizada correctamente:', address);
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
    // Actualizar el servicio
    this.providerTypeService.setProviderType(type);
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
    
    // Asegurar que el tipo esté guardado en el servicio
    this.providerTypeService.setProviderType(this.providerType);
    
    console.log('Tipo de proveedor antes de la navegación:', this.providerType);
    
    // Al guardar el tipo de proveedor, cambiamos a la vista de empresa
    this.showProviderSelection = false;
    
    // Guardar el tipo de proveedor en el perfil localmente, pero NO enviar al backend todavía
    if (this.userData) {
      this.userData.providerType = this.providerType === 'individual' ? 'INDIVIDUAL' : 'COMPANY';
      console.log('Tipo de proveedor seleccionado (guardado localmente):', this.userData.providerType);
    }
    
    // Forzar una recarga completa para asegurar que se recuperen los datos actualizados
    // Esto es útil cuando cambiamos entre tipos de proveedor
    if (this.companyForm) {
      setTimeout(() => {
        if (this.currentUserId && this.companyForm) {
          console.log('Forzando recarga de datos de la compañía después de cambiar tipo de proveedor');
          this.companyForm.loadCompanyData(this.currentUserId);
        }
      }, 100);
    }
    
    // Navegar al formulario de empresa usando QueryParams para preservar el tipo de proveedor seleccionado
    this.router.navigate(['/home/profile/company'], {
      queryParams: { providerType: this.providerType },
      skipLocationChange: true // Evita que se muestre en la URL
    });
    
    this.snackBar.open('Ahora completa los datos de tu empresa', 'Entendido', {
      duration: 5000
    });
    
    console.log('Navegando a formulario de empresa después de seleccionar tipo de proveedor');
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
  
  handleCancelAddress(): void {
    this.showAddressStepper = false;
    this.isEditingAddress = false;
  }

  handleAddressLoaded(address: Address | null): void {
    // Este método ya no es necesario, la dirección se carga directamente en este componente
    // Se mantiene por compatibilidad con el evento del componente hijo
    console.log('CompleteProfileComponent: Evento de dirección cargada recibido');
  }

  handleProfileDataLoaded(profileData: any): void {
    console.log('CompleteProfileComponent: Recibidos datos de perfil:', profileData);
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
        
        // Actualizar el servicio con el tipo de proveedor
        this.providerTypeService.setProviderType(this.providerType);
        
        // Si ya tiene un tipo seleccionado, mostrar el formulario de empresa
        this.showProviderSelection = false;
        console.log('CompleteProfileComponent: Proveedor con tipo existente, mostrando formulario empresa');
      }
    }
  }

  // Método para cargar datos de dirección directamente desde este componente
  loadAddressData(userId: string): void {
    if (!userId) {
      console.error('CompleteProfileComponent: No hay ID de usuario para cargar la dirección');
      return;
    }
    
    this.isLoadingAddress = true;
    console.log('CompleteProfileComponent: Cargando dirección para usuario:', userId);
    
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
        })
      )
      .subscribe((address) => {
        console.log('CompleteProfileComponent: Dirección recibida del servicio:', address);
        
        if (address) {
          console.log('CompleteProfileComponent: Dirección cargada exitosamente:', address);
          this.addressData = address;
          
          // Actualizar el perfil del usuario con la nueva dirección
          if (this.userData) {
            this.userData.address = address;
          }
        } else {
          console.log('CompleteProfileComponent: El usuario no tiene dirección asociada');
          this.addressData = null;
        }
      });
  }

  toggleAddressSection(): void {
    this.showAddressContent = !this.showAddressContent;
    console.log('Toggle address content:', this.showAddressContent);
  }
}
