import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environment/environment';
import { SpaceType } from '../../models/space-type.model';

@Injectable({
  providedIn: 'root'
})
export class SpaceTypeService {
  private apiUrl = environment.apiUrl + '/space-types';

  // Datos predefinidos para desarrollo en caso de fallo en la petición
  private defaultSpaceTypes: SpaceType[] = [
    { id: 1, name: 'Oficina' },
    { id: 2, name: 'Sala de Reuniones' },
    { id: 3, name: 'Espacio para Eventos' },
    { id: 4, name: 'Coworking' },
    { id: 5, name: 'Estudio' }
  ];

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los tipos de espacios disponibles
   * @returns Observable con la lista de tipos de espacios
   */
  getAllSpaceTypes(): Observable<SpaceType[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all`).pipe(
      map(response => {
        // Asegurar que cada objeto tiene la propiedad id y name
        return response.map(item => ({
          id: item.id || 0,
          name: item.name || 'Desconocido'
        }));
      }),
      catchError(error => {
        console.error('Error fetching space types:', error);
        return of(this.defaultSpaceTypes);
      })
    );
  }
} 