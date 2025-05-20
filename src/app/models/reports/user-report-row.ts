export interface UserReportRow {
  userId: number;
  name: string;
  email: string;
  role: string;
  status: string; // Activo/Inactivo
  registrationDate: string;
  lastLoginDate: string;
  
  // Estadísticas para proveedores
  totalSpaces?: number;
  activeContracts?: number;
  totalRevenue?: number;
  
  // Estadísticas para clientes
  totalBookings?: number;
  totalSpending?: number;
} 