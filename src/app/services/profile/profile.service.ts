import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError, from } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { UserRole } from '../../models/user';
import { environment } from '../../../environment/environment';
import { Address } from '../../models/address.model';
import { ProfileData, CompanyData } from '../../models/profile';
import { PersonalDataUserDto } from '../../models/personal-data-user-dto';
import { AuthService } from '../auth-service/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = `${environment.apiUrl}`;
  private _currentProfile: ProfileData | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { 
    console.log('ProfileService initialized');
  }

  // Obtener los datos del perfil
  getProfileData(): Observable<ProfileData> {
    console.log('Obteniendo datos del perfil');
    
    // Si ya tenemos los datos del perfil en caché, los devolvemos
    if (this._currentProfile) {
      return of(this._currentProfile);
    }
    
    return from(this.authService.getIdToken()).pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => new Error('No se pudo obtener el token de autenticación'));
        }
        
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        
        // Aquí deberías usar el endpoint real para obtener los datos del perfil
        return this.http.get<ProfileData>(
          `${this.apiUrl}/users/profile`, 
          { headers }
        ).pipe(
          map(profile => {
            this._currentProfile = profile;
            return profile;
          }),
          catchError(error => {
            console.error('Error al obtener datos del perfil:', error);
            
            // Si hay un error, devolver un perfil con datos mínimos
            const defaultProfile: ProfileData = {
              email: this.authService.getCurrentUserSync()?.email || '',
              role: this.authService.getUserRole() || 'DEFAULT' as UserRole
            };
            
            return of(defaultProfile);
          })
        );
      })
    );
  }

  // Guardar los datos personales - Llamada directa al endpoint
  savePersonalData(profileData: any): Observable<any> {
    console.log('ProfileService: savePersonalData called with:', profileData);
    
    // Crear el objeto DTO para enviar a la API
    const personalDataUserDto = {
        name: profileData.fullName,
        email: profileData.email,
        birthDate: profileData.birthDate,
        documentType: profileData.documentType,
        documentNumber: profileData.documentNumber,
        jobTitle: profileData.jobTitle,
        department: profileData.department,
    };
    
    console.log('ProfileService: Created DTO:', personalDataUserDto);
    
    // Get the current token directly
    return from(this.authService.getIdToken()).pipe(
        switchMap(token => {
            console.log('ProfileService: Using existing token for API call');
            
            if (!token) {
                console.error('ProfileService: No token available');
                return throwError(() => new Error('No se pudo obtener el token de autenticación'));
            }
   
            
            console.log('ProfileService: Making API call to', `${this.apiUrl}/users/personal-data`);
            
            // Llamada directa a la API
            return this.http.post<any>(
                `${this.apiUrl}/users/personal-data`, 
                personalDataUserDto
            ).pipe(
                catchError(error => {
                    console.error('ProfileService: API error response:', error);
                    return throwError(() => new Error(`Error al guardar los datos personales: ${error.message}`));
                })
            );
        })
    );
  }

  // Guardar los datos de la empresa
  saveCompanyData(companyData: CompanyData): Observable<any> {
    console.log('Guardando datos de empresa:', companyData);
    
    return from(this.authService.getIdToken()).pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => new Error('No se pudo obtener el token de autenticación'));
        }
        
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        
        // Aquí deberías usar el endpoint real para guardar datos de la empresa
        return this.http.post<any>(
          `${this.apiUrl}/api/companies`, 
          companyData,
          { headers }
        ).pipe(
          catchError(error => {
            console.error('Error al guardar datos de la empresa:', error);
            return throwError(() => new Error('Error al guardar los datos de la empresa'));
          })
        );
      })
    );
  }

  // Guardar la dirección
  saveAddress(address: Address): Observable<any> {
    console.log('Guardando dirección:', address);
    
    return from(this.authService.getIdToken()).pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => new Error('No se pudo obtener el token de autenticación'));
        }
        
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        
        // Aquí deberías usar el endpoint real para guardar la dirección
        return this.http.post<any>(
          `${this.apiUrl}/api/addresses`, 
          address,
          { headers }
        ).pipe(
          catchError(error => {
            console.error('Error al guardar dirección:', error);
            return throwError(() => new Error('Error al guardar la dirección'));
          })
        );
      })
    );
  }

  // Actualizar el tipo de proveedor
  updateProviderType(type: 'INDIVIDUAL' | 'COMPANY'): Observable<any> {
    console.log('Actualizando tipo de proveedor a:', type);
    
    return from(this.authService.getIdToken()).pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => new Error('No se pudo obtener el token de autenticación'));
        }
        
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        
        // Aquí deberías usar el endpoint real para actualizar el tipo de proveedor
        return this.http.post<any>(
          `${this.apiUrl}/api/providers/type`, 
          { type },
          { headers }
        ).pipe(
          catchError(error => {
            console.error('Error al actualizar tipo de proveedor:', error);
            return throwError(() => new Error('Error al actualizar el tipo de proveedor'));
          })
        );
      })
    );
  }

  // Subir imagen de perfil
  uploadProfileImage(file: File): Observable<string> {
    console.log('Subiendo imagen de perfil:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    
    return from(this.authService.getIdToken()).pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => new Error('No se pudo obtener el token de autenticación'));
        }
        
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        
        // Aquí deberías usar el endpoint real para subir imágenes
        return this.http.post<any>(
          `${this.apiUrl}/api/uploads/profile-image`, 
          formData,
          { headers }
        ).pipe(
          map(response => response.url),
          catchError(error => {
            console.error('Error al subir imagen:', error);
            return throwError(() => new Error('Error al subir la imagen'));
          })
        );
      })
    );
  }

  // Subir logo de empresa
  uploadCompanyLogo(file: File): Observable<string> {
    console.log('Subiendo logo de empresa:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    
    return from(this.authService.getIdToken()).pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => new Error('No se pudo obtener el token de autenticación'));
        }
        
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        
        // Aquí deberías usar el endpoint real para subir logos
        return this.http.post<any>(
          `${this.apiUrl}/api/uploads/company-logo`, 
          formData,
          { headers }
        ).pipe(
          map(response => response.url),
          catchError(error => {
            console.error('Error al subir logo:', error);
            return throwError(() => new Error('Error al subir el logo'));
          })
        );
      })
    );
  }
}