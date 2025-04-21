import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CompanyService } from '../company/company.service';
import { AuthService } from '../auth-service/auth.service';

export type ProviderType = 'individual' | 'company' | null;

@Injectable({
  providedIn: 'root'
})
export class ProviderTypeService {
  private providerTypeSubject = new BehaviorSubject<ProviderType>(null);
  
  constructor(
    private companyService: CompanyService,
    private authService: AuthService
  ) {
    // Intentar cargar el tipo de proveedor al iniciar el servicio
    this.loadProviderType();
  }
  
  /**
   * Carga el tipo de proveedor desde el backend o el localStorage
   */
  loadProviderType(): void {
    // Primero intentar obtener del localStorage para evitar llamadas innecesarias
    const savedType = localStorage.getItem('providerType');
    if (savedType && (savedType === 'individual' || savedType === 'company')) {
      this.providerTypeSubject.next(savedType as ProviderType);
    }
    
    // Luego intentar obtener del backend para asegurar datos actualizados
    const currentUser = this.authService.getCurrentUserSync();
    if (currentUser && currentUser.uid) {
      this.companyService.getCompanyInfo(currentUser.uid).subscribe({
        next: (companyData) => {
          if (companyData) {
            console.log('Datos de compañía obtenidos para determinar tipo de proveedor:', companyData);
            
            // Obtener el tipo de proveedor del backend, teniendo en cuenta que puede estar en mayúscula o minúscula
            const backendProviderType = companyData.providerType || companyData.ProviderType;
            
            if (backendProviderType) {
              const providerTypeValue = backendProviderType.toLowerCase();
              console.log('Tipo de proveedor detectado del backend:', providerTypeValue);
              
              if (providerTypeValue === 'individual' || providerTypeValue === 'company') {
                const providerType = providerTypeValue as ProviderType;
                this.providerTypeSubject.next(providerType);
                if (providerType !== null) {
                  localStorage.setItem('providerType', providerType);
                }
              }
            }
          }
        },
        error: (err) => {
          // No mostrar error si es que el usuario no tiene datos de compañía aún (404)
          if (err.status !== 404) {
            console.error('Error al cargar el tipo de proveedor:', err);
          }
        }
      });
    }
  }
  
  /**
   * Establece el tipo de proveedor seleccionado
   * @param type El tipo de proveedor
   */
  setProviderType(type: ProviderType): void {
    this.providerTypeSubject.next(type);
    
    // Guardar en localStorage para persistencia entre sesiones
    if (type) {
      localStorage.setItem('providerType', type);
    } else {
      localStorage.removeItem('providerType');
    }
  }
  
  /**
   * Obtiene el tipo de proveedor actual
   * @returns Observable con el tipo de proveedor
   */
  getProviderType(): Observable<ProviderType> {
    return this.providerTypeSubject.asObservable();
  }
  
  /**
   * Obtiene el valor actual del tipo de proveedor de forma síncrona
   * @returns El tipo de proveedor actual
   */
  getCurrentProviderType(): ProviderType {
    return this.providerTypeSubject.getValue();
  }
} 