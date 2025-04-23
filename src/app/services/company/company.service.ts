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
    
    console.log(`CompanyService: Solicitando información de compañía para UID ${uid}`);
    
    return this.http.get<CompanyInfoDto>(`${this.apiUrl}/get-info-company`, { params })
      .pipe(
        catchError((error) => {
          console.error('Error al obtener información de la compañía:', error);
          return of(null);
        }),
        // Verificar si la respuesta parece vacía (todos los campos de texto están vacíos)
        map((response) => {
          console.log('CompanyService: Respuesta del backend:', response);
          
          // Si no hay respuesta, retornar null
          if (!response) {
            console.log('CompanyService: No se recibió respuesta del backend');
            return null;
          }
          
          // Verificar si es un objeto vacío (todos los campos de texto están vacíos)
          const isEmpty = !response.name && !response.legalName && !response.taxId 
                        && !response.phone && !response.contactPerson;
          
          // Si el objeto está vacío pero tiene providerType, preservar solo eso
          if (isEmpty && response.providerType) {
            console.log('CompanyService: Objeto vacío con providerType:', response.providerType);
            return { 
              name: '',
              legalName: '',
              taxId: '',
              phone: '',
              email: response.email || '',
              website: '',
              contactPerson: '',
              country: response.country || 0,
              providerType: response.providerType
            } as CompanyInfoDto;
          } 
          // Si está completamente vacío, tratarlo como si no existiera
          else if (isEmpty) {
            console.log('CompanyService: Objeto completamente vacío');
            return null;
          }
          
          console.log('CompanyService: Datos válidos de compañía recibidos');
          return response;
        })
      );
  }

  createOrUpdateCompanyInfo(userId: string, companyData: CompanyInfoDto): Observable<any> {
    console.log('Enviando datos de empresa para', userId, companyData);
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