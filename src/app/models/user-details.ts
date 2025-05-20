import { UserActivity } from "./user-activity";
import { UserRecentActivity } from "./user-recent-activity";

export interface UserDetails {
  clientsWithMostBookings: UserActivity[];
  clientsWithMostRentalContracts: UserActivity[]; 
  providersWithMostIncome: UserActivity[];
  recentUserActivity: UserRecentActivity[];

}

