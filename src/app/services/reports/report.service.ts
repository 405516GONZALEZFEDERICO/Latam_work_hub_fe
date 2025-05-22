import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { 
  SpaceReportRow, 
  BookingReportRow, 
  UserReportRow, 
  ContractReportRow, 
  InvoiceReportRow, 
  ExpiringContractAlert, 
  OverdueInvoiceAlert,
  SpaceReportFilters,
  BookingReportFilters,
  UserReportFilters,
  ContractReportFilters,
  InvoiceReportFilters,
  ExpiringContractsAlertFilters,
  OverdueInvoicesAlertFilters
} from '../../models/reports';

export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${environment.apiUrl}/reports-admin`;

  constructor(private http: HttpClient) { }

  private buildParams<T>(filters?: T, page = 0, size = 10, sortField?: string, sortDirection?: string): HttpParams {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    // Añadir parámetros de ordenamiento si están disponibles
    if (sortField && sortDirection) {
      params = params.set('sort', `${sortField},${sortDirection}`);
    }
    
    if (!filters) return params;
    
    Object.keys(filters).forEach(key => {
      const value = (filters as any)[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    
    return params;
  }

  // Endpoints de informes
  
  getSpacesReport(filters?: SpaceReportFilters, page = 0, size = 10, sortField?: string, sortDirection?: string): Observable<PageResponse<SpaceReportRow>> {
    const params = this.buildParams<SpaceReportFilters>(filters, page, size, sortField, sortDirection);
    return this.http.get<PageResponse<SpaceReportRow>>(`${this.apiUrl}/spaces`, { params });
  }

  getBookingsReport(filters?: BookingReportFilters, page = 0, size = 10, sortField?: string, sortDirection?: string): Observable<PageResponse<BookingReportRow>> {
    const params = this.buildParams<BookingReportFilters>(filters, page, size, sortField, sortDirection);
    return this.http.get<PageResponse<BookingReportRow>>(`${this.apiUrl}/bookings`, { params });
  }

  getUsersReport(filters?: UserReportFilters, page = 0, size = 10, sortField?: string, sortDirection?: string): Observable<PageResponse<UserReportRow>> {
    const params = this.buildParams<UserReportFilters>(filters, page, size, sortField, sortDirection);
    return this.http.get<PageResponse<UserReportRow>>(`${this.apiUrl}/users`, { params });
  }

  getContractsReport(filters?: ContractReportFilters, page = 0, size = 10, sortField?: string, sortDirection?: string): Observable<PageResponse<ContractReportRow>> {
    const params = this.buildParams<ContractReportFilters>(filters, page, size, sortField, sortDirection);
    return this.http.get<PageResponse<ContractReportRow>>(`${this.apiUrl}/contracts`, { params });
  }

  getInvoicesReport(filters?: InvoiceReportFilters, page = 0, size = 10, sortField?: string, sortDirection?: string): Observable<PageResponse<InvoiceReportRow>> {
    const params = this.buildParams<InvoiceReportFilters>(filters, page, size, sortField, sortDirection);
    return this.http.get<PageResponse<InvoiceReportRow>>(`${this.apiUrl}/invoices`, { params });
  }

  getExpiringContractsAlerts(filters?: ExpiringContractsAlertFilters, page = 0, size = 10, sortField?: string, sortDirection?: string): Observable<PageResponse<ExpiringContractAlert>> {
    const params = this.buildParams<ExpiringContractsAlertFilters>(filters, page, size, sortField, sortDirection);
    return this.http.get<PageResponse<ExpiringContractAlert>>(`${this.apiUrl}/alerts/expiring-contracts`, { params });
  }

  getOverdueInvoicesAlerts(filters?: OverdueInvoicesAlertFilters, page = 0, size = 10, sortField?: string, sortDirection?: string): Observable<PageResponse<OverdueInvoiceAlert>> {
    const params = this.buildParams<OverdueInvoicesAlertFilters>(filters, page, size, sortField, sortDirection);
    return this.http.get<PageResponse<OverdueInvoiceAlert>>(`${this.apiUrl}/alerts/overdue-invoices`, { params });
  }
}
