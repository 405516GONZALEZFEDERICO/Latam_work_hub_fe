import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CompanyService } from '../company/company.service';
import { AuthService } from '../auth-service/auth.service';
import { CompanyInfoDto } from '../../models/company-info.dto';

export type ProviderType = 'INDIVIDUAL' | 'COMPANY' | null;

@Injectable({
  providedIn: 'root'
})
export class ProviderTypeService {
  private providerTypeSubject = new BehaviorSubject<ProviderType>(this.getStoredProviderType());
  currentProviderType$ = this.providerTypeSubject.asObservable();

  constructor(
    private companyService: CompanyService,
    private authService: AuthService
  ) {
    // Initialize from localStorage on service creation
    const storedType = this.getStoredProviderType();
    if (storedType) {
      this.providerTypeSubject.next(storedType);
    }
    
    // Subscribe to auth changes to load provider type when user logs in
    this.authService.currentUser$.subscribe(user => {
      if (user && user.uid && user.role === 'PROVEEDOR') {
        // Load provider type on login for PROVEEDOR users
        this.loadProviderType();
      } else if (!user) {
        // Reset provider type on logout
        this.resetProviderType();
      }
    });
  }

  private getStoredProviderType(): ProviderType {
    const storedType = localStorage.getItem('providerType');
    return (storedType === 'INDIVIDUAL' || storedType === 'COMPANY') ? storedType : null;
  }

  /**
   * Limpia el tipo de proveedor y lo reinicia a null
   */
  resetProviderType(): void {
    this.providerTypeSubject.next(null);
    localStorage.removeItem('providerType');
  }

  /**
   * Carga el tipo de proveedor desde el backend
   */
  loadProviderType(): void {
    const currentUser = this.authService.getCurrentUserSync();
    if (!currentUser?.uid) {
      return;
    }

    this.companyService.getCompanyInfo(currentUser.uid).subscribe({
      next: (companyData: CompanyInfoDto | null) => {
        if (companyData) {
          // Si hay datos de compañía, determinar el tipo de proveedor
          let validType: ProviderType = null;
          
          // Verificar si existe tipo explícito en los datos
          if (companyData.providerType) {
            // Normalizar a mayúsculas para asegurar consistencia
            const normalizedType = companyData.providerType.toUpperCase();
            // Use stricter checks for type values
            if (normalizedType === 'INDIVIDUAL') {
              validType = 'INDIVIDUAL';
            } else if (normalizedType === 'COMPANY') {
              validType = 'COMPANY';
            } else {
              console.warn('Unknown provider type found:', normalizedType);
            }
          } else {
            // Si la respuesta tiene datos significativos de compañía pero no provider type
            const hasCompanyData = !!(companyData.name || companyData.legalName || companyData.taxId);
            
            if (hasCompanyData) {
              // Si hay datos de compañía significativos pero no type, asumir COMPANY
              validType = 'COMPANY';
            } else {
              // Si no hay datos significativos ni provider type, mantener lo almacenado en localStorage
              const storedType = this.getStoredProviderType();
              if (storedType) {
                validType = storedType;
              }
            }
          }
          
          if (validType) {
            this.setProviderType(validType, true);
          } else {
            console.warn('Tipo de proveedor no reconocido o no encontrado');
            
            // Intentar recuperar de localStorage como fallback
            const storedType = this.getStoredProviderType();
            if (storedType) {
              this.providerTypeSubject.next(storedType);
            }
          }
        } else {
          // No hay datos de compañía en la respuesta
          
          // No resetear el tipo si ya hay uno guardado en localStorage
          const storedType = this.getStoredProviderType();
          if (!storedType) {
            this.resetProviderType();
          } else {
            // Asegurarse de que el subject tenga el valor de localStorage
            this.providerTypeSubject.next(storedType);
          }
        }
      },
      error: (err: any) => {
        // No resetear el tipo si el error es 404 y hay un tipo guardado
        if (err && 'status' in err && err['status'] === 404) {
          const storedType = this.getStoredProviderType();
          if (storedType) {
            // Asegurarse de que el subject tenga el valor de localStorage
            this.providerTypeSubject.next(storedType);
            return;
          }
        }
        console.error('Error loading provider type:', err);
        
        // Intento final de recuperar de localStorage antes de resetear
        const storedType = this.getStoredProviderType();
        if (storedType) {
          this.providerTypeSubject.next(storedType);
        } else {
          this.resetProviderType();
        }
      }
    });
  }

  /**
   * Establece el tipo de proveedor seleccionado
   * @param type El tipo de proveedor a establecer
   * @param force Si es true, fuerza la actualización incluso si el valor es el mismo
   */
  setProviderType(type: ProviderType, force: boolean = false): void {
    const currentType = this.getCurrentProviderType();
    
    // Always allow setting type if it's explicitly different or force is true
    if (force || type !== currentType || type === null) {
      this.providerTypeSubject.next(type);

      if (type) {
        localStorage.setItem('providerType', type);
      } else {
        localStorage.removeItem('providerType');
      }
    } else {
    }
  }

  /**
   * Obtiene el tipo de proveedor actual como Observable
   */
  getProviderType(): Observable<ProviderType> {
    return this.currentProviderType$;
  }

  /**
   * Obtiene el valor actual del tipo de proveedor
   */
  getCurrentProviderType(): ProviderType {
    return this.providerTypeSubject.getValue();
  }
}