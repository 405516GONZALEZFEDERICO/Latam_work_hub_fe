import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, delay } from 'rxjs/operators';
import { UserRole } from '../../models/user';
import { environment } from '../../../environment/environment';

export interface ProfileData {
  displayName?: string;
  fullName?: string;
  email: string;
  photoUrl?: string;
  birthDate?: Date;
  documentType?: string;
  documentNumber?: string;
  jobTitle?: string;
  department?: string;
  role: UserRole;
  profileCompletion: number;
  companyData?: CompanyData;
  providerType?: 'INDIVIDUAL' | 'COMPANY';
}

export interface CompanyData {
  name: string;
  legalName: string;
  taxId: string;
  phone: string;
  email: string;
  website?: string;
  description?: string;
  contactPerson?: string;
  country?: any;
  operatingCountries?: string[];
  logo?: string;
  address?: string; // Mantener por compatibilidad con código existente
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = `${environment.apiUrl}/profile`;

  constructor(private http: HttpClient) { 
    console.log('ProfileService initialized');
  }

  // Obtener todos los datos del perfil, incluyendo datos de empresa si existen
  getProfileData(): Observable<ProfileData> {
    // Solo para desarrollo, usar datos mock
    console.log('Getting profile data');
    return of({
      displayName: 'Usuario de Prueba',
      fullName: 'Usuario de Prueba',
      email: 'usuario@example.com',
      role: 'PROVIDER' as UserRole,
      profileCompletion: 30,
      providerType: undefined
    }).pipe(delay(300));
  }

  // Guardar los datos personales del perfil
  savePersonalData(profileData: Partial<ProfileData>): Observable<ProfileData> {
    console.log('Guardando datos personales:', profileData);
    // Simulamos una respuesta exitosa para desarrollo
    return of({
      ...profileData,
      profileCompletion: this.calculateProfileCompletion(profileData),
    } as ProfileData).pipe(delay(500));
  }

  // Guardar los datos de la empresa
  saveCompanyData(companyData: CompanyData): Observable<boolean> {
    console.log('Guardando datos de empresa:', companyData);
    // Simulamos éxito
    return of(true).pipe(delay(500));
  }

  // Actualizar el tipo de proveedor
  updateProviderType(type: 'INDIVIDUAL' | 'COMPANY'): Observable<boolean> {
    console.log('Actualizando tipo de proveedor a:', type);
    // Simulamos éxito
    return of(true).pipe(delay(500));
  }

  // Subir imagen de perfil
  uploadProfileImage(file: File): Observable<string> {
    console.log('Subiendo imagen de perfil:', file.name);
    // Simulando una URL para la imagen subida
    return of(`https://example.com/images/${file.name}`).pipe(
      delay(1000)
    );
  }

  // Subir logo de empresa
  uploadCompanyLogo(file: File): Observable<string> {
    console.log('Subiendo logo de empresa:', file.name);
    // Simulando una URL para el logo subido
    return of(`https://example.com/logos/${file.name}`).pipe(
      delay(1000)
    );
  }

  // Calcular el porcentaje de completado del perfil
  private calculateProfileCompletion(profile: Partial<ProfileData>): number {
    const fields = ['fullName', 'email', 'photoUrl', 'birthDate', 'documentType', 'documentNumber'];
    const completedFields = fields.filter(field => !!profile[field as keyof Partial<ProfileData>]);
    
    return Math.min(100, Math.round((completedFields.length / fields.length) * 100));
  }
} 