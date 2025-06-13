import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpaceTypeTranslationService {

  private spaceTypeTranslations: { [key: string]: string } = {
    'CONTRACT': 'Contrato',
    'OFFICE': 'Oficina',
    'MEETING_ROOM': 'Sala de Reuniones',
    'CONFERENCE_ROOM': 'Sala de Conferencias',
    'COWORKING': 'Coworking',
    'PRIVATE_OFFICE': 'Oficina Privada',
    'SHARED_OFFICE': 'Oficina Compartida',
    'AUDITORIUM': 'Auditorio',
    'CLASSROOM': 'Aula',
    'WORKSHOP': 'Taller',
    'EVENT_SPACE': 'Espacio para Eventos',
    'STUDIO': 'Estudio',
    'BOARDROOM': 'Sala de Juntas',
    'TRAINING_ROOM': 'Sala de Capacitación',
    'PHONE_BOOTH': 'Cabina Telefónica',
    'HOT_DESK': 'Escritorio Compartido',
    'DEDICATED_DESK': 'Escritorio Dedicado',
    'WAREHOUSE': 'Almacén',
    'RETAIL': 'Local Comercial',
    'RESTAURANT': 'Restaurante',
    'CAFE': 'Café',
    'BAR': 'Bar',
    'HOTEL': 'Hotel',
    'APARTMENT': 'Apartamento',
    'HOUSE': 'Casa',
    'VILLA': 'Villa'
  };

  constructor() { }

  /**
   * Traduce un tipo de espacio del inglés al español
   * @param spaceType El tipo de espacio en inglés
   * @returns El tipo de espacio traducido al español
   */
  translateSpaceType(spaceType: string): string {
    if (!spaceType) return 'No especificado';
    
    // Verificar si existe una traducción específica
    const upperName = spaceType.toUpperCase();
    if (this.spaceTypeTranslations[upperName]) {
      return this.spaceTypeTranslations[upperName];
    }
    
    // Si contiene espacios, capitalizar la primera letra de cada palabra
    if (spaceType.includes(' ')) {
      return spaceType.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    // Para camelCase, insertar espacios antes de cada letra mayúscula y capitalizar
    const formatted = spaceType.replace(/([A-Z])/g, ' $1').trim();
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  /**
   * Agrega una nueva traducción de tipo de espacio
   * @param englishType El tipo en inglés
   * @param spanishType El tipo en español
   */
  addTranslation(englishType: string, spanishType: string): void {
    this.spaceTypeTranslations[englishType.toUpperCase()] = spanishType;
  }

  /**
   * Obtiene todas las traducciones disponibles
   * @returns Un objeto con todas las traducciones
   */
  getAllTranslations(): { [key: string]: string } {
    return { ...this.spaceTypeTranslations };
  }
} 