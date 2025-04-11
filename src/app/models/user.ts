export interface User {
    uid?: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    emailVerified?: boolean;
    createdAt?: Date;
    lastLoginAt?: Date;
    idToken?: string;
    refreshToken?: string;
    role?: string;           // Agregamos el campo para el rol
    expiresIn?: string;     // Agregamos el campo para la expiración del token
}

export interface AuthResponseGoogleDto {
  idToken: string;
  email: string;
  localId: string;
  role: string;
  name: string;
  photoUrl: string;
  refreshToken: string;
  expiresIn: string;
}

export interface IRoute {
  requiredRole: string;
}