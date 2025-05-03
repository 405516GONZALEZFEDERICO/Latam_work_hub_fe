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
        console.log('Respuesta CRUDA del API /space-types/all:', JSON.stringify(response)); // Log de la respuesta cruda
        
        // Asegurar que cada objeto tiene la propiedad id y name
        if (!Array.isArray(response)) {
          console.error('La respuesta del API no es un array:', response);
          return []; // Devolver array vacío si la respuesta no es válida
        }
        
        return response.map(item => {
          const itemId = item.id; // Guardar el id original
          const processedId = itemId !== undefined && itemId !== null ? Number(itemId) : null; // Convertir a número o dejar como null si no existe
          
          // Log para cada item procesado
          console.log(`Procesando tipo: ID original=${itemId}, ID procesado=${processedId}, Nombre=${item.name}`); 
          
          return {
            id: processedId, // Usar el ID procesado (puede ser null)
            name: item.name || 'Desconocido'
          };
        });
      }),
      map(processedTypes => processedTypes.filter(type => type.id !== null) as SpaceType[])
    );
  }


} 