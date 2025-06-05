import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Space, SpaceDto, SpaceCreationDto, AmenityDto, FilterState, AddressEntity } from '../../models/space.model';
import { environment } from '../../../environment/environment';
import { AdminSpace } from '../../models/admin.model';
import { AuthService } from '../auth-service/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SpaceService {
  private apiUrl=environment.apiUrl + '/spaces';


  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}


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
  createSpace(spaceDto: SpaceCreationDto, images: File[]): Observable<boolean> {
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
    spaceToSend.pricePerHour = Number(spaceToSend.pricePerHour || 0);
    spaceToSend.pricePerDay = Number(spaceToSend.pricePerDay || 0);
    spaceToSend.pricePerMonth = Number(spaceToSend.pricePerMonth || 0);
    
    // Asegurar que type sea un objeto con id
    if (spaceToSend.type && typeof spaceToSend.type !== 'object') {
      spaceToSend.type = { id: Number(spaceToSend.type) };
    } else if (spaceToSend.type && spaceToSend.type.id) {
      spaceToSend.type.id = Number(spaceToSend.type.id);
    }
    
    // Convertir amenities.price a número
    if (spaceToSend.amenities && spaceToSend.amenities.length) {
      spaceToSend.amenities = spaceToSend.amenities.map((amenity: any) => ({
        name: amenity.name,
        price: Number(amenity.price || 0)
      }));
    }
    
    console.log('Enviando al servidor:', JSON.stringify(spaceToSend, null, 2));

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
        console.error('Detalles del error:', error.error);
        return throwError(() => new Error('Error al crear el espacio'));
      })
    );
  }

  updateSpace(spaceId: string, spaceDto: SpaceCreationDto, images: File[]): Observable<any> {
    const url = `${this.apiUrl}/${spaceId}`;
    
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
    spaceToSend.pricePerHour = Number(spaceToSend.pricePerHour || 0);
    spaceToSend.pricePerDay = Number(spaceToSend.pricePerDay || 0);
    spaceToSend.pricePerMonth = Number(spaceToSend.pricePerMonth || 0);
    
    // Asegurar que type sea un objeto con id
    if (spaceToSend.type && typeof spaceToSend.type !== 'object') {
      spaceToSend.type = { id: Number(spaceToSend.type) };
    } else if (spaceToSend.type && spaceToSend.type.id) {
      spaceToSend.type.id = Number(spaceToSend.type.id);
    }
    
    // Convertir amenities.price a número
    if (spaceToSend.amenities && spaceToSend.amenities.length) {
      spaceToSend.amenities = spaceToSend.amenities.map((amenity: any) => ({
        name: amenity.name,
        price: Number(amenity.price || 0)
      }));
    }
    
    console.log('Enviando al servidor (update):', JSON.stringify(spaceToSend, null, 2));
    
    // Create a FormData object to send both the space data and images
    const formData = new FormData();
    
    // Add the space data as JSON
    formData.append('space', new Blob([JSON.stringify(spaceToSend)], {
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
        
        console.error('Detalles del error:', error.error);
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

  // Método para obtener todos los espacios para el administrador
  getAllSpacesForAdmin(): Observable<AdminSpace[]> {
    console.log('Llamando a getAllSpacesForAdmin - URL:', `${this.apiUrl}/spaces-list`);
    return this.http.get<any[]>(`${this.apiUrl}/spaces-list`)
      .pipe(
        tap(response => console.log('Respuesta API espacios:', response)),
        map(spaces => {
          if (!spaces || spaces.length === 0) {
            console.warn('No se recibieron espacios desde la API');
            return [];
          }
          
          console.log('Mapeando', spaces.length, 'espacios');
          return spaces.map(space => {
            // Verificar propiedades clave
            if (!space) {
              console.warn('Encontrado un espacio nulo o undefined');
              return null;
            }
            
            return {
              id: space.id,
              name: space.name || 'Sin nombre',
              description: space.description || '',
              pricePerHour: space.pricePerHour || 0,
              pricePerDay: space.pricePerDay || 0,
              pricePerMonth: space.pricePerMonth || 0,
              capacity: space.capacity || 0,
              area: space.area || 0,
              active: space.active || false,
              available: space.available || false,
              address: space.address || { city: 'N/A', country: 'N/A' },
              spaceType: space.spaceType || 'Sin tipo',
              photoUrl: space.photoUrl || [],
              amenities: space.amenities || []
            } as AdminSpace;
          }).filter(space => space !== null);
        })
      );
  }

  // Método para activar/desactivar un espacio
  toggleSpaceStatus(spaceId: number | string, activate: boolean): Observable<boolean> {
    const endpoint = activate ? 'activate' : 'deactivate';
    // Convertir a número si es posible
    const id = typeof spaceId === 'string' ? parseInt(spaceId, 10) : spaceId;
    
    // Obtener el UID del usuario que está realizando la acción
    const userUid = this.getCurrentUserUid();
    
    console.log(`Enviando solicitud para ${activate ? 'activar' : 'desactivar'} espacio ${id}`);
    
    return this.http.patch<boolean>(`${this.apiUrl}/${id}/${endpoint}`, {}, {
      params: { userUid }
    }).pipe(
      tap(response => console.log(`Respuesta al ${activate ? 'activar' : 'desactivar'} espacio:`, response)),
      catchError(error => {
        console.error(`Error al ${activate ? 'activar' : 'desactivar'} espacio:`, error);
        return throwError(() => new Error(`Error al ${activate ? 'activar' : 'desactivar'} el espacio: ${error.message || 'Error desconocido'}`));
      })
    );
  }

  // Método para obtener el UID del usuario actual
  private getCurrentUserUid(): string {
    // Primero intentar obtener el usuario del servicio de autenticación
    const currentUser = this.authService.getCurrentUserSync();
    
    if (currentUser && currentUser.uid) {
      return currentUser.uid;
    }
    
    // Como respaldo, intentar obtenerlo desde localStorage
    const localStorageUser = localStorage.getItem('currentUserData');
    if (localStorageUser) {
      try {
        const userData = JSON.parse(localStorageUser);
        if (userData && userData.uid) {
          return userData.uid;
        }
      } catch (e) {
        console.error('Error al obtener uid desde localStorage:', e);
      }
    }
    
    // Si todo falla, usar el valor antiguo como último recurso
    return localStorage.getItem('uid') || '';
  }
}