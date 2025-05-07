import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
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
  bookingType?: string; // Tipo de reserva: PER_HOUR, PER_DAY, PER_MONTH
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
  // Use environment variable if available, fallback to the current URL
  private apiUrl = environment.apiUrl ? `${environment.apiUrl}/booking` : 'http://localhost:8080/api/booking';

  constructor(private http: HttpClient) {
  }

  createBooking(bookingDto: BookingDto): Observable<any> {
    
    // Use responseType: 'text' to get the raw response
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
}