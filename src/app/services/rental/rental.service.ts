import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environment/environment';

export interface RentalContract {
  spaceId: number;
  uid: string;
  startDate: Date;
  durationMonths: number;
  monthlyAmount: number;
  depositAmount: number;
}

export interface RentalContractResponse {
  id: number;
  spaceId: number;
  spaceName: string;
  spaceAddress: string;
  spaceDescription: string;
  spaceArea: number;
  spaceCapacity: number;
  pricePerHour: number;
  pricePerDay: number;
  pricePerMonth: number;
  spaceType: string;
  cityName: string;
  countryName: string;
  ownerName: string;
  uid?: string;
  startDate: Date;
  endDate: Date;
  monthlyAmount: number;
  depositAmount: number;
  status: string;
  autoRenew?: boolean;
  renewalMonths?: number;
  hasCurrentInvoicePending?: boolean;
  currentInvoiceNumber?: string;
  currentInvoiceDueDate?: Date;
}

export interface InvoiceEntity {
  id: number;
  invoiceNumber: string;
  totalAmount: number;
  issueDate: string | Date | null;
  dueDate: string | Date | null;
  paidDate: string | Date | null;
  status: string;
  description: string;
  paymentUrl: string;
}

export interface InvoiceHistory {
  id: number;
  invoiceNumber: string;
  totalAmount: number;
  issueDate: string | Date | null;
  dueDate: string | Date | null;
  paidDate: string | Date | null;
  status: string;
  type: string;
  description: string;
  paymentUrl: string;
}

export interface ContractStateChange {
  id: number;
  contractId: number;
  previousStatus: string;
  newStatus: string;
  changeDate: Date;
  changeReason: string;
}

export interface AutoRenewalDto {
  autoRenew: boolean;
  renewalMonths: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // page number (0-based)
  first: boolean;
  last: boolean;
}
@Injectable({
  providedIn: 'root'
})
export class RentalService {
  private apiUrl = `${environment.apiUrl}/rental-contracts`;

  constructor(private http: HttpClient) {
    console.log('RentalService inicializado con URL:', this.apiUrl);
  }

  // Método para obtener el enlace de pago para una factura específica
  generateInvoicePaymentLink(invoiceId: number): Observable<string> {
    return this.http.post(`${this.apiUrl}/invoices/${invoiceId}/payment`, {}, { 
      responseType: 'text',
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(response => {
        if (response && response.trim() !== '') {
          return response;
        }
        throw new Error('La respuesta del servidor no contiene una URL de pago válida');
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al obtener enlace de pago de factura:', error);
        return throwError(() => new Error('Error al generar el enlace de pago'));
      })
    );
  }

  // Método para obtener el enlace de pago de la factura actual
  getCurrentInvoicePaymentLink(contractId: number): Observable<string> {
    return this.getPendingInvoices(contractId).pipe(
      map(pendingInvoices => {
      if (pendingInvoices && pendingInvoices.length > 0) {
        const pendingInvoice = pendingInvoices[0];
        return this.generateInvoicePaymentLink(pendingInvoice.id);
      }
      return throwError(() => new Error('No se encontraron facturas pendientes para este contrato'));
      }),
      catchError((error: HttpErrorResponse) => {
      console.error('Error al procesar facturas pendientes:', error);
      return throwError(() => error);
      }),
      map(linkObservable => linkObservable as unknown as string) // Flatten the nested Observable
    );
      // Removed redundant block causing errors
  }

  // Resto de los métodos sin datos mockeados
  createRentalContract(data: any): Observable<string> {
    return this.http.post(`${this.apiUrl}`, data, { responseType: 'text' });
  }

  getUserContracts(uid: string, page: number = 0, size: number = 10, status?: string): Observable<PaginatedResponse<RentalContractResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
      
    if (status) {
      params = params.set('status', status);
    }
    
    return this.http.get<PaginatedResponse<RentalContractResponse>>(`${this.apiUrl}/user/${uid}`, { params });
  }

  getPendingInvoices(contractId: number): Observable<InvoiceEntity[]> {
    return this.http.get<InvoiceEntity[]>(`${this.apiUrl}/${contractId}/pending-invoices`);
  }

  cancelContract(contractId: number): Observable<string> {
    return this.http.post(`${this.apiUrl}/${contractId}/cancel`, {}, { responseType: 'text' });
  }

  renewContract(contractId: number, months: number): Observable<string> {
    return this.http.post(`${this.apiUrl}/${contractId}/renew?months=${months}`, {}, { responseType: 'text' });
  }

  getContractHistory(contractId: number): Observable<ContractStateChange[]> {
    return this.http.get<ContractStateChange[]>(`${this.apiUrl}/${contractId}/history`);
  }

  getContractInvoices(contractId: number): Observable<InvoiceHistory[]> {
    return this.http.get<InvoiceHistory[]>(`${this.apiUrl}/${contractId}/invoices`);
  }

  setupAutoRenewal(contractId: number, autoRenew: boolean, renewalMonths: number): Observable<string> {
    return this.http.post(`${this.apiUrl}/${contractId}/auto-renewal`, {
      autoRenew,
      renewalMonths
    }, { responseType: 'text' });
  }

  getCancellationPolicy(contractId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${contractId}/cancellation-policy`);
  }
}