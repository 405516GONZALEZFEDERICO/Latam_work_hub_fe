import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environment/environment';
import { SpaceType } from '../../models/space-type.model';
import { SpaceDto } from '../../models/space.model';

@Injectable({
  providedIn: 'root'
})
export class SpaceTypeService {
  private apiUrl = environment.apiUrl + '/space-types';


  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los tipos de espacios disponibles
   * @returns Observable con la lista de tipos de espacios
   */
  getAllSpaceTypes(): Observable<SpaceType[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all`).pipe(
      map((response): { id: number | null; name: string }[] => {
        console.log('Respuesta CRUDA del API /space-types/all:', JSON.stringify(response));
        
        if (!Array.isArray(response)) {
          console.error('La respuesta del API no es un array:', response);
          return [];
        }
        
        return response
          .filter(item => {
            // Filtrar el tipo "empresa" (ignorando mayúsculas/minúsculas y espacios)
            const name = item.name?.toLowerCase().trim();
            return name !== 'empresa' && name !== 'company';
          })
          .map(item => {
            const itemId = item.id;
            const processedId = itemId !== undefined && itemId !== null ? Number(itemId) : null;
            
            console.log(`Procesando tipo: ID original=${itemId}, ID procesado=${processedId}, Nombre=${item.name}`);
            
            return {
              id: processedId,
              name: item.name || 'Desconocido'
            };
          });
      }),
      map(processedTypes => processedTypes.filter(type => type.id !== null) as SpaceType[])
    );
  }


} 