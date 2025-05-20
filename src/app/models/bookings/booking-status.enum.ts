/**
 * Estados posibles para una reserva
 */
export enum BookingStatus {
  /**
   * Reserva creada pero pendiente de pago
   */
  PENDING_PAYMENT = 'PENDING_PAYMENT',

  /**
   * Reserva pagada pero aún no ha llegado la fecha de inicio
   */
  CONFIRMED = 'CONFIRMED',

  /**
   * Reserva activa (fecha actual está dentro del período de reserva)
   */
  ACTIVE = 'ACTIVE',

  /**
   * Reserva finalizada (fecha de finalización ha pasado)
   */
  COMPLETED = 'COMPLETED',

  /**
   * Reserva cancelada
   */
  CANCELED = 'CANCELED'
}

/**
 * Traducciones de los estados de reserva
 */
export const BookingStatusTranslations: Record<BookingStatus, string> = {
  [BookingStatus.PENDING_PAYMENT]: 'Pendiente de Pago',
  [BookingStatus.CONFIRMED]: 'Confirmada',
  [BookingStatus.ACTIVE]: 'Activa',
  [BookingStatus.COMPLETED]: 'Completada',
  [BookingStatus.CANCELED]: 'Cancelada'
}; 