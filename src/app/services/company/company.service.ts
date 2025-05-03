import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, map, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';
import { CompanyInfoDto } from '../../models/company-info.dto';
import { AuthService } from '../auth-service/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private apiUrl = `${environment.apiUrl}/company`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getCompanyInfo(uid: string): Observable<CompanyInfoDto | null> {
    const params = new HttpParams().set('uid', uid);
    
    
    return this.http.get<CompanyInfoDto>(`${this.apiUrl}/get-info-company`, { params })
      .pipe(
        catchError((error) => {
          return of(null);
        }),
        // Verificar si la respuesta parece vacía o solo contiene providerType
        map((response) => {
          
          // Si no hay respuesta, retornar null
          if (!response) {
            return null;
          }
          
          // Verificar si es un objeto casi vacío (todos los campos de texto están vacíos excepto posiblemente email)
          const isEmpty = !response.name && !response.legalName && !response.taxId 
                        && !response.phone && !response.contactPerson;
          
          // Si el objeto está vacío pero tiene providerType, preservar esa información
          if (isEmpty && response.providerType) {
            
            // Normalizar el tipo a mayúsculas para consistencia
            let typeString = typeof response.providerType === 'string' 
                             ? response.providerType.toUpperCase() 
                             : String(response.providerType).toUpperCase();
            
            // Determinar el tipo de proveedor correctamente tipado
            let providerTypeValue: 'INDIVIDUAL' | 'COMPANY' | undefined = undefined;
            if (typeString === 'INDIVIDUAL') {
              providerTypeValue = 'INDIVIDUAL';
            } else if (typeString === 'COMPANY') {
              providerTypeValue = 'COMPANY';
            }
            
            // Crear un objeto con los datos mínimos necesarios
            return { 
              name: response.name || 'Individual Provider', // Utilizar un nombre por defecto para providers individuales
              legalName: response.legalName || '',
              taxId: response.taxId || '',
              phone: response.phone || '',
              email: response.email || '',
              website: response.website || '',
              contactPerson: response.contactPerson || '',
              country: response.country || 0,
              providerType: providerTypeValue
            } as CompanyInfoDto;
          } 
          // Si está completamente vacío, tratarlo como si no existiera
          else if (isEmpty) {
            return null;
          }
          
          
          // Asegurarse de que el providerType esté correctamente normalizado
          if (response.providerType) {
            const typeString = typeof response.providerType === 'string' 
                             ? response.providerType.toUpperCase() 
                             : String(response.providerType).toUpperCase();
            
            if (typeString === 'INDIVIDUAL') {
              response.providerType = 'INDIVIDUAL';
            } else if (typeString === 'COMPANY') {
              response.providerType = 'COMPANY';
            }
          }
          
          return response;
        })
      );
  }

  createOrUpdateCompanyInfo(userId: string, companyData: CompanyInfoDto): Observable<any> {
    
    // Asegurarse de que el providerType esté correctamente formateado
    if (companyData.providerType) {
      const typeString = typeof companyData.providerType === 'string'
                         ? companyData.providerType.toUpperCase()
                         : String(companyData.providerType).toUpperCase();
      
      let updatedType: 'INDIVIDUAL' | 'COMPANY' | undefined = undefined;
      
      if (typeString === 'INDIVIDUAL') {
        updatedType = 'INDIVIDUAL';
      } else if (typeString === 'COMPANY') {
        updatedType = 'COMPANY';
      }
      
      if (updatedType) {
        companyData = {
          ...companyData,
          providerType: updatedType
        };
      }
    }
    
    return this.http.post<any>(
      `${this.apiUrl}/select-provider-type`,
      companyData,
      {
        params: { uid: userId }
      }
    ).pipe(
      catchError(error => {
        console.error('Error en createOrUpdateCompanyInfo:', error);
        return throwError(() => error);
      })
    );
  }
}