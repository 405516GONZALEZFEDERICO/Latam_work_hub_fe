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

export interface InvoiceAmenityDto {
  amenityId: number;
  amenityName: string;
  price: number;
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
  amenities?: InvoiceAmenityDto[];
}

export interface InvoiceHistoryDto {
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
  amenities?: InvoiceAmenityDto[];
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

export interface IsAutoRenewalDto {
  isAutoRenewal: boolean;
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
  generateInvoicePaymentLink(contractId: number, invoice?: InvoiceEntity | InvoiceHistoryDto, contract?: RentalContractResponse): Observable<string> {
    console.log('=== GENERANDO ENLACE DE PAGO ===');
    console.log('Contract ID enviado al backend:', contractId);
    
    // Calcular el total incluyendo amenidades (SOLO primera mensualidad + amenidades)
    let totalAmount = 0;
    let amenitiesTotal = 0;
    
    if (invoice) {
      console.log('🚨 Monto en BD:', invoice.totalAmount);
      
      // Calcular total de amenidades
      if (invoice.amenities && invoice.amenities.length > 0) {
        amenitiesTotal = invoice.amenities.reduce((sum, amenity) => sum + amenity.price, 0);
        console.log('=== DESGLOSE DE AMENIDADES ===');
        invoice.amenities.forEach((amenity, index) => {
          console.log(`${index + 1}. ${amenity.amenityName}: $${amenity.price}`);
        });
        console.log('Total amenidades:', amenitiesTotal);
        console.log('==========================');
      }
      
      // 🔧 CORRECCIÓN: Solo enviar primera mensualidad + amenidades
      // El depósito se agrega automáticamente en el backend
      const expectedMonthlyAmount = 3000; // Primera mensualidad
      totalAmount = expectedMonthlyAmount + amenitiesTotal; // 3000 + amenidades
      
      console.log('=== CÁLCULO CORRECTO ===');
      console.log('Primera mensualidad:', expectedMonthlyAmount);
      console.log('Total amenidades:', amenitiesTotal);
      console.log('TOTAL ENVIADO AL BACKEND:', totalAmount, '(sin depósito)');
      console.log('ℹ️  El backend agregará el depósito ($3000) automáticamente');
      console.log('ℹ️  Total final esperado:', totalAmount + 3000, '(mensualidad + amenidades + depósito)');
      console.log('========================');
    } else {
      console.warn('⚠️  No se proporcionó información de la factura');
      // Si no hay factura, usar solo la primera mensualidad
      totalAmount = 3000;
    }
    
    console.log('URL del endpoint:', `${this.apiUrl}/${contractId}/current-invoice/payment`);
    
    // Crear el PaymentRequestDto - Solo enviar mensualidad + amenidades
    const paymentRequestDto = {
      totalAmount: totalAmount,
      description: `Primera mensualidad + servicios extras - Factura ${invoice?.invoiceNumber || 'N/A'}`
    };
    
    console.log('=== DATOS ENVIADOS AL BACKEND ===');
    console.log('PaymentRequestDto:', JSON.stringify(paymentRequestDto, null, 2));
    console.log('⚠️  IMPORTANTE: Este monto NO incluye el depósito');
    console.log('⚠️  El backend agregará automáticamente $3000 de depósito');
    console.log('================================');
    
    return this.http.post(`${this.apiUrl}/${contractId}/current-invoice/payment`, paymentRequestDto, { 
      responseType: 'text',
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(response => {
        console.log('=== RESPUESTA DEL BACKEND ===');
        console.log('URL de pago recibida:', response);
        const expectedFinalAmount = totalAmount + 3000; // mensualidad + amenidades + depósito
        console.log('Monto final esperado en URL:', expectedFinalAmount);
        console.log('============================');
        
        if (response && response.trim() !== '') {
          return response;
        }
        throw new Error('La respuesta del servidor no contiene una URL de pago válida');
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('=== ERROR EN PAGO ===');
        console.error('Status:', error.status);
        console.error('Error:', error.error);
        console.error('Message:', error.message);
        console.error('===================');
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
        return this.generateInvoicePaymentLink(contractId, pendingInvoice);
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
      .set('size', size.toString())
      .set('sort', 'id,desc'); // Ordenar por ID descendente en el backend
      
    if (status) {
      params = params.set('status', status);
    }
    
    console.log('Parámetros de consulta:', {
      page: page,
      size: size,
      sort: 'id,desc',
      status: status
    });
    
    return this.http.get<PaginatedResponse<RentalContractResponse>>(`${this.apiUrl}/user/${uid}`, { params });
  }

  getPendingInvoices(contractId: number): Observable<InvoiceEntity[]> {
    return this.http.get<InvoiceEntity[]>(`${this.apiUrl}/${contractId}/pending-invoices`);
  }

  cancelContract(contractId: number): Observable<string> {
    return this.http.post(`${this.apiUrl}/${contractId}/cancel`, {}, { responseType: 'text' });
  }

  renewContract(contractId: number, months: number): Observable<string> {
    return this.http.post(`${this.apiUrl}/${contractId}/renew?months=${months}`, {}, { 
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
        console.error('Error al renovar contrato:', error);
        return throwError(() => new Error('Error al renovar el contrato'));
      })
    );
  }

  getContractHistory(contractId: number): Observable<ContractStateChange[]> {
    return this.http.get<ContractStateChange[]>(`${this.apiUrl}/${contractId}/history`);
  }

  getContractInvoices(contractId: number): Observable<InvoiceHistoryDto[]> {
    return this.http.get<InvoiceHistoryDto[]>(`${this.apiUrl}/${contractId}/invoices`);
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

  isAutoRenewal(contractId: number): Observable<IsAutoRenewalDto> {
    return this.http.get<IsAutoRenewalDto>(`${this.apiUrl}/${contractId}/auto-renewal`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error al verificar renovación automática:', error);
        // Retornamos un objeto con valores por defecto en caso de error
        // en lugar de lanzar un error
        return of({
          isAutoRenewal: false,
          renewalMonths: 12
        });
      })
    );
  }

  updateIsAutoRenewal(contractId: number, isAutoRenewal: boolean): Observable<boolean> {
    return this.http.put<boolean>(`${this.apiUrl}/${contractId}/update-is-auto-renewal?isAutoRenewal=${isAutoRenewal}`, {}).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error al actualizar renovación automática:', error);
        // Si estamos desactivando la renovación, devolvemos true para simular éxito
        // y evitar mensajes de error innecesarios
        if (!isAutoRenewal) {
          return of(true);
        }
        return throwError(() => new Error('Error al actualizar la renovación automática'));
      })
    );
  }
}