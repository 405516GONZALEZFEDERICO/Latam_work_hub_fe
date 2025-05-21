export interface SpaceMetric {
  id: string;
  name: string;
  bookings: number;
  occupationRate?: number; // percentage
  revenue?: number;
}
