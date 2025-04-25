import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SearchSpace, FilterState } from '../../models/search-space.model';
import { environment } from '../../../environment/environment';
import { map } from 'rxjs/operators';

export interface PagedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SearchSpaceService {
  private apiUrl = `${environment.apiUrl}/spaces`;

  constructor(private http: HttpClient) {}

  getSpaces(filters?: FilterState, page: number = 0, size: number = 10): Observable<PagedResponse<SearchSpace>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (filters) {
      if (filters.pricePerHour !== null) {
        params = params.set('pricePerHour', filters.pricePerHour.toString());
      }
      
      if (filters.pricePerDay !== null) {
        params = params.set('pricePerDay', filters.pricePerDay.toString());
      }
      
      if (filters.pricePerMonth !== null) {
        params = params.set('pricePerMonth', filters.pricePerMonth.toString());
      }
      
      if (filters.area !== null) {
        params = params.set('area', filters.area.toString());
      }
      
      if (filters.capacity !== null) {
        params = params.set('capacity', filters.capacity.toString());
      }
      
      if (filters.spaceTypeId !== null) {
        params = params.set('spaceTypeId', filters.spaceTypeId.toString());
      }
      
      if (filters.cityId !== null) {
        params = params.set('cityId', filters.cityId.toString());
      }
      
      if (filters.countryId !== null) {
        params = params.set('countryId', filters.countryId.toString());
      }
      
      if (filters.amenityIds !== null && filters.amenityIds.length > 0) {
        // Para manejar lista de amenidades
        filters.amenityIds.forEach(id => {
          params = params.append('amenityIds', id.toString());
        });
      }
    }
    
    return this.http.get<PagedResponse<any>>(`${this.apiUrl}/search`, { params }).pipe(
      map(response => {
        // Mapear los contenidos de la página y mantener la información de paginación
        const mappedContent = response.content.map(space => this.mapSpaceResponseToSearchSpace(space));
        
        return {
          ...response,
          content: mappedContent
        };
      })
    );
  }

  getSpaceById(id: string): Observable<SearchSpace> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => this.mapSpaceResponseToSearchSpace(response))
    );
  }

  private mapSpaceResponseToSearchSpace(spaceResponse: any): SearchSpace {
    // Extrae la primera foto para usarla como principal, o usa una por defecto
    const imageUrl = spaceResponse.photoUrl && spaceResponse.photoUrl.length > 0 
      ? spaceResponse.photoUrl[0] 
      : 'assets/images/spaces/default.jpg';

    // Formatear el objeto address para mostrarlo como texto
    const address = spaceResponse.address ? 
      `${spaceResponse.address.streetName} ${spaceResponse.address.streetNumber}, ${spaceResponse.address.postalCode}` : 
      'Dirección no disponible';

    return {
      id: spaceResponse.id.toString(),
      title: spaceResponse.name,
      imageUrl: imageUrl,
      address: address,
      hourlyPrice: spaceResponse.pricePerHour,
      monthlyPrice: spaceResponse.pricePerMonth,
      capacity: spaceResponse.capacity,
      providerType: 'COMPANY' // Por defecto, si no viene en la respuesta
    };
  }
} 