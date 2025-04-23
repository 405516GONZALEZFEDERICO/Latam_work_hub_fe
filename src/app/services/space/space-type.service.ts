import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environment/environment';
import { SpaceType } from '../../models/space-type.model';

@Injectable({
  providedIn: 'root'
})
export class SpaceTypeService {
  private apiUrl = environment.apiUrl + '/space-types';

  // Datos predefinidos para desarrollo en caso de fallo en la petición
  private defaultSpaceTypes: SpaceType[] = [
    { name: 'office' },
    { name: 'meetingRoom' },
    { name: 'eventSpace' },
    { name: 'coworking' },
    { name: 'studio' }
  ];

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los tipos de espacios disponibles
   * @returns Observable con la lista de tipos de espacios
   */
  getAllSpaceTypes(): Observable<SpaceType[]> {
    return this.http.get<SpaceType[]>(`${this.apiUrl}/all`).pipe(
      catchError(error => {
        console.error('Error fetching space types:', error);
        return of(this.defaultSpaceTypes);
      })
    );
  }
} 