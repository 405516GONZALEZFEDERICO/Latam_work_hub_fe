/**
 * Estados posibles para un espacio
 */
export enum SpaceStatus {
  /**
   * Disponible (activo, disponible y no eliminado)
   */
  DISPONIBLE = 'Disponible',

  /**
   * Ocupado (activo, no disponible y no eliminado)
   */
  OCUPADO = 'Ocupado',

  /**
   * Inactivo (no activo)
   */
  INACTIVO = 'Inactivo'
}

/**
 * Traducciones de los estados de espacio
 */
export const SpaceStatusTranslations: Record<SpaceStatus, string> = {
  [SpaceStatus.DISPONIBLE]: 'Disponible',
  [SpaceStatus.OCUPADO]: 'Ocupado',
  [SpaceStatus.INACTIVO]: 'Inactivo'
}; 