import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, retry, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';
import { CompanyInfoDto } from '../../models/company-info.dto';
import { ErrorHandlerService } from '../error/error-handler.service';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) {
    console.log('API URL configurada en CompanyService:', this.apiUrl);
  }

  /**
   * Crea o actualiza la información de la compañía
   * @param userId ID del usuario
   * @param companyInfo Información de la compañía
   * @returns Observable con la respuesta
   */
  createOrUpdateCompanyInfo(userId: string, companyInfo: CompanyInfoDto): Observable<any> {
    const url = `${this.apiUrl}/company/select-provider-type?uid=${userId}`;
    console.log(`Enviando datos de compañía al endpoint: ${url}`, companyInfo);
    
    return this.http.post<any>(url, companyInfo)
      .pipe(
        // Intentar hasta 3 veces en caso de errores de concurrencia
        retry({
          count: 3,
          delay: (error, retryCount) => this.errorHandler.handleOptimisticLockingRetry(error, retryCount)
        }),
        catchError(error => {
          console.error('Error en createOrUpdateCompanyInfo:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene la información de la compañía
   * @param userId ID del usuario
   * @returns Observable con la información
   */
  getCompanyInfo(userId: string): Observable<any> {
    const url = `${this.apiUrl}/company/get-info-company?uid=${userId}`;
    console.log(`Obteniendo datos de compañía del endpoint: ${url}`);
    
    return this.http.get<any>(url)
      .pipe(
        catchError(error => {
          console.error('Error en getCompanyInfo:', error);
          return throwError(() => error);
        })
      );
  }
} 