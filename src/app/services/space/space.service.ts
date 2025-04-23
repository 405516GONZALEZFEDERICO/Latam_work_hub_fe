import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Space, SpaceDto, AmenityDto } from '../../models/space';

@Injectable({
  providedIn: 'root'
})
export class SpaceService {
  private apiUrl = 'http://localhost:8080/api/spaces'; 

  // Mock data for development
  private mockSpaces: Space[] = [
    {
      id: 1,
      name: 'Creative Studio A',
      description: 'A bright and spacious studio perfect for creative work, meetings, and collaborative sessions.',
      status: 'active',
      price: 50,
      capacity: 12,
      type: 'Studio',
      active: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80',
      area: 150,
      priceDay: 300,
      priceMonth: 5000,
      amenities: [
        { name: 'WiFi', price: '10' },
        { name: 'Projector', price: '25' },
        { name: 'Whiteboard', price: '5' },
        { name: 'Coffee Machine', price: '15' }
      ]
    },
    {
      id: 2,
      name: 'Meeting Room B',
      description: 'Professional meeting room equipped with modern technology and comfortable seating.',
      status: 'active',
      price: 40,
      capacity: 8,
      type: 'Meeting Room',
      active: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80',
      area: 100,
      priceDay: 250,
      priceMonth: 4000
    }
  ];

  constructor(private http: HttpClient) {}

  // Get all spaces
  getSpaces(): Observable<Space[]> {
    // For development, return mock data
    // In production, uncomment the HTTP request
    // return this.http.get<Space[]>(this.apiUrl);
    return of(this.mockSpaces);
  }

  // Get space by ID
  getSpaceById(id: string): Observable<Space> {
    // For development, return mock data
    // In production, uncomment the HTTP request
    // return this.http.get<Space>(`${this.apiUrl}/${id}`);
    const space = this.mockSpaces.find(s => s.id === Number(id));
    return of(space as Space);
  }

  // Create new space
  createSpace(spaceDto: SpaceDto, images: File[]): Observable<boolean> {
    const formData = new FormData();

    // Agregar el DTO como parte JSON
    formData.append('space', new Blob([JSON.stringify(spaceDto)], {
      type: 'application/json'
    }));

    // Agregar las imágenes
    if (images && images.length > 0) {
      images.forEach(image => {
        if (image) {
          formData.append('images', image, image.name);
        }
      });
    }

    return this.http.post<boolean>(`${this.apiUrl}`, formData).pipe(
      tap(response => console.log('Espacio creado exitosamente:', response)),
      catchError(error => {
        console.error('Error al crear el espacio:', error);
        return throwError(() => new Error('Error al crear el espacio'));
      })
    );
  }

  // Update existing space
  updateSpace(id: string, space: Space): Observable<Space> {
    // For development, return mock data
    // In production, uncomment the HTTP request
    // return this.http.put<Space>(`${this.apiUrl}/${id}`, space);
    const index = this.mockSpaces.findIndex(s => s.id === Number(id));
    if (index !== -1) {
      this.mockSpaces[index] = { ...space };
    }
    return of(space);
  }

  // Delete space
  deleteSpace(id: number): Observable<void> {
    // For development, return mock data
    // In production, uncomment the HTTP request
    // return this.http.delete<void>(`${this.apiUrl}/${id}`);
    const index = this.mockSpaces.findIndex(s => s.id === id);
    if (index !== -1) {
      this.mockSpaces.splice(index, 1);
    }
    return of(undefined);
  }
}