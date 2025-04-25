import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Amenity, AmenityDto } from '../../models/space.model';
import { environment } from '../../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class AmenityService {
  private readonly apiUrl = `${environment.apiUrl}/amenities`;

  // Predefined amenities list for demo purposes
  private readonly predefinedAmenities: Amenity[] = [
    { name: 'Wi-Fi', icon: 'wifi', price: 0 },
    { name: 'Aire acondicionado', icon: 'ac_unit', price: 0 },
    { name: 'Proyector', icon: 'videocam', price: 0 },
    { name: 'Impresora', icon: 'print', price: 0 },
    { name: 'Cafetería', icon: 'coffee', price: 0 },
    { name: 'Estacionamiento', icon: 'local_parking', price: 0 },
    { name: 'Cocina', icon: 'kitchen', price: 0 },
    { name: 'Baños privados', icon: 'wc', price: 0 },
    { name: 'Acceso 24/7', icon: 'access_time', price: 0 },
    { name: 'Seguridad', icon: 'security', price: 0 }
  ];

  constructor(private http: HttpClient) { }

  /**
   * Get predefined amenities
   */
  getPredefinedAmenities(): Observable<Amenity[]> {
    // For now, return the predefined list
    // In a production environment, this would likely be fetched from an API
    return of(this.predefinedAmenities);
  }

  /**
   * Get amenities from the API
   */
  getAmenities(): Observable<AmenityDto[]> {
    return this.http.get<AmenityDto[]>(`${this.apiUrl}/all`);
  }

  /**
   * Get a specific amenity by ID
   */
  getAmenityById(id: string): Observable<AmenityDto> {
    return this.http.get<AmenityDto>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create a new amenity
   */
  createAmenity(amenity: AmenityDto): Observable<AmenityDto> {
    return this.http.post<AmenityDto>(this.apiUrl, amenity);
  }

  /**
   * Update an existing amenity
   */
  updateAmenity(id: string, amenity: AmenityDto): Observable<AmenityDto> {
    return this.http.put<AmenityDto>(`${this.apiUrl}/${id}`, amenity);
  }

  /**
   * Delete an amenity
   */
  deleteAmenity(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
} 