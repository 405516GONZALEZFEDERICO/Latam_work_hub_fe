import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, switchMap, catchError, throwError, from } from 'rxjs';
import { environment } from '../../../environment/environment';
import { ProfileData } from '../../models/profile';
import { AuthService } from '../auth-service/auth.service';
import { PersonalDataUserDto } from '../../models/personal-data-user-dto';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = `${environment.apiUrl}`;
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  uploadProfilePicture(uid: string, formData: FormData): Observable<any> {
    if (!uid) {
      const currentUser = this.authService.getCurrentUserSync();
      if (!currentUser || !currentUser.uid) {
        return throwError(() => new Error('No se pudo identificar el usuario'));
      }
      uid = currentUser.uid;
    }
    
    console.log(`Enviando imagen al servidor para el usuario ${uid}`);
    
    // Hacer la solicitud HTTP al endpoint correcto
    return this.http.post<any>(`${this.apiUrl}/users/${uid}/upload-img`, formData);
  }
  
  getPersonalData(uid: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/${uid}/get-personal-data`);
  }
  getApiBaseUrl(): string {
    return this.apiUrl;
  }
  updateOrCreatePersonalData(uid: string, personalData: PersonalDataUserDto): Observable<PersonalDataUserDto> {
    // Convertir la Promise de getIdToken a Observable
    return from(this.authService.getIdToken()).pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => new Error('No se pudo obtener el token de autenticación'));
        }

        // Configurar los headers con el token
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        });

        // Asegurarse de que el UID esté en los datos enviados
        const dataToSend: PersonalDataUserDto = {
          ...personalData,
          uid: uid
        };

        // Hacer la solicitud POST al endpoint correcto
        return this.http.post<PersonalDataUserDto>(
          `${this.apiUrl}/users/personal-data`, 
          dataToSend, 
          { headers }
        );
      }),
      catchError(error => {
        console.error('Error al actualizar datos personales:', error);
        return throwError(() => new Error(`Error al actualizar datos personales: ${error.message || 'Error desconocido'}`));
      })
    );
  }
  
  // Método general para obtener todos los datos del perfil
  getProfileData(): Observable<ProfileData> {
    // Obtener el usuario actual
    const currentUser = this.authService.getCurrentUserSync();
    if (!currentUser || !currentUser.uid) {
      console.error('No hay usuario autenticado para obtener su perfil');
      return of({} as ProfileData);
    }
    
    // Obtener los datos personales usando el método existente
    return this.getPersonalData(currentUser.uid).pipe(
      switchMap((personalData: any) => {
        // Convertir los datos a formato ProfileData
        const profileData: ProfileData = {
          email: personalData.email || currentUser.email,
          role: currentUser.role,
          displayName: personalData.name || currentUser.email.split('@')[0],
          fullName: personalData.name,
          photoUrl: personalData.photoUrl || currentUser.photoURL,
          birthDate: personalData.birthDate ? new Date(personalData.birthDate) : undefined,
          documentType: personalData.documentType,
          documentNumber: personalData.documentNumber,
          jobTitle: personalData.jobTitle,
          department: personalData.department,
          providerType: personalData.providerType,
          profileCompletion: this.calculateProfileCompletion(personalData)
        };
        
        return of(profileData);
      }),
      catchError(error => {
        console.error('Error obteniendo datos del perfil:', error);
        
        // Devolver un perfil básico si hay error
        const basicProfile: ProfileData = {
          email: currentUser.email,
          role: currentUser.role,
          displayName: currentUser.email.split('@')[0],
          photoUrl: currentUser.photoURL,
          profileCompletion: 10
        };
        
        return of(basicProfile);
      })
    );
  }
  
  // Método para calcular el porcentaje de completitud del perfil
  private calculateProfileCompletion(personalData: any): number {
    if (!personalData) return 0;
    
    const requiredFields = ['name', 'email', 'birthDate', 'documentType', 'documentNumber'];
    const optionalFields = ['jobTitle', 'department', 'photoUrl', 'address'];
    
    // Contar campos requeridos completados (70% del total)
    const requiredCompleted = requiredFields.filter(field => 
      personalData[field] !== undefined && personalData[field] !== null && personalData[field] !== ''
    ).length;
    
    // Contar campos opcionales completados (30% del total)
    const optionalCompleted = optionalFields.filter(field => 
      personalData[field] !== undefined && personalData[field] !== null && personalData[field] !== ''
    ).length;
    
    // Calcular porcentaje total
    const requiredPercentage = (requiredCompleted / requiredFields.length) * 70;
    const optionalPercentage = (optionalCompleted / optionalFields.length) * 30;
    
    return Math.min(100, Math.round(requiredPercentage + optionalPercentage));
  }
}