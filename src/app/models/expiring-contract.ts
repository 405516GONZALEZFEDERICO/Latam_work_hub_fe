export interface ExpiringContract {
    contractId: number; // Asumiendo que estos campos vienen del backend, aunque estén vacíos en el ejemplo
    spaceId: number;
    spaceName: string;
    tenantId: number;
    tenantName: string;
    endDate: string; // El backend lo envía como string
}
