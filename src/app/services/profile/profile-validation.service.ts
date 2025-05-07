import { Injectable } from '@angular/core';
import { Observable, combineLatest, map, of } from 'rxjs';
import { ProfileService } from './profile.service';
import { CompanyService } from '../company/company.service';
import { AuthService } from '../auth-service/auth.service';
import { CompanyInfoDto } from '../../models/company-info.dto';
import { UserRole } from '../../models/user';

@Injectable({
  providedIn: 'root'
})
export class ProfileValidationService {
  
  constructor(
    private profileService: ProfileService,
    private companyService: CompanyService,
    private authService: AuthService
  ) {}

  /**
   * Verifica si el perfil del usuario está completo según su rol
   * @returns Observable<boolean> que indica si el perfil está completo
   */
  isProfileComplete(): Observable<boolean> {
    const currentUser = this.authService.getCurrentUserSync();
    
    if (!currentUser || !currentUser.uid) {
      return of(false);
    }

    const userRole = currentUser.role;
    const uid = currentUser.uid;

    // Obtenemos los datos personales del usuario
    const personalData$ = this.profileService.getPersonalData(uid);
    
    // Obtenemos la información de la empresa
    const companyInfo$ = this.companyService.getCompanyInfo(uid);
    
    // Si es proveedor, también necesitamos el tipo de proveedor
    const providerType$ = userRole === 'PROVEEDOR' 
      ? this.profileService.getProviderType(uid)
      : of(null);

    // Combinamos todos los observables
    return combineLatest([personalData$, companyInfo$, providerType$]).pipe(
      map(([personalData, companyInfo, providerType]) => {
        // Validación para el rol CLIENTE
        if (userRole === 'CLIENTE') {
          return this.validateClientProfile(personalData, companyInfo);
        }
        
        // Validación para el rol PROVEEDOR
        if (userRole === 'PROVEEDOR') {
          return this.validateProviderProfile(personalData, companyInfo, providerType);
        }
        
        // Para otros roles (DEFAULT, ADMIN), no tenemos requisitos específicos por ahora
        return true;
      })
    );
  }

  /**
   * Valida que el perfil de un cliente tenga los datos mínimos requeridos
   */
  private validateClientProfile(personalData: any, companyInfo: CompanyInfoDto | null): boolean {
    // Cliente requiere datos personales y datos de empresa
    
    // Validación de datos personales
    const hasPersonalData = !!personalData && 
                          !!personalData.name && 
                          !!personalData.documentNumber;
    
    // Validación de datos de empresa (no tan estricta para clientes)
    const hasCompanyData = !!companyInfo && 
                          !!companyInfo.name;
    
    return hasPersonalData && hasCompanyData;
  }

  /**
   * Valida que el perfil de un proveedor tenga los datos mínimos requeridos
   */
  private validateProviderProfile(personalData: any, companyInfo: CompanyInfoDto | null, providerTypeData: any): boolean {
    // Validación de datos personales (siempre requerida)
    const hasPersonalData = !!personalData && 
                          !!personalData.name && 
                          !!personalData.documentNumber;
    
    // Validación de tipo de proveedor (siempre requerido para proveedor)
    const hasProviderType = !!providerTypeData && !!providerTypeData.providerType;
    const actualProviderType = providerTypeData?.providerType; // 'INDIVIDUAL' o 'COMPANY'

    // Validación condicional de datos de empresa
    let hasRequiredCompanyData = true; // Asumir verdadero para Individual
    if (actualProviderType === 'COMPANY') {
      // Si es Empresa, SÍ requiere datos de empresa
      hasRequiredCompanyData = !!companyInfo && 
                             !!companyInfo.name && 
                             !!companyInfo.taxId && 
                             !!companyInfo.phone;
    } else if (actualProviderType === 'INDIVIDUAL') {
      // Si es Individual, NO requiere datos de empresa
      hasRequiredCompanyData = true;
    } else {
      // Si no hay tipo definido aún, se considera incompleto (requiere seleccionar tipo)
      hasRequiredCompanyData = false;
    }
    
    // El perfil está completo si tiene datos personales, tipo de proveedor,
    // y los datos de empresa requeridos según el tipo.
    return hasPersonalData && hasProviderType && hasRequiredCompanyData;
  }
} 