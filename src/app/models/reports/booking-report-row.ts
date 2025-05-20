export interface BookingReportRow {
  bookingId: number;
  spaceName: string;
  clientName: string;
  providerName: string;
  startDate: string;
  endDate: string;
  durationHours: number;
  status: string;
  amount: number;
} 