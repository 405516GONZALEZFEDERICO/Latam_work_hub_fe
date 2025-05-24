// Unified Role Type
export type UserRole = 'DEFAULT' | 'PROVEEDOR' | 'CLIENTE' | 'ADMIN';

// GOOGLE LOGIN
export interface User {
  uid: string;
  email: string;
  emailVerified: boolean;
  idToken: string;
  refreshToken: string;
  expiresIn?: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  numericId?: number;
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
}

// Authentication Response from Google
export interface AuthResponseGoogleDto {
  localId: string;      // Firebase UID
  email: string;
  idToken: string;
  refreshToken: string;
  role: UserRole;
  name: string;         // Maps to displayName
  photoUrl: string;     // Maps to photoURL
  expiresIn: string;
}

// User Profile for additional details
export interface Profile {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  skills?: string[];
  experience?: string;
  companyName?: string;
  position?: string;
}

// Role Request DTO
export interface RolRequestDto {
  uid: string;
  nuevoRol: UserRole;
}

// Role Change DTO for admin operations
export interface RoleChangeDto {
  uid: string;
  roleName: UserRole;
}

// Route interface for role-based routing
export interface IRoute {
  requiredRole: string;
}
export interface TokenDto {
  token: string;
  refreshToken: string;
  expiresIn: string;
  role: string;
}