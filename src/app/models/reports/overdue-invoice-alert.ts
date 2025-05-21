export interface OverdueInvoiceAlert {
  invoiceId: number;
  clientName: string;
  dueDate: string;
  daysOverdue: number;
  overdueAmount: number;
} 