import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

export interface BookingDto {
  uid: string;
  spaceId: number;
  startDate: string;
  endDate?: string;
  initHour?: string;
  endHour?: string;
  counterPersons: number;
  totalAmount: number;
  bookingType?: string; // PER_HOUR, PER_DAY, PER_MONTH
}

export interface BookingResponseDto {
  id: number;
  startDate: string;
  endDate: string;
  initHour: string;
  endHour: string;
  bookingType: string;
  status: string;
  counterPersons: number;
  totalAmount: number;
  spaceId: number;
  spaceName: string;
  spaceAddress: string;
  spaceType: string;
  cityName: string;
  countryName: string;
  [key: string]: any;
}

export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      unsorted: boolean;
      empty: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  size: number;
  number: number;
  sort: {
    sorted: boolean;
    unsorted: boolean;
    empty: boolean;
  };
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = `${environment.apiUrl}/booking`;
  }

  createBooking(bookingDto: BookingDto): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/create`,
      bookingDto,
      { responseType: 'text' }
    );
  }

  getUserBookings(uid: string, status?: string, page: number = 0, size: number = 10): Observable<PageResponse<BookingResponseDto>> {
    let url = `${this.apiUrl}/user/${uid}?page=${page}&size=${size}&sort=id,desc`;
    
    if (status) {
      url += `&status=${status}`;
    }
    
    return this.http.get<PageResponse<BookingResponseDto>>(url);
  }

  generateBookingPaymentLink(bookingId: number): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/bookings/${bookingId}/payment`,
      {},
      { responseType: 'text' }
    );
  }

  refundBooking(bookingId: number): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/refound`,
      {},
      { 
        params: { bookingId: bookingId.toString() },
        responseType: 'text'
      }
    );
  }
}