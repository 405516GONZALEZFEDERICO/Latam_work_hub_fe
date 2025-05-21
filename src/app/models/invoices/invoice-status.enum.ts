/**
 * Estados posibles para una factura
 */
export enum InvoiceStatus {
  /**
   * Borrador
   */
  DRAFT = 'DRAFT',

  /**
   * Emitida
   */
  ISSUED = 'ISSUED',

  /**
   * Pagada
   */
  PAID = 'PAID',

  /**
   * Cancelada
   */
  CANCELLED = 'CANCELLED'
}

/**
 * Traducciones de los estados de factura
 */
export const InvoiceStatusTranslations: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: 'Borrador',
  [InvoiceStatus.ISSUED]: 'Emitida',
  [InvoiceStatus.PAID]: 'Pagada',
  [InvoiceStatus.CANCELLED]: 'Cancelada'
}; 