export interface OverdueInvoice {
    invoiceId: number; // Asumiendo que estos campos vienen del backend
    invoiceNumber: string;
    relatedEntityId: number;
    relatedEntityType: string;
    amount: number;
    dueDate: string; // El backend lo envía como string
    userId: number;
    userName: string;
}
