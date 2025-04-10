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
    permissions?: string[];  // Agregamos el campo para los permisos
  }

export interface AuthResponseGoogleDto {
        idToken: string;
        refreshToken: string;
        expiresIn: string;
        email: string;
        localId: string;
        role: string;
        permissions?: string[];
        googleAuth: boolean;
}