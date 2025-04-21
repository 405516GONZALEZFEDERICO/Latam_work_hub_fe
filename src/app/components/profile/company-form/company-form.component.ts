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
import { ProviderTypeService, ProviderType } from '../../../services/provider/provider-type.service';

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
  @Input() providerType?: string;
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
    this.initForm();
    this.loadCountries();
    
    // Configurar el debounce para evitar múltiples envíos rápidos
    this.submitAction$.pipe(
      takeUntil(this.destroy$),
      debounceTime(500) // 500ms debounce para evitar múltiples clics
    ).subscribe(() => {
      this.processFormSubmission();
    });
    
    // Obtener el ID del usuario actual
    const user = this.authService.getCurrentUserSync();
    if (user && user.uid) {
      this.currentUserId = user.uid;
      
      // Obtener el tipo de proveedor si no se proporciona como Input
      if (!this.providerType) {
        this.providerType = this.providerTypeService.getCurrentProviderType() || undefined;
      }
      
      // Solo cargar datos de la compañía si no estamos en el flujo de selección de tipo de proveedor
      // Un proveedor con tipo no definido está en el proceso de selección, no debemos cargar datos aún
      if (!(this.userRole === 'PROVEEDOR' && !this.providerType)) {
        console.log('Cargando datos de la compañía...');
        this.loadCompanyData(this.currentUserId);
      } else {
        console.log('Omitiendo carga de datos de compañía durante selección de tipo de proveedor');
      }
    }
    
    // Observar cambios en el tipo de proveedor
    this.providerTypeService.getProviderType()
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        if (type !== this.providerType) {
          this.providerType = type || undefined;
          
          // Si cambia a 'company', cargar datos de la empresa
          if (this.providerType === 'company' && this.currentUserId) {
            this.loadCompanyData(this.currentUserId);
          }
        }
      });
    
    console.log('CompanyFormComponent inicializado');
    console.log('¿Tiene observadores el evento back?:', this.back.observed);
    console.log('Rol de usuario:', this.userRole);
    console.log('Tipo de proveedor:', this.providerType);
  }
  
  ngOnDestroy(): void {
    // Limpiar suscripciones al destruir el componente
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadCompanyData(userId: string): void {
    // Solo cargar datos si es proveedor tipo empresa o no es proveedor
    if (this.providerType !== 'individual') {
      this.isLoadingCompanyData = true;
      this.apiError = null; // Limpiar errores anteriores
      console.log(`[CompanyForm] Intentando cargar datos de la compañía para usuario ${userId}, providerType: ${this.providerType}`);
      
      this.companyService.getCompanyInfo(userId)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            // No mostrar error si es que el usuario no tiene datos de compañía aún
            if (error.status !== 404) {
              console.error('[CompanyForm] Error al cargar datos de la compañía:', error);
              console.error('[CompanyForm] URL:', error.url);
              console.error('[CompanyForm] Status:', error.status, error.statusText);
              console.error('[CompanyForm] Error mensaje:', error.message);
              if (error.error) {
                console.error('[CompanyForm] Error detalle:', error.error);
              }
              
              // Guardar el error para mostrarlo en la interfaz
              this.apiError = error;
              
              this.errorHandler.showErrorMessage(error, 'Error al cargar los datos de la empresa');
            } else {
              console.log('[CompanyForm] No se encontraron datos de compañía para el usuario (404)');
            }
            return EMPTY;
          }),
          finalize(() => {
            this.isLoadingCompanyData = false;
          })
        )
        .subscribe(companyData => {
          if (companyData) {
            console.log('[CompanyForm] Datos de compañía cargados exitosamente:', companyData);
            
            // Obtener el tipo de proveedor, teniendo en cuenta que puede estar en mayúscula o minúscula
            const backendProviderType = companyData.providerType || companyData.ProviderType;
            
            // Actualizar el tipo de proveedor con los datos obtenidos
            if (backendProviderType) {
              const providerTypeValueLower = backendProviderType.toLowerCase();
              console.log(`[CompanyForm] Tipo de proveedor detectado: ${backendProviderType} (normalizado: ${providerTypeValueLower})`);
              
              if (providerTypeValueLower === 'company') {
                this.providerType = 'company';
                this.providerTypeService.setProviderType('company');
              } else if (providerTypeValueLower === 'individual') {
                this.providerType = 'individual';
                this.providerTypeService.setProviderType('individual');
              }
            }
            
            // Actualizar el formulario con los datos recibidos
            this.companyForm.patchValue({
              name: companyData.name,
              legalName: companyData.legalName,
              taxId: companyData.taxId,
              phone: companyData.phone,
              email: companyData.email,
              website: companyData.website || '',
              contactPerson: companyData.contactPerson || '',
              country: companyData.country.toString()
            });
            
            console.log('[CompanyForm] Formulario actualizado con datos cargados');
          } else {
            console.log('[CompanyForm] No se encontraron datos de compañía para el usuario:', userId);
          }
        });
    } else {
      console.log(`[CompanyForm] Omitiendo carga de datos para proveedor tipo ${this.providerType}`);
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
    console.log('[CompanyForm] Iniciando envío del formulario', {
      userRole: this.userRole,
      providerType: this.providerType,
      isFormValid: this.companyForm.valid,
      hasUserId: !!this.currentUserId
    });
    
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
    if (this.companyForm.valid) {
      this.isSubmitting = true;
      this.apiError = null; // Limpiar errores anteriores
      
      // Obtener los datos del formulario
      const companyData: CompanyInfoDto = {
        ...this.companyForm.value,
        country: parseInt(this.companyForm.value.country, 10)
      };
      
      // Solo agregar providerType si es un proveedor
      if (this.userRole === 'PROVEEDOR') {
        companyData.ProviderType = this.providerType;
        console.log(`[CompanyForm] Incluyendo ProviderType: ${this.providerType}`);
      } else {
        console.log(`[CompanyForm] No se incluye ProviderType porque el rol es: ${this.userRole}`);
      }
      
      const userId = this.currentUserId;
      
      console.log(`[CompanyForm] Datos completos a enviar para el usuario ${userId}:`, companyData);
      
      this.companyService.createOrUpdateCompanyInfo(userId, companyData)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            console.error('[CompanyForm] Error al enviar datos de la compañía:', error);
            console.error('[CompanyForm] URL:', error.url);
            console.error('[CompanyForm] Status:', error.status, error.statusText);
            console.error('[CompanyForm] Error mensaje:', error.message);
            if (error.error) {
              console.error('[CompanyForm] Error detalle:', error.error);
            }
            
            // Guardar el error para mostrarlo en la interfaz
            this.apiError = error;
            
            this.errorHandler.showErrorMessage(error, 'Error al guardar los datos de la empresa');
            return EMPTY;
          }),
          finalize(() => {
            this.isSubmitting = false;
          })
        )
        .subscribe(response => {
          console.log('[CompanyForm] Respuesta exitosa del servidor:', response);
          
          if (!response) {
            console.warn('[CompanyForm] Advertencia: El servidor devolvió una respuesta vacía');
          }
          
          this.snackBar.open('Datos de empresa guardados correctamente', 'Cerrar', {
            duration: 3000
          });
          
          // Actualizar el tipo de proveedor en el servicio
          if (this.providerType) {
            this.providerTypeService.setProviderType(this.providerType as ProviderType);
          }
          
          // Emitir evento de formulario enviado con los datos
          this.formSubmitted.emit(companyData);
        });
    } else {
      this.markFormGroupTouched(this.companyForm);
    }
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