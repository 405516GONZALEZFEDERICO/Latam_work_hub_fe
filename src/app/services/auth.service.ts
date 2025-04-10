import { Injectable, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, User as FirebaseUser, sendPasswordResetEmail, signInWithPopup, signOut } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, from, throwError, catchError, tap } from 'rxjs';
import {  Firestore} from '@angular/fire/firestore';
import { CookieService } from 'ngx-cookie-service';
import { User } from '../models/user'; // Adjust path as needed
import { AuthResponseGoogleDto } from '../models/user'; // Adjust path as needed

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private http = inject(HttpClient);
  private router = inject(Router);
  private cookieService = inject(CookieService);
  private API_BASE_URL = 'http://localhost:8080/api/auth';
  public currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private firestore = inject(Firestore);

  // Cookie configuration options
  private cookieOptions = {
    secure: true,
    sameSite: 'Strict' as const
  };
  
  // Cookie expiration options (30 days for persistent cookies)
  private persistentCookieExpires = 30;
  
  constructor() {
    this.initAuthState();
  }

  private initAuthState(): void {
    // Check cookies first
    const userInfoCookie = this.cookieService.get('userInfo');
    if (userInfoCookie) {
      this.currentUserSubject.next(JSON.parse(userInfoCookie));
    }

    // Then observe Firebase auth state
    this.auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        this.getUserFromFirebase(firebaseUser).then(user => {
          if (user && !this.currentUserSubject.value) {
            this.currentUserSubject.next(user);
          }
        });
      }
    });
  }

  private async getUserFromFirebase(firebaseUser: FirebaseUser): Promise<User | null> {
    try {
      const token = await firebaseUser.getIdToken();
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        emailVerified: firebaseUser.emailVerified,
        idToken: token
      };
    } catch (error) {
      console.error('Error getting user from Firebase:', error);
      return null;
    }
  }
  
  getRolesAndPermissions(idToken: string): Observable<any> {
    const url = `${this.API_BASE_URL}/verificar-rol`;
    return this.http.get<any>(url, { params: { idToken } }).pipe(
      catchError(error => {
        console.error('Error fetching roles and permissions:', error);
        return throwError(() => new Error('No se pudieron obtener los roles y permisos.'));
      })
    );
  }

  register(email: string, password: string): Observable<string> {
    return this.http.post(
      `${this.API_BASE_URL}/register`,
      null,
      {
        params: { email, password },
        responseType: 'text'  
      }
    );
  }

  // Login with email and password
  loginWithEmail(email: string, password: string, rememberMe: boolean): Observable<any> {
    return this.http.post<any>(`${this.API_BASE_URL}/login`, null, {
      params: { email, password },
      responseType: 'json'
    }).pipe(
      tap(response => {
        console.log('Login exitoso:', response);
        
        // Store roles and permissions in cookies
        if (rememberMe) {
          // Set persistent cookies (with expiry)
          this.cookieService.set('roles', JSON.stringify(response.roles), this.persistentCookieExpires, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
          this.cookieService.set('permissions', JSON.stringify(response.permissions), this.persistentCookieExpires, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
        } else {
          // Set session cookies (without expiry - will be deleted when browser closes)
          this.cookieService.set('roles', JSON.stringify(response.roles), undefined, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
          this.cookieService.set('permissions', JSON.stringify(response.permissions), undefined, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
        }
        
        // If user info is returned, store it
        if (response.user) {
          this.setUserCookie(response.user, rememberMe);
        }
      }),
      catchError(error => {
        console.error('Error de login:', error);
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  async loginWithGoogle(): Promise<void> {
    try {
      // 1. Autenticar con Firebase para obtener el token
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);

      // 2. Obtener el token ID
      const idToken = await result.user.getIdToken();

      // 3. Llamar al backend para autenticar y obtener roles/permisos
      this.http.post<AuthResponseGoogleDto>(`${this.API_BASE_URL}/google/login`, null, {
        params: { idToken }
      }).pipe(
        tap(response => {
          // Crear objeto de usuario con el tipo correcto
          const user: User = {
            uid: response.localId,
            email: response.email,
            emailVerified: true,
            idToken: response.idToken,
            refreshToken: response.refreshToken,
            role: response.role
          };

          // Set cookies for persistent session (always remember Google login)
          this.setUserCookie(user, true);
          
          // Store roles/permissions if available
          if (response.role) {
            this.cookieService.set('role', JSON.stringify(response.role), this.persistentCookieExpires, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
          }
          
          if (response.permissions) {
            this.cookieService.set('permissions', JSON.stringify(response.permissions), this.persistentCookieExpires, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
          }

          // Update current user
          this.currentUserSubject.next(user);
        }),
        catchError(error => {
          console.error('Error en autenticación con Google:', error);
          throw new Error('Error al autenticar con Google en el servidor');
        })
      ).subscribe();

    } catch (error) {
      console.error('Google auth error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }
  
  registerWithGoogle(): Observable<any> {
    return from((async () => {
      try {
        // 1. Autenticar con Firebase
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(this.auth, provider);

        // 2. Obtener el token ID
        const idToken = await result.user.getIdToken();

        // 3. Enviar el token al backend para registrar al usuario
        return this.http.post<any>(`${this.API_BASE_URL}/google/register`, null, {
          params: { idToken },
          responseType: 'json' as 'json'
        }).pipe(
          tap(response => {
            // 4. Crear objeto de usuario con la respuesta del backend
            const user: User = {
              uid: result.user.uid,
              email: result.user.email || '',
              emailVerified: true,
              idToken: idToken
            };

            // 5. Guardar el usuario en cookies (siempre persistente para Google)
            this.setUserCookie(user, true);
            
            // Store roles/permissions if available
            if (response.roles) {
              this.cookieService.set('roles', JSON.stringify(response.roles), this.persistentCookieExpires, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
            }
            
            if (response.permissions) {
              this.cookieService.set('permissions', JSON.stringify(response.permissions), this.persistentCookieExpires, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
            }
            
            // Update current user
            this.currentUserSubject.next(user);
          })
        ).toPromise();
      } catch (error) {
        console.error('Google registration error:', error);
        throw new Error(this.getErrorMessage(error));
      }
    })());
  }

  // Recover password
  recoverPassword(email: string): Observable<void> {
    return from(sendPasswordResetEmail(this.auth, email)).pipe(
      catchError(error => {
        console.error('Password recovery error:', error);
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);

      // Clear cookies
      this.cookieService.delete('idToken', '/');
      this.cookieService.delete('refreshToken', '/');
      this.cookieService.delete('userInfo', '/');
      this.cookieService.delete('roles', '/');
      this.cookieService.delete('permissions', '/');

      // Clear current user
      this.currentUserSubject.next(null);

      // Redirect to login
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  // Get ID token
  getIdToken(): string | null {
    return this.cookieService.get('idToken') || null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.cookieService.check('idToken') || !!this.currentUserSubject.value;
  }

  // Helper method to set user cookies based on remember me preference
  private setUserCookie(user: User, rememberMe: boolean): void {
    // Update the BehaviorSubject
    this.currentUserSubject.next(user);

    const userString = JSON.stringify(user);
    
    if (rememberMe) {
      // Set persistent cookies with expiry
      this.cookieService.set('userInfo', userString, this.persistentCookieExpires, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
      if (user.idToken) {
        this.cookieService.set('idToken', user.idToken, this.persistentCookieExpires, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
      }
      if (user.refreshToken) {
        this.cookieService.set('refreshToken', user.refreshToken, this.persistentCookieExpires, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
      }
    } else {
      // Set session cookies (will be deleted when browser closes)
      this.cookieService.set('userInfo', userString, undefined, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
      if (user.idToken) {
        this.cookieService.set('idToken', user.idToken, undefined, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
      }
      if (user.refreshToken) {
        this.cookieService.set('refreshToken', user.refreshToken, undefined, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
      }
    }
  }

  // Helper method to decode JWT token (if needed)
  private decodeToken(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  // Check if token is expired (if needed)
  isTokenExpired(token: string): boolean {
    const decodedToken = this.decodeToken(token);
    if (!decodedToken) return true;
    const expirationDate = new Date(decodedToken.exp * 1000);
    const currentDate = new Date();
    return expirationDate <= currentDate;
  }

  // Get human-readable error message
  private getErrorMessage(error: any): string {
    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          return 'Este correo electrónico ya está en uso.';
        case 'auth/invalid-email':
          return 'El correo electrónico no es válido.';
        case 'auth/user-disabled':
          return 'Esta cuenta ha sido deshabilitada.';
        case 'auth/user-not-found':
          return 'No existe usuario con este correo electrónico.';
        case 'auth/wrong-password':
          return 'Contraseña incorrecta.';
        case 'auth/weak-password':
          return 'La contraseña es demasiado débil.';
        case 'auth/operation-not-allowed':
          return 'Operación no permitida.';
        case 'auth/popup-closed-by-user':
          return 'Inicio de sesión cancelado.';
        default:
          return error.message || 'Ha ocurrido un error. Inténtalo de nuevo.';
      }
    }
    return error.message || 'Ha ocurrido un error. Inténtalo de nuevo.';
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.cookieService.get('refreshToken');
    
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    
    return this.http.post<any>(`${this.API_BASE_URL}/google/refresh`, null, {
      params: { refreshToken }
    }).pipe(
      tap(response => {
        // Update tokens in cookies
        if (response.idToken) {
          const rememberMe = this.cookieService.check('refreshToken') && 
                            this.cookieService.get('refreshToken').length > 0;
          
          // Update only the idToken, keep other user info
          const currentUser = this.currentUserSubject.value;
          if (currentUser) {
            const updatedUser = {
              ...currentUser,
              idToken: response.idToken,
              refreshToken: response.refreshToken || currentUser.refreshToken
            };
            
            this.setUserCookie(updatedUser, rememberMe);
            this.currentUserSubject.next(updatedUser);
          }
        }
      }),
      catchError(error => {
        console.error('Token refresh error:', error);
        // If refresh fails, log the user out
        this.logout();
        return throwError(() => new Error('Failed to refresh token'));
      })
    );
  }
}