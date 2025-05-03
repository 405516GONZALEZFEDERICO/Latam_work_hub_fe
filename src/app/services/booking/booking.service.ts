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
} 