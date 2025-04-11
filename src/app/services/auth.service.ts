import { Injectable, inject, runInInjectionContext, Injector } from '@angular/core';
import { Auth, GoogleAuthProvider, User as FirebaseUser, sendPasswordResetEmail, signInWithPopup, signOut, signInWithRedirect, getRedirectResult } from '@angular/fire/auth';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, from, throwError, catchError, tap } from 'rxjs';
import { Firestore } from '@angular/fire/firestore';
import { CookieService } from 'ngx-cookie-service';
import { User } from '../models/user';
import { AuthResponseGoogleDto } from '../models/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private http = inject(HttpClient);
  private router = inject(Router);
  private cookieService = inject(CookieService);
  private firestore = inject(Firestore);
  private injector = inject(Injector);

  private API_BASE_URL = 'http://localhost:8080/api/auth';
  public currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private readonly AUTH_CHECK_INTERVAL = 1000; // 1 segundo

  private cookieOptions = { secure: true, sameSite: 'Strict' as const };
  private persistentCookieExpires = 30;

  constructor() {
    // Solo inicializamos el estado del usuario desde las cookies si existen
    this.initFromStoredSession();
  }

  private initFromStoredSession(): void {
    try {
      const userInfoStr = this.cookieService.get('userInfo');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        const idToken = this.cookieService.get('idToken');
        const refreshToken = this.cookieService.get('refreshToken');
        const role = this.cookieService.get('role');

        if (userInfo && idToken) {
          const user: User = {
            ...userInfo,
            idToken,
            refreshToken,
            role
          };
          this.currentUserSubject.next(user);
        }
      }
    } catch (error) {
      console.error('Error al inicializar desde sesión almacenada:', error);
      this.clearSession();
    }
  }

  private initAuthState(): void {
    this.auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        console.log('Firebase Auth State Changed:', firebaseUser);
      } else {
        console.log('No hay usuario autenticado en Firebase');
        this.clearSession();
      }
    });
  }

  private async getUserFromFirebase(firebaseUser: FirebaseUser): Promise<User | null> {
    try {
      const token = await firebaseUser.getIdToken();
      console.log('Token obtenido de Firebase:', token);
      return this.sendTokenToBackend(token, firebaseUser);
    } catch (error) {
      console.error('Error getting user from Firebase:', error);
      this.clearSession();
      return null;
    }
  }

  private storeSession(user: User, rememberMe: boolean, roles?: any, permissions?: any): void {
    console.log('Almacenando sesión para usuario:', user);
    
    // Primero actualizamos el estado
    this.currentUserSubject.next(user);
    
    // Luego almacenamos las cookies
    this.setUserCookie(user, rememberMe);
    if (roles) this.setCookie('roles', roles, rememberMe);
    if (permissions) this.setCookie('permissions', permissions, rememberMe);
    
    // Verificamos que el estado se haya actualizado correctamente
    const currentUser = this.currentUserSubject.value;
    console.log('Estado de autenticación actualizado:', currentUser ? 'Autenticado' : 'No autenticado');
    console.log('Sesión almacenada, currentUserSubject actualizado');
  }

  private setCookie(key: string, value: any, rememberMe: boolean): void {
    const serializedValue = JSON.stringify(value);
    const expires = rememberMe ? this.persistentCookieExpires : undefined;
    this.cookieService.set(key, serializedValue, expires, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
  }

  private setUserCookie(user: User, rememberMe: boolean): void {
    const userString = JSON.stringify(user);
    const expires = rememberMe ? this.persistentCookieExpires : undefined;
    this.cookieService.set('userInfo', userString, expires, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
    if (user.idToken) this.cookieService.set('idToken', user.idToken, expires, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
    if (user.refreshToken) this.cookieService.set('refreshToken', user.refreshToken, expires, '/', undefined, this.cookieOptions.secure, this.cookieOptions.sameSite);
  }

  loginWithEmail(email: string, password: string, rememberMe: boolean): Observable<any> {
    return this.http.post<any>(`${this.API_BASE_URL}/login`, null, {
      params: { email, password },
      responseType: 'json'
    }).pipe(
      tap(response => {
        if (response.user) {
          const user: User = response.user;
          this.storeSession(user, rememberMe, response.roles, response.permissions);
          console.log('Usuario almacenado:', user); // Para debugging
        }
      }),
      catchError(error => {
        console.error('Error de login:', error);
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  async loginWithGoogle(): Promise<void> {
    console.log('Iniciando proceso de login con Google...');
    // Limpiamos cualquier sesión existente antes de comenzar
    this.clearSession();
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      // Usamos signInWithPopup en lugar de signInWithRedirect para evitar problemas de redirección
      const result = await runInInjectionContext(this.injector, () => 
        signInWithPopup(this.auth, provider)
      );

      if (result) {
        const idToken = await result.user.getIdToken();
        await this.sendTokenToBackend(idToken, result.user);
      }
    } catch (error) {
      console.error('Error en la autenticación con Google:', error);
      this.clearSession();
      throw error;
    }
  }

  register(email: string, password: string): Observable<string> {
    return this.http.post(`${this.API_BASE_URL}/register`, null, {
      params: { email, password },
      responseType: 'text'
    });
  }

  async registerWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      await runInInjectionContext(this.injector, async () => {
        await signInWithRedirect(this.auth, provider);
      });
    } catch (error) {
      console.error('Error en la autenticación con Google:', error);
      throw error;
    }
  }

  async handleRedirectResult(): Promise<User | null> {
    try {
      console.log('Iniciando handleRedirectResult...');
      console.log('Estado actual de autenticación:', this.auth.currentUser);
      
      const result = await runInInjectionContext(this.injector, async () => {
        try {
          const redirectResult = await getRedirectResult(this.auth);
          console.log('Resultado de getRedirectResult:', redirectResult);
          return redirectResult;
        } catch (error) {
          console.error('Error al obtener resultado de redirección:', error);
          throw error;
        }
      });
      
      if (!result) {
        console.log('No se obtuvo resultado de la redirección. Verificando estado de autenticación...');
        const currentUser = this.auth.currentUser;
        if (currentUser) {
          console.log('Usuario actual encontrado:', currentUser);
          const idToken = await currentUser.getIdToken();
          return this.sendTokenToBackend(idToken, currentUser);
        }
        return null;
      }

      console.log('Usuario autenticado:', result.user);
      const idToken = await result.user.getIdToken();
      console.log('Token obtenido:', idToken);

      return this.sendTokenToBackend(idToken, result.user);
    } catch (error) {
      console.error('Error al manejar el resultado de la redirección:', error);
      throw error;
    }
  }

  private async storeSessionAsync(user: User, rememberMe: boolean): Promise<void> {
    return new Promise((resolve) => {
      try {
        console.log('Almacenando sesión para usuario:', user);
        
        // Limpiamos las cookies anteriores primero
        const cookiesToClear = ['idToken', 'refreshToken', 'userInfo', 'role'];
        cookiesToClear.forEach(cookie => {
          if (this.cookieService.check(cookie)) {
            this.cookieService.delete(cookie, '/');
          }
        });
        
        // Actualizamos el estado
        this.currentUserSubject.next(user);
        
        // Almacenamos las cookies con la expiración correcta
        const expirationDays = user.expiresIn ? parseInt(user.expiresIn) / (24 * 60 * 60) : this.persistentCookieExpires;
        
        if (user.idToken) {
          this.cookieService.set('idToken', user.idToken, expirationDays, '/', undefined, true, 'Strict');
        }
        
        if (user.refreshToken) {
          this.cookieService.set('refreshToken', user.refreshToken, this.persistentCookieExpires, '/', undefined, true, 'Strict');
        }
        
        if (user.role) {
          this.cookieService.set('role', user.role, expirationDays, '/', undefined, true, 'Strict');
        }

        // Almacenamos información del usuario
        const userInfo = {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: user.role
        };
        this.cookieService.set('userInfo', JSON.stringify(userInfo), expirationDays, '/', undefined, true, 'Strict');
        
        console.log('Sesión almacenada correctamente. Estado actual:', this.currentUserSubject.value);
        resolve();
      } catch (error) {
        console.error('Error almacenando la sesión:', error);
        this.clearSession();
        resolve();
      }
    });
  }

  private async sendTokenToBackend(idToken: string, firebaseUser: any): Promise<User> {
    console.log('Enviando token al backend...');
    
    return new Promise<User>((resolve, reject) => {
      this.http.post<AuthResponseGoogleDto>(`${this.API_BASE_URL}/google/login`, null, {
        params: new HttpParams().set('idToken', idToken),
        headers: {
          'Content-Type': 'application/json'
        }
      }).subscribe({
        next: async (response) => {
          try {
            console.log('Respuesta del backend:', response);
            
            if (!response || !response.role || !response.idToken || !response.email || !response.localId) {
              throw new Error('Respuesta del backend inválida o incompleta');
            }

            const user: User = {
              uid: response.localId,
              email: response.email,
              emailVerified: true,
              idToken: response.idToken,
              refreshToken: response.refreshToken || undefined,
              role: response.role,
              displayName: response.name,
              photoURL: response.photoUrl,
              expiresIn: response.expiresIn
            };

            console.log('Usuario construido con datos del backend:', user);
            
            if (this.isValidUserResponse(user)) {
              // Primero actualizamos el estado y almacenamos la sesión
              await this.storeSessionAsync(user, true);
              
              // Configurar el timer para refresh token
              this.setupRefreshTokenTimer(user);
              
              console.log('Estado actualizado, procediendo a navegar. Rol actual:', user.role);
              console.log('Estado del usuario en currentUserSubject:', this.currentUserSubject.value);
              
              // Redirigir basado en el rol
              if (user.role === 'DEFAULT') {
                console.log('Navegando a select-role...');
                await this.router.navigate(['/select-role'], { 
                  replaceUrl: true,
                  queryParams: { timestamp: new Date().getTime() }
                });
              } else {
                console.log('Navegando a default-section...');
                await this.router.navigate(['/default-section'], { 
                  replaceUrl: true,
                  queryParams: { timestamp: new Date().getTime() }
                });
              }
              
              resolve(user);
            } else {
              throw new Error('Datos de usuario incompletos');
            }
          } catch (error) {
            console.error('Error procesando respuesta:', error);
            this.clearSession();
            reject(error);
          }
        },
        error: (error) => {
          console.error('Error en la llamada al backend:', error);
          this.clearSession();
          reject(error);
        }
      });
    });
  }

  private isValidUserResponse(user: User): boolean {
    return !!(
      user &&
      user.uid &&
      user.email &&
      user.idToken &&
      user.role
    );
  }

  private setupRefreshTokenTimer(user: User): void {
    if (user.expiresIn) {
      const expiresIn = parseInt(user.expiresIn);
      // Refrescar 5 minutos antes de que expire
      const timeout = (expiresIn - 300) * 1000;
      
      setTimeout(() => {
        console.log('Iniciando refresh de token...');
        this.refreshGoogleToken().subscribe({
          next: (response) => {
            console.log('Token refrescado exitosamente');
            // Actualizar el token en las cookies
            if (response.idToken) {
              this.cookieService.set('idToken', response.idToken, this.persistentCookieExpires, '/', undefined, true, 'Strict');
            }
          },
          error: (error) => {
            console.error('Error al refrescar el token:', error);
            // Si falla el refresh, redirigir al login
            this.clearSession();
            this.router.navigate(['/login']);
          }
        });
      }, timeout);
    }
  }

  refreshGoogleToken(): Observable<any> {
    const refreshToken = this.cookieService.get('refreshToken');
    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token disponible'));
    }

    return this.http.post<AuthResponseGoogleDto>(`${this.API_BASE_URL}/google/refresh`, null, {
      params: new HttpParams().set('refreshToken', refreshToken)
    }).pipe(
      tap((response) => {
        // Actualizar el estado y las cookies con la nueva información
        const user: User = {
          ...this.currentUserSubject.value!,
          idToken: response.idToken,
          refreshToken: response.refreshToken,
          expiresIn: response.expiresIn
        };
        this.storeSessionAsync(user, true);
      }),
      catchError((error) => {
        console.error('Error refrescando token de Google', error);
        this.clearSession();
        return throwError(() => error);
      })
    );
  }

  private clearSession(): void {
    console.log('Limpiando sesión...');
    
    const cookiesToClear = ['idToken', 'refreshToken', 'userInfo', 'role'];
    cookiesToClear.forEach(cookie => {
      if (this.cookieService.check(cookie)) {
        this.cookieService.delete(cookie, '/');
      }
    });
    
    // Solo actualizamos el subject si realmente hay un cambio
    if (this.currentUserSubject.value !== null) {
      this.currentUserSubject.next(null);
    }
    
    console.log('Sesión limpiada completamente');
  }

  recoverPassword(email: string): Observable<void> {
    return from(sendPasswordResetEmail(this.auth, email)).pipe(
      catchError(error => {
        console.error('Password recovery error:', error);
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.clearSession();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  getIdToken(): string | null {
    return this.cookieService.get('idToken') || null;
  }

  isAuthenticated(): boolean {
    return this.cookieService.check('idToken') || !!this.currentUserSubject.value;
  }

  getRolesAndPermissions(idToken: string): Observable<any> {
    return this.http.get<any>(`${this.API_BASE_URL}/verificar-rol`, { params: { idToken } }).pipe(
      catchError(error => {
        console.error('Error fetching roles and permissions:', error);
        return throwError(() => new Error('No se pudieron obtener los roles y permisos.'));
      })
    );
  }

  private decodeToken(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    const decodedToken = this.decodeToken(token);
    if (!decodedToken) return true;
    return new Date(decodedToken.exp * 1000) < new Date();
  }

  private getErrorMessage(error: any): string {
    return error?.message || 'Ocurrió un error inesperado';
  }

  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refreshToken');
    const params = new HttpParams().set('refreshToken', refreshToken || '');

    return this.http.post<any>(`${this.API_BASE_URL}/refresh-token`, null, { params }).pipe(
      tap((res) => {
        localStorage.setItem('accessToken', res.token);
        localStorage.setItem('refreshToken', res.refreshToken);
      }),
      catchError(err => {
        console.error('Error refrescando token', err);
        return throwError(() => err);
      })
    );
  }
}
