import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environment/environment';

export interface Amenity {
  id?: number;
  name: string;
  price: number;
}

@Injectable({
  providedIn: 'root'
})
export class AmenityService {
  private apiUrl = environment.apiUrl + '/amenities/all';

  // Predefined amenities for quick selection
  private predefinedAmenities: Amenity[] = [
    { id: 1, name: 'WiFi', price: 10 },
    { id: 2, name: 'Proyector', price: 25 },
    { id: 3, name: 'Pizarra', price: 5 },
    { id: 4, name: 'Aire Acondicionado', price: 15 },
    { id: 5, name: 'Café', price: 8 },
    { id: 6, name: 'Impresora', price: 12 },
    { id: 7, name: 'Estacionamiento', price: 20 },
    { id: 8, name: 'TV', price: 18 },
    { id: 9, name: 'Cocina', price: 15 },
    { id: 10, name: 'Escritorios', price: 10 }
  ];

  constructor(private http: HttpClient) {}

  getPredefinedAmenities(): Observable<Amenity[]> { 
    return this.http.get<Amenity[]>(this.apiUrl).pipe(
      catchError(error => {
        console.error('Error fetching amenities:', error);
        return of(this.predefinedAmenities);
      })
    );
  }

  // Add a new custom amenity
  addAmenity(amenity: Amenity): Observable<Amenity> {
    // For development, just return the amenity with a fake ID
    // In production, uncomment the HTTP post request
    // return this.http.post<Amenity>(this.apiUrl, amenity);
    return of({
      ...amenity,
      id: Math.floor(Math.random() * 1000) + 11 // Generate a fake ID
    });
  }
} 