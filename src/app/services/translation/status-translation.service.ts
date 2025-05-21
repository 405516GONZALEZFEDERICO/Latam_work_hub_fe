import { Injectable } from '@angular/core';
import { 
  BookingStatus, 
  BookingStatusTranslations, 
  InvoiceStatus, 
  InvoiceStatusTranslations, 
  RentalContractStatus, 
  RentalContractStatusTranslations,
  SpaceStatus,
  SpaceStatusTranslations
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class StatusTranslationService {
  
  constructor() { }
  
  /**
   * Traduce cualquier estado de entidad al español
   * @param status El código de estado en inglés 
   * @returns La traducción al español
   */
  translateStatus(status: string): string {
    // Intentar traducir como estado de reserva
    if (Object.values(BookingStatus).includes(status as BookingStatus)) {
      return BookingStatusTranslations[status as BookingStatus];
    }
    
    // Intentar traducir como estado de factura
    if (Object.values(InvoiceStatus).includes(status as InvoiceStatus)) {
      return InvoiceStatusTranslations[status as InvoiceStatus];
    }
    
    // Intentar traducir como estado de contrato
    if (Object.values(RentalContractStatus).includes(status as RentalContractStatus)) {
      return RentalContractStatusTranslations[status as RentalContractStatus];
    }
    
    // Intentar traducir como estado de espacio
    if (Object.values(SpaceStatus).includes(status as SpaceStatus)) {
      return SpaceStatusTranslations[status as SpaceStatus];
    }
    
    // Si no se encuentra traducción, devolver el estado original
    return status;
  }
} 