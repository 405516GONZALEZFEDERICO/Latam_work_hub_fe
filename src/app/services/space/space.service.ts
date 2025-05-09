import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Space, SpaceDto, AmenityDto, FilterState, AddressEntity } from '../../models/space.model';

@Injectable({
  providedIn: 'root'
})
export class SpaceService {
  private apiUrl = 'http://localhost:8080/api/spaces'; 

  //

  constructor(private http: HttpClient) {}

  // // Get all spaces
  // getSpaces(filters?: FilterState): Observable<Space[]> {
  //   // En una implementación real, enviaríamos estos filtros a un backend
    
  //   if (filters) {
  //     if (filters.providerType) {
  //       filteredSpaces = filteredSpaces.filter(space => space.providerType === filters.providerType);
  //     }
      
  //     if (filters.capacity > 0) {
  //       filteredSpaces = filteredSpaces.filter(space => space.capacity >= filters.capacity);
  //     }
      
  //     if (filters.hourlyPrice > 0) {
  //       filteredSpaces = filteredSpaces.filter(space => space.hourlyPrice <= filters.hourlyPrice);
  //     }
      
  //     if (filters.monthlyPrice > 0) {
  //       filteredSpaces = filteredSpaces.filter(space => space.monthlyPrice <= filters.monthlyPrice);
  //     }
      
  //     if (filters.address) {
  //       filteredSpaces = filteredSpaces.filter(space => {
  //         if (typeof space.address === 'string') {
  //           return space.address.toLowerCase().includes(filters.address.toLowerCase());
  //         } else if (space.address && typeof space.address === 'object') {
  //           // Comprobar si address es un objeto AddressEntity y extraer la dirección formateada
  //           const addressObj = space.address as AddressEntity;
  //           const formattedAddress = `${addressObj.streetName} ${addressObj.streetNumber}`;
  //           return formattedAddress.toLowerCase().includes(filters.address.toLowerCase());
  //         }
  //         return false;
  //       });
  //     }
  //   }
    
  //   return of(filteredSpaces);
  // }

  // Get space by ID
  getSpaceById(id: string): Observable<Space | undefined> {
    
    return this.http.get<any>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(response => console.log('Respuesta del API:', response)),
        map(response => {
          const mappedSpace = this.mapResponseToSpace(response);
          return mappedSpace;
        }),
        catchError(error => {
          console.error('Error en getSpaceById:', error);
          return throwError(() => error);
        })
      );
  }

  // Método privado para mapear la respuesta del API al modelo Space
  private mapResponseToSpace(response: any): Space | undefined {
    
    if (!response) return undefined;
    
    // Procesamiento del tipo de espacio
    let processedSpaceType: any;
    let spaceTypeName = '';
    
    // Determinar el tipo de espacio basado en múltiples propiedades posibles
    if (response.spaceType) {
      if (typeof response.spaceType === 'string') {
        spaceTypeName = response.spaceType;
        processedSpaceType = { name: response.spaceType };
      } else if (typeof response.spaceType === 'object') {
        spaceTypeName = response.spaceType.name || '';
        processedSpaceType = { ...response.spaceType };
      }
    } else if (response.type) {
      if (typeof response.type === 'string') {
        spaceTypeName = response.type;
        processedSpaceType = { name: response.type };
      } else if (typeof response.type === 'object') {
        spaceTypeName = response.type.name || '';
        processedSpaceType = { ...response.type };
      }
    }
    
    // Mapeo detallado con logs para depuración
    const mappedSpace = {
      id: response.id?.toString() || '',
      title: response.name || response.title || '',
      name: response.name || '',
      description: response.description || '',
      imageUrl: response.mainImage || response.images?.[0] || '',
      additionalImages: response.images || [],
      photoUrl: response.photoUrl || [],
      address: response.address || '',
      hourlyPrice: response.pricePerHour || 0,
      monthlyPrice: response.pricePerMonth || 0,
      capacity: response.capacity || 0,
      providerType: response.providerType || 'COMPANY',
      // Asegurar que amenities siempre sea un array, incluso si viene null del backend
      amenities: Array.isArray(response.amenities) ? response.amenities : [],
      // Usar el tipo procesado o el nombre como fallback
      type: spaceTypeName,
      spaceType: processedSpaceType || { name: spaceTypeName },
      typeObj: processedSpaceType || { name: spaceTypeName },
      area: response.area || 0,
      priceHour: response.pricePerHour || 0,
      priceDay: response.pricePerDay || 0,
      priceMonth: response.pricePerMonth || 0,
      pricePerHour: response.pricePerHour || 0,
      pricePerDay: response.pricePerDay || 0,
      pricePerMonth: response.pricePerMonth || 0
    };

   
    return mappedSpace;
  }

  // Create new space
  createSpace(spaceDto: SpaceDto, images: File[]): Observable<boolean> {
    // Deep clone el objeto para trabajar con una copia
    const spaceToSend = JSON.parse(JSON.stringify(spaceDto));
    
    // Asegurar que cityId y countryId sean números
    if (spaceToSend.cityId) {
      spaceToSend.cityId = Number(spaceToSend.cityId);
    }
    
    if (spaceToSend.countryId) {
      spaceToSend.countryId = Number(spaceToSend.countryId);
    }
    
    // Convertir precios a números (por si acaso)
    spaceToSend.pricePerHour = Number(spaceToSend.pricePerHour);
    spaceToSend.pricePerDay = Number(spaceToSend.pricePerDay);
    spaceToSend.pricePerMonth = Number(spaceToSend.pricePerMonth);
    
    // Convertir amenities.price a número
    if (spaceToSend.amenities && spaceToSend.amenities.length) {
      spaceToSend.amenities = spaceToSend.amenities.map((amenity: any) => ({
        ...amenity,
        price: Number(amenity.price)
      }));
    }
    


    const formData = new FormData();

    // Añadir el DTO al FormData como un JSON
    formData.append('space', new Blob([JSON.stringify(spaceToSend)], {
      type: 'application/json'
    }));
    
    // Añadir imágenes
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

  updateSpace(spaceId: string, spaceDto: SpaceDto, images: File[]): Observable<any> {
    const url = `${this.apiUrl}/${spaceId}`;
    
    // Create a FormData object to send both the space data and images
    const formData = new FormData();
    
    // Add the space data as JSON
    formData.append('space', new Blob([JSON.stringify(spaceDto)], {
      type: 'application/json'
    }));
    
    // Add each image file if provided
    if (images && images.length > 0) {
      images.forEach((file, index) => {
        if (file) {
          formData.append('images', file, file.name);
        }
      });
    }
    
    return this.http.put<any>(url, formData).pipe(
      tap(response => console.log('Respuesta de actualización:', response)),
      catchError(error => {
        let errorMsg = 'Error al actualizar el espacio';
        if (error.error && error.error.message) {
          errorMsg = error.error.message;
        } else if (error.message) {
          errorMsg = error.message;
        }
        
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  deleteSpace(spaceId: string, userUid: string): Observable<boolean> {
    const url = `${this.apiUrl}/${spaceId}`;
    
    // Send userUid as a query parameter, body can be null or empty for this operation
    const options = { params: new HttpParams().set('userUid', userUid) };
    
    return this.http.patch<boolean>(url, null, options).pipe(
        tap((response) => console.log('Respuesta de eliminación:', response)),
        catchError(error => {
            console.error('Error al eliminar el espacio:', error);
            return throwError(() => new Error('Error al eliminar el espacio'));
        })
    );
  }
}