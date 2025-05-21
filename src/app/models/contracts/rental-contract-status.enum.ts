/**
 * Estados posibles para un contrato de alquiler
 */
export enum RentalContractStatus {
  /**
   * Borrador inicial
   */
  DRAFT = 'DRAFT',
  
  /**
   * Pendiente (contrato creado pero pago inicial no realizado)
   */
  PENDING = 'PENDING',
  
  /**
   * Confirmado
   */
  CONFIRMED = 'CONFIRMED',

  /**
   * Contrato activo
   */
  ACTIVE = 'ACTIVE',

  /**
   * Contrato terminado anticipadamente
   */
  TERMINATED = 'TERMINATED',

  /**
   * Contrato expirado (fecha fin ha pasado)
   */
  EXPIRED = 'EXPIRED',
  
  /**
   * Contrato cancelado (antes de estar activo)
   */
  CANCELLED = 'CANCELLED',
  
  /**
   * Contrato en proceso de renovación
   */
  RENEWAL = 'RENEWAL'
}

/**
 * Traducciones de los estados de contrato
 */
export const RentalContractStatusTranslations: Record<RentalContractStatus, string> = {
  [RentalContractStatus.DRAFT]: 'Borrador',
  [RentalContractStatus.PENDING]: 'Pendiente',
  [RentalContractStatus.CONFIRMED]: 'Confirmado',
  [RentalContractStatus.ACTIVE]: 'Activo',
  [RentalContractStatus.TERMINATED]: 'Terminado',
  [RentalContractStatus.EXPIRED]: 'Expirado',
  [RentalContractStatus.CANCELLED]: 'Cancelado',
  [RentalContractStatus.RENEWAL]: 'En renovación'
}; 