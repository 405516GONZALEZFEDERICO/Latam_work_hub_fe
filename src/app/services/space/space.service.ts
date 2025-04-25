import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Space, SpaceDto, AmenityDto, FilterState, AddressEntity } from '../../models/space.model';

@Injectable({
  providedIn: 'root'
})
export class SpaceService {
  private apiUrl = 'http://localhost:8080/api/spaces'; 

  // Mock data for development
  private mockSpaces: Space[] = [
    {
      id: '1',
      title: 'Espacio de coworking céntrico',
      imageUrl: 'assets/images/spaces/space1.jpg',
      address: 'Calle Principal 123, Ciudad',
      hourlyPrice: 15,
      monthlyPrice: 2000,
      capacity: 25,
      providerType: 'COMPANY'
    },
    {
      id: '2',
      title: 'Sala de reuniones ejecutiva',
      imageUrl: 'assets/images/spaces/space2.jpg',
      address: 'Avenida Central 456, Ciudad',
      hourlyPrice: 30,
      monthlyPrice: 3500,
      capacity: 10,
      providerType: 'INDIVIDUAL'
    },
    {
      id: '3',
      title: 'Oficina compartida moderna',
      imageUrl: 'assets/images/spaces/space3.jpg',
      address: 'Plaza Mayor 789, Ciudad',
      hourlyPrice: 20,
      monthlyPrice: 2800,
      capacity: 15,
      providerType: 'COMPANY'
    },
    {
      id: '4',
      title: 'Espacio creativo para startups',
      imageUrl: 'assets/images/spaces/space4.jpg',
      address: 'Calle Innovación 234, Ciudad',
      hourlyPrice: 18,
      monthlyPrice: 2300,
      capacity: 20,
      providerType: 'COMPANY'
    },
    {
      id: '5',
      title: 'Despacho privado equipado',
      imageUrl: 'assets/images/spaces/space5.jpg',
      address: 'Avenida Profesional 567, Ciudad',
      hourlyPrice: 25,
      monthlyPrice: 3000,
      capacity: 5,
      providerType: 'INDIVIDUAL'
    },
    {
      id: '6',
      title: 'Hub tecnológico colaborativo',
      imageUrl: 'assets/images/spaces/space6.jpg',
      address: 'Calle Tecnología 890, Ciudad',
      hourlyPrice: 22,
      monthlyPrice: 2700,
      capacity: 30,
      providerType: 'COMPANY'
    }
  ];

  constructor(private http: HttpClient) {}

  // Get all spaces
  getSpaces(filters?: FilterState): Observable<Space[]> {
    // En una implementación real, enviaríamos estos filtros a un backend
    let filteredSpaces = [...this.mockSpaces];
    
    if (filters) {
      if (filters.providerType) {
        filteredSpaces = filteredSpaces.filter(space => space.providerType === filters.providerType);
      }
      
      if (filters.capacity > 0) {
        filteredSpaces = filteredSpaces.filter(space => space.capacity >= filters.capacity);
      }
      
      if (filters.hourlyPrice > 0) {
        filteredSpaces = filteredSpaces.filter(space => space.hourlyPrice <= filters.hourlyPrice);
      }
      
      if (filters.monthlyPrice > 0) {
        filteredSpaces = filteredSpaces.filter(space => space.monthlyPrice <= filters.monthlyPrice);
      }
      
      if (filters.address) {
        filteredSpaces = filteredSpaces.filter(space => {
          if (typeof space.address === 'string') {
            return space.address.toLowerCase().includes(filters.address.toLowerCase());
          } else if (space.address && typeof space.address === 'object') {
            // Comprobar si address es un objeto AddressEntity y extraer la dirección formateada
            const addressObj = space.address as AddressEntity;
            const formattedAddress = `${addressObj.streetName} ${addressObj.streetNumber}`;
            return formattedAddress.toLowerCase().includes(filters.address.toLowerCase());
          }
          return false;
        });
      }
    }
    
    return of(filteredSpaces);
  }

  // Get space by ID
  getSpaceById(id: string): Observable<Space | undefined> {
    const space = this.mockSpaces.find(space => space.id === id);
    return of(space);
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
    const index = this.mockSpaces.findIndex(s => s.id === id);
    if (index !== -1) {
      this.mockSpaces[index] = { ...space };
    }
    return of(space);
  }

  // Delete space
  deleteSpace(id: string): Observable<void> {
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