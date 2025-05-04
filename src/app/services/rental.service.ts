import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

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
  uid: string;
  startDate: Date;
  endDate: Date;
  status: string;
  monthlyAmount: number;
  depositAmount: number;
  autoRenew: boolean;
  renewalMonths: number;
}

export interface InvoiceHistory {
  id: number;
  invoiceNumber: string;
  totalAmount: number;
  issueDate: Date;
  dueDate: Date;
  paidDate: Date;
  status: string;
  type: string;
  description: string;
  paymentUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class RentalService {
  private apiUrl = `${environment.apiUrl}/api/rental-contracts`;

  constructor(private http: HttpClient) {}

  createRentalContract(contract: RentalContract): Observable<string> {
    return this.http.post<string>(this.apiUrl, contract);
  }

  getUserContracts(uid: string): Observable<RentalContractResponse[]> {
    return this.http.get<RentalContractResponse[]>(`${this.apiUrl}/user/${uid}`);
  }

  getPendingInvoices(contractId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${contractId}/pending-invoices`);
  }

  getCurrentInvoicePaymentLink(contractId: number): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/${contractId}/current-invoice/payment`);
  }

  cancelContract(contractId: number): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/${contractId}/cancel`, {});
  }

  renewContract(contractId: number, months: number): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/${contractId}/renew?months=${months}`, {});
  }

  getContractHistory(contractId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${contractId}/history`);
  }

  getContractInvoices(contractId: number): Observable<InvoiceHistory[]> {
    return this.http.get<InvoiceHistory[]>(`${this.apiUrl}/${contractId}/invoices`);
  }

  setupAutoRenewal(contractId: number, autoRenew: boolean, renewalMonths: number): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/${contractId}/auto-renewal`, {
      autoRenew,
      renewalMonths
    });
  }

  getCancellationPolicy(contractId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${contractId}/cancellation-policy`);
  }
} 