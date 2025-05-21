export interface UserRecentActivity {
  id: string;
  name: string;
  email?: string;
  action: string;
  date: Date | string;
  details?: string;
}
