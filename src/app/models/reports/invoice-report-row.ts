export interface InvoiceReportRow {
  invoiceId: number;
  clientName: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
} 