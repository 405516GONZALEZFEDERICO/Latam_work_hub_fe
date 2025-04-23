import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserRole } from '../../../models/user';
import { AddressService } from '../../../services/address/address.service';
import { CompanyService } from '../../../services/company/company.service';
import { AuthService } from '../../../services/auth-service/auth.service';
import { Country } from '../../../models/country.model';
import { CompanyInfoDto } from '../../../models/company-info.dto';
import { catchError, finalize, Subject, takeUntil, EMPTY, debounceTime } from 'rxjs';
import { ErrorHandlerService } from '../../../services/error/error-handler.service';
import { ProviderTypeService, ProviderType } from '../../../services/provider.service/provider-type.service';

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
export class CompanyFormComponent implements OnInit, OnDestroy {
  @Input() userRole: UserRole = 'CLIENTE';
  @Input() providerType?: ProviderType;
  @Output() back = new EventEmitter<void>();
  @Output() formSubmitted = new EventEmitter<any>();
  
  companyForm!: FormGroup;
  isSubmitting = false;
  isLoadingCountries = false;
  isLoadingCompanyData = false;
  currentUserId: string = '';
  apiError: any = null; // Para mostrar errores de API en la interfaz
  
  countries: Country[] = [];
  
  // Para limpiar suscripciones
  private destroy$ = new Subject<void>();
  private submitAction$ = new Subject<void>();
  
  constructor(
    private fb: FormBuilder,
    private addressService: AddressService,
    private companyService: CompanyService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private errorHandler: ErrorHandlerService,
    private providerTypeService: ProviderTypeService
  ) {}
  
  ngOnInit(): void {
    console.log('[CompanyForm] Iniciando componente, userRole:', this.userRole, 'providerType:', this.providerType);
    
    // Si no tenemos un tipo de proveedor definido pero el usuario es proveedor, intentar obtenerlo del servicio
    if (this.userRole === 'PROVEEDOR' && !this.providerType) {
      this.providerType = this.providerTypeService.getCurrentProviderType() || undefined;
      console.log('[CompanyForm] Tipo de proveedor obtenido del servicio:', this.providerType);
    }
    
    // Inicializar el formulario con los datos correctos según el tipo
    this.initForm();
    
    // Configurar el debounce para evitar múltiples envíos rápidos
    this.submitAction$.pipe(
      takeUntil(this.destroy$),
      debounceTime(500)
    ).subscribe(() => {
      this.processFormSubmission();
    });
    
    // Obtener el ID del usuario actual y cargar datos si es necesario
    const user = this.authService.getCurrentUserSync();
    if (user?.uid) {
      this.currentUserId = user.uid;
      
      // Cargar datos según el rol y tipo de proveedor
      if (this.userRole === 'CLIENTE') {
        console.log('[CompanyForm] Cargando datos para CLIENTE');
        this.loadCompanyData(this.currentUserId);
      } 
      else if (this.userRole === 'PROVEEDOR' && this.providerType === 'COMPANY') {
        console.log('[CompanyForm] Cargando datos para PROVEEDOR tipo COMPANY');
        this.loadCompanyData(this.currentUserId);
      }
    }
    
    // Observar cambios en el tipo de proveedor
    this.providerTypeService.getProviderType()
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        if (type !== this.providerType) {
          console.log('[CompanyForm] Cambio en tipo de proveedor detectado:', type);
          this.providerType = type || undefined;
          
          // Reinicializar el formulario con las nuevas reglas de validación
          this.initForm();
          
          // Si es tipo empresa, cargar datos
          if (this.providerType === 'COMPANY' && this.currentUserId) {
            console.log('[CompanyForm] Cargando datos después de cambio a tipo COMPANY');
            this.loadCompanyData(this.currentUserId);
          }
        }
      });
  }
  
  ngOnDestroy(): void {
    // Limpiar suscripciones al destruir el componente
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadCompanyData(userId: string): void {
    if (this.isLoadingCompanyData) return;
    
    console.log('[CompanyForm] Iniciando carga de datos de compañía, userRole:', this.userRole, 'providerType:', this.providerType);
    
    // Cargar los países para el select
    if (this.countries.length === 0) {
      this.loadCountries();
    }
    
    // Permitir la carga para clientes o proveedores de tipo empresa
    if (this.userRole === 'CLIENTE' || this.providerType === 'COMPANY') {
      this.isLoadingCompanyData = true;
      this.apiError = null;
      
      this.companyService.getCompanyInfo(userId)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            this.isLoadingCompanyData = false;
            console.error('[CompanyForm] Error al cargar datos de la compañía:', error);
            
            // Inicializar el formulario vacío
            this.initForm();
            
            // No mostrar error al usuario si es 404
            if (error.status !== 404) {
              this.snackBar.open('Error al cargar los datos de la empresa', 'Cerrar', {
                duration: 3000
              });
            } else {
              console.log('[CompanyForm] No se encontraron datos de compañía - Iniciando formulario vacío');
            }
            
            return EMPTY;
          }),
          finalize(() => {
            this.isLoadingCompanyData = false;
          })
        )
        .subscribe(companyData => {
          console.log('[CompanyForm] Datos de compañía recibidos:', companyData);
          
          if (companyData) {
            this.companyForm.patchValue({
              name: companyData.name || '',
              legalName: companyData.legalName || '',
              taxId: companyData.taxId || '',
              phone: companyData.phone || '',
              email: companyData.email || '',
              website: companyData.website || '',
              contactPerson: companyData.contactPerson || '',
              country: companyData.country ? companyData.country.toString() : ''
            });
          }
        });
    } else {
      console.log('[CompanyForm] No se cargan datos porque no es CLIENTE ni PROVEEDOR tipo COMPANY');
    }
  }
  
  loadCountries(): void {
    this.isLoadingCountries = true;
    this.addressService.getAllCountries()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error al cargar países:', error);
          this.errorHandler.showErrorMessage(error, 'Error al cargar la lista de países');
          // Si hay un error, usar países por defecto
          this.countries = [
            { id: 1, code: 'AR', name: 'Argentina' },
            { id: 2, code: 'BR', name: 'Brasil' },
            { id: 3, code: 'CL', name: 'Chile' },
            { id: 4, code: 'CO', name: 'Colombia' },
            { id: 5, code: 'MX', name: 'México' },
            { id: 6, code: 'PE', name: 'Perú' },
            { id: 7, code: 'UY', name: 'Uruguay' }
          ];
          return [];
        }),
        finalize(() => {
          this.isLoadingCountries = false;
        })
      )
      .subscribe(countries => {
        if (countries && countries.length > 0) {
          this.countries = countries;
          console.log('Países cargados:', this.countries);
        } else if (this.countries.length === 0) {
          // Si no hay países y tampoco se cargaron países por defecto en el error
          this.countries = [
            { id: 1, code: 'AR', name: 'Argentina' },
            { id: 2, code: 'BR', name: 'Brasil' },
            { id: 3, code: 'CL', name: 'Chile' },
            { id: 4, code: 'CO', name: 'Colombia' },
            { id: 5, code: 'MX', name: 'México' },
            { id: 6, code: 'PE', name: 'Perú' },
            { id: 7, code: 'UY', name: 'Uruguay' }
          ];
        }
      });
  }
  
  initForm(): void {
    console.log('[CompanyForm] Inicializando formulario, providerType:', this.providerType);
    
    // Determinar si se necesitan validadores requeridos
    const needsRequired = this.userRole === 'CLIENTE' || this.providerType === 'COMPANY';
    
    this.companyForm = this.fb.group({
      name: ['', needsRequired ? [Validators.required] : []],
      legalName: ['', needsRequired ? [Validators.required] : []],
      taxId: ['', needsRequired ? [Validators.required] : []],
      phone: [''],
      email: ['', [Validators.email]],
      website: [''],
      contactPerson: [''],
      country: ['', needsRequired ? [Validators.required] : []]
    });
    
    // Si es proveedor individual, deshabilitamos los campos
    if (this.userRole === 'PROVEEDOR' && this.providerType === 'INDIVIDUAL') {
      console.log('[CompanyForm] Tipo de proveedor INDIVIDUAL, deshabilitando campos');
      this.companyForm.disable();
    } else {
      console.log('[CompanyForm] Tipo de proveedor COMPANY o CLIENTE, habilitando campos');
      this.companyForm.enable();
    }
  }

  get formControls() {
    return this.companyForm.controls;
  }
  
  goBack(): void {
    this.back.emit();
  }
  
  canShowBackButton(): boolean {
    return this.back.observed && this.userRole === 'PROVEEDOR';
  }
  
  onSubmit(): void {
    console.log('[CompanyForm] Iniciando envío del formulario', {
      userRole: this.userRole,
      providerType: this.providerType,
      isFormValid: this.companyForm.valid,
      hasUserId: !!this.currentUserId
    });
    
    // Asegurar que los países estén cargados antes de enviar el formulario
    if (this.countries.length === 0) {
      this.loadCountries();
    }
    
    if (this.companyForm.valid && this.currentUserId) {
      // Prevenir múltiples envíos con debounce
      if (!this.isSubmitting) {
        this.isSubmitting = true;
        this.submitAction$.next();
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.companyForm.controls).forEach(key => {
        const control = this.companyForm.get(key);
        if (control) control.markAsTouched();
      });
      
      // Mostrar mensaje si no hay usuario actual
      if (!this.currentUserId) {
        this.errorHandler.showErrorMessage('No se pudo identificar el usuario actual');
      }
    }
  }
  processFormSubmission(): void {
    console.log('Procesando envío de formulario, providerType:', this.providerType);
    
    // Si es un proveedor individual, solo enviar el tipo de proveedor
    if (this.userRole === 'PROVEEDOR' && this.providerType === 'INDIVIDUAL') {
      const individualProviderData: CompanyInfoDto = {
        legalName: '',
        name: '',
        taxId: '',
        phone: '',
        email: '',
        contactPerson: '',
        country: 0,
        providerType: 'INDIVIDUAL'
      };

      this.submitProviderTypeRequest(individualProviderData);
      return;
    }

    // Para proveedores de empresa o clientes
    if (this.companyForm.valid) {
      this.isSubmitting = true;
      this.apiError = null;
      
      const companyData: CompanyInfoDto = {
        ...this.companyForm.value,
        country: parseInt(this.companyForm.value.country, 10)
      };
      
      // Establecer providerType según el rol del usuario
      if (this.userRole === 'PROVEEDOR' && this.providerType) {
        // Para proveedores, usar el tipo seleccionado
        companyData.providerType = this.providerType === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL';
      } else if (this.userRole === 'CLIENTE') {
        // Para clientes, siempre establecer como COMPANY
        companyData.providerType = 'COMPANY';
      }
      
      console.log('Enviando datos al backend:', companyData);
      this.submitProviderTypeRequest(companyData);
    } else {
      this.markFormGroupTouched(this.companyForm);
    }
  }

  private submitProviderTypeRequest(companyData: CompanyInfoDto): void {
    this.companyService.createOrUpdateCompanyInfo(this.currentUserId, companyData)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('[CompanyForm] Error al enviar datos:', error);
          this.isSubmitting = false;
          this.apiError = error;
          this.snackBar.open('Error al guardar los datos de la empresa', 'Cerrar', {
            duration: 3000
          });
          return EMPTY;
        }),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe(response => {
        console.log('[CompanyForm] Respuesta exitosa del servidor:', response);
        
        // Show different success messages based on role and type
        const message = this.userRole === 'PROVEEDOR' && this.providerType === 'INDIVIDUAL' 
          ? 'Tipo de proveedor guardado correctamente'
          : 'Datos de la empresa guardados correctamente';
          
        this.snackBar.open(message, 'Cerrar', {
          duration: 3000
        });
        
        // Update provider type only for PROVIDER role
        if (this.userRole === 'PROVEEDOR' && this.providerType) {
          this.providerTypeService.setProviderType(this.providerType);
        }
        
        this.formSubmitted.emit(companyData);
      });
  }
  
  // Método para marcar todos los campos como tocados
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}