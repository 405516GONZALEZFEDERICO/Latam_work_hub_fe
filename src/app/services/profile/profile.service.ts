import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, switchMap, catchError, throwError, from, map, tap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { ProfileData } from '../../models/profile';
import { AuthService } from '../auth-service/auth.service';
import { PersonalDataUserDto } from '../../models/personal-data-user-dto';
import { ProviderTypeDto } from '../../models/provider-type';

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

    // Añadir logs para verificar el formData
    console.log('Contenido de formData:', formData.get('image'));

    // Hacer la solicitud HTTP al endpoint correcto
    return this.http.post<any>(`${this.apiUrl}/users/${uid}/upload-img`, formData).pipe(
      tap(response => console.log('Respuesta de subida de imagen:', response)),
      catchError(error => {
        console.error('Error al subir imagen de perfil:', error);
        if (error instanceof HttpErrorResponse) {
          console.error('Detalles HTTP:', error.status, error.statusText, error.message);
        }
        return throwError(() => new Error(`Error al subir imagen: ${error.status} ${error.statusText}`));
      })
    );
  }

  getPersonalData(uid: string): Observable<any> {
    console.log(`Solicitando datos personales para el usuario ${uid}`);
    return this.http.get<any>(`${this.apiUrl}/users/${uid}/get-personal-data`).pipe(
      tap(response => console.log('Respuesta completa del backend (datos personales):', response)),
      map(response => {
        // Verificar si la respuesta está vacía (todos los campos están vacíos)
        if (!response) {
          console.log('ProfileService: Respuesta nula del servidor');
          return null;
        }

        // Verificar si es un objeto vacío
        if (Object.keys(response).length === 0) {
          console.log('ProfileService: Objeto vacío del servidor');
          return null;
        }

        const isEmpty = !response.name && !response.documentNumber &&
          !response.birthDate && !response.photoUrl;

        if (isEmpty) {
          console.log('ProfileService: Datos personales están vacíos');
          return null;
        }

        // Verificar si hay photoUrl y añadir URL base si es necesario
        if (response.photoUrl && !response.photoUrl.startsWith('http')) {
          console.log('Añadiendo URL base a photoUrl:', response.photoUrl);
          response.photoUrl = `${this.apiUrl}${response.photoUrl}`;
        }

        return response;
      }),
      catchError(error => {
        // Si es 404, significa que no hay datos todavía - eso es normal
        if (error.status === 404) {
          console.log('No se encontraron datos personales para el usuario (normal para usuarios nuevos)');
          return of(null);
        }

        console.error('Error al obtener datos personales:', error);
        if (error instanceof HttpErrorResponse) {
          console.error('Detalles HTTP:', error.status, error.statusText, error.message);
        }

        // Devolver null en vez de propagar el error
        return of(null);
      })
    );
  }

  getApiBaseUrl(): string {
    return this.apiUrl;
  }



  updateOrCreatePersonalData(uid: string, personalData: PersonalDataUserDto): Observable<PersonalDataUserDto> {
    console.log('Actualizando datos personales para usuario:', uid);
    console.log('Datos a enviar:', personalData);

    // Convertir la Promise de getIdToken a Observable
    return from(this.authService.getIdToken()).pipe(
      switchMap(token => {
        if (!token) {
          console.error('No se pudo obtener el token de autenticación');
          return throwError(() => new Error('No se pudo obtener el token de autenticación'));
        }

        console.log('Token obtenido correctamente, enviando datos al servidor');

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
        ).pipe(
          tap(response => console.log('Respuesta exitosa del servidor:', response))
        );
      }),
      catchError(error => {
        console.error('Error al actualizar datos personales:', error);
        if (error instanceof HttpErrorResponse) {
          console.error('Detalles HTTP:', error.status, error.statusText, error.message);
          if (error.error) {
            console.error('Respuesta del servidor:', error.error);
          }
        }
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

    console.log('Obteniendo datos de perfil para usuario:', currentUser.uid);

    // Obtener los datos personales usando el método existente
    return this.getPersonalData(currentUser.uid).pipe(
      switchMap((personalData: any) => {
        console.log('Datos personales recibidos del backend:', personalData);

        // Si personalData es null, usar un objeto vacío
        const data = personalData || {};

        // Convertir los datos a formato ProfileData
        const profileData: ProfileData = {
          email: data.email || currentUser.email,
          role: currentUser.role,
          displayName: data.name || currentUser.displayName || currentUser.email.split('@')[0],
          fullName: data.name, // Usar el campo 'name' del backend
          photoUrl: data.photoUrl || currentUser.photoURL,
          birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          jobTitle: data.jobTitle,
          department: data.department,
          providerType: data.providerType,
        };

        console.log('Datos mapeados para el frontend:', profileData);
        return of(profileData);
      }),
      catchError(error => {
        console.error('Error obteniendo datos del perfil:', error);

        // Devolver un perfil básico si hay error
        const basicProfile: ProfileData = {
          email: currentUser.email,
          role: currentUser.role,
          displayName: currentUser.displayName || currentUser.email.split('@')[0],
          photoUrl: currentUser.photoURL,
          profileCompletion: 10
        };

        console.log('Usando perfil básico debido al error:', basicProfile);
        return of(basicProfile);
      })
    );
  }


  // Método para forzar la recarga del perfil (útil después de actualizaciones)
  forceRefreshProfileData(): Observable<ProfileData> {
    console.log('Forzando recarga de datos de perfil...');
    // Primero limpiamos cualquier caché que pueda tener
    // Y luego obtenemos datos frescos
    return this.getProfileData();
  }

  getProviderType(uid: string): Observable<ProviderTypeDto> {
    console.log(`Solicitando tipo de proveedor para el usuario ${uid}`);

    return this.http.get<ProviderTypeDto>(`${this.apiUrl}/users/${uid}/get-provider-type`).pipe(
      tap(response => console.log('Tipo de proveedor recibido:', response)),
      map(response => {
        if (!response || !response.providerType) {
          console.log('No se encontró tipo de proveedor');
          return { providerType: null };
        }
        return response;
      }),
      catchError(error => {
        console.error('Error al obtener tipo de proveedor:', error);
        if (error instanceof HttpErrorResponse) {
          if (error.status === 404) {
            console.log('No se encontró tipo de proveedor (404)');
            return of({ providerType: null });
          }
          console.error('Detalles HTTP:', error.status, error.statusText);
        }
        return of({ providerType: null });
      })
    );
  }

  // Método para desactivar la cuenta del usuario
  desactivateAccount(uid: string): Observable<boolean> {
    console.log(`Solicitando desactivación de cuenta para el usuario ${uid}`);
    
    return from(this.authService.getIdToken()).pipe(
      switchMap(token => {
        if (!token) {
          console.error('No se pudo obtener el token de autenticación');
          return throwError(() => new Error('No se pudo obtener el token de autenticación'));
        }

        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });

        return this.http.patch<boolean>(
          `${this.apiUrl}/users/desactivate-account/${uid}`, 
          {}, 
          { headers }
        ).pipe(
          tap(result => console.log('Respuesta de desactivación de cuenta:', result))
        );
      }),
      catchError(error => {
        console.error('Error al desactivar la cuenta:', error);
        if (error instanceof HttpErrorResponse) {
          console.error('Detalles HTTP:', error.status, error.statusText, error.message);
        }
        return throwError(() => new Error(`Error al desactivar la cuenta: ${error.message || 'Error desconocido'}`));
      })
    );
  }
}