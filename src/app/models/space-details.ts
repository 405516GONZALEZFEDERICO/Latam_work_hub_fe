import { SpaceMetric } from "./space-metric";

export interface SpaceDetails {
    mostRentedSpaces: SpaceMetric[];
    lowOccupationSpaces: SpaceMetric[];
    averageBookingDurationHours: number;
}
