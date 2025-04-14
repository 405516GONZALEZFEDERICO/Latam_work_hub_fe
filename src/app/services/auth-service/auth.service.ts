import { Injectable, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, onAuthStateChanged, browserLocalPersistence, browserSessionPersistence, setPersistence, sendPasswordResetEmail } from '@angular/fire/auth';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, from, throwError, catchError, switchMap, of, BehaviorSubject } from 'rxjs';
import { AuthResponseGoogleDto, User, UserRole } from '../../models/user';
import { doc, Firestore, getDoc, setDoc } from '@angular/fire/firestore';
import { environment } from '../../../environment/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private http = inject(HttpClient);
  private router = inject(Router);
  private firestore = inject(Firestore);

  // Usa environment para la URL base - crea este archivo si no existe
  private API_BASE_URL = environment.apiUrl || 'http://localhost:8080/api/auth';
  
  // Track user auth state using BehaviorSubject
  private currentUserData: User | null = null;
  private authStateSubject = new BehaviorSubject<boolean>(this.checkInitialAuthState());
  private userSubject = new BehaviorSubject<User | null>(null);
  
  // Public observables that components can subscribe to
  public authState$ = this.authStateSubject.asObservable();
  public currentUser$ = this.userSubject.asObservable();
  
  // Check initial auth state from localStorage
  private checkInitialAuthState(): boolean {
    try {
      const userData = localStorage.getItem('currentUserData');
      const timestamp = localStorage.getItem('userDataTimestamp');
      
      if (userData && timestamp) {
        const now = new Date().getTime();
        const parsedTimestamp = parseInt(timestamp);
        
        // Check if data is not expired (less than 1 hour old)
        if (now - parsedTimestamp <= 3600000) {
          const user = JSON.parse(userData);
          this.currentUserData = user;
          this.userSubject.next(user);
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Error checking initial auth state:', e);
      return false;
    }
  }

  constructor() {
    // Initialize auth state from localStorage
    const initialUserData = this.getUserFromLocalStorage();
    if (initialUserData) {
      this.currentUserData = initialUserData;
      this.userSubject.next(initialUserData);
      this.authStateSubject.next(true);
    }
    
    // Escuchar cambios en el estado de autenticación de Firebase
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        // Intentar recuperar datos de localStorage primero
        const cachedUser = this.getUserFromLocalStorage();
        
        if (cachedUser && cachedUser.uid === user.uid) {
          // Si tenemos datos en caché, los usamos inmediatamente
          this.currentUserData = cachedUser;
          this.userSubject.next(cachedUser);
          this.authStateSubject.next(true);
          
          // Si el rol es DEFAULT, redirigir a select-role, sino al home o a la ruta específica
          if (cachedUser.role === 'DEFAULT') {
            this.router.navigate(['/select-role']);
          } else {
            // Solo redirigir si no estamos ya en una ruta protegida
            const currentUrl = window.location.pathname;
            if (currentUrl === '/' || currentUrl === '/login' || currentUrl === '/register') {
              this.router.navigate(['/home']);
            }
          }
          
          // Verificamos el rol en segundo plano (sin bloquear navegación)
          setTimeout(() => {
            user.getIdToken().then(idToken => {
              this.verifyUserRoleInBackground(idToken);
            });
          }, 2000);
        } else {
          // Si no tenemos datos en caché, obtenemos el token y verificamos el rol
          user.getIdToken().then(idToken => {
            this.verifyUserRole(idToken);
          }).catch(error => {
            console.error('Error al obtener token:', error);
            this.authStateSubject.next(false);
          });
        }
      } else {
        this.currentUserData = null;
        this.userSubject.next(null);
        this.authStateSubject.next(false);
        localStorage.removeItem('currentUserData');
        localStorage.removeItem('userDataTimestamp');
        this.router.navigate(['/login']);
      }
    });
  }
  
  // Obtener información del rol desde localStorage
  private getUserFromLocalStorage(uid?: string): User | null {
    try {
      const userData = localStorage.getItem('currentUserData');
      if (!userData) return null;
      
      const parsedUser = JSON.parse(userData);
      
      // Verificar que sea el mismo usuario si se proporciona un UID
      if (uid && parsedUser.uid !== uid) return null;
      
      // Comprobar si los datos tienen más de 1 hora (3600000 ms)
      const timestamp = localStorage.getItem('userDataTimestamp');
      if (timestamp) {
        const now = new Date().getTime();
        if (now - parseInt(timestamp) > 3600000) {
          localStorage.removeItem('currentUserData');
          localStorage.removeItem('userDataTimestamp');
          return null;
        }
      }
      
      return parsedUser;
    } catch (e) {
      console.error('Error al obtener datos del usuario desde localStorage:', e);
      return null;
    }
  }

  // Método para verificación en segundo plano (sin impactar UX)
  private verifyUserRoleInBackground(idToken: string): void {
    this.verifyUserRole(idToken, false);
  }

  // Obtener información del rol desde el backend
  private verifyUserRole(idToken: string, shouldNavigate: boolean = true): void {
    this.http.get<any>(`${this.API_BASE_URL}/verificar-rol`, {
      params: { idToken },
      headers: { 'Content-Type': 'application/json' }
    }).subscribe({
      next: (response) => {
        if (response && this.auth.currentUser) {
          const role = response.role || 'DEFAULT';
          
          this.currentUserData = {
            uid: this.auth.currentUser.uid,
            email: this.auth.currentUser.email!,
            emailVerified: this.auth.currentUser.emailVerified,
            role: role,
            idToken: idToken,
            refreshToken: this.auth.currentUser.refreshToken
          };
          
          // Actualizar BehaviorSubjects
          this.userSubject.next(this.currentUserData);
          this.authStateSubject.next(true);
          
          // Guardar en localStorage para futuras recargas
          localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
          localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
          
          // Solo redirigir si se especifica
          if (shouldNavigate) {
            // Redireccionar según el rol
            if (role === 'DEFAULT') {
              this.router.navigate(['/select-role']);
            } else {
              const currentUrl = window.location.pathname;
              if (currentUrl === '/' || currentUrl === '/login' || currentUrl === '/register') {
                this.router.navigate(['/home']);
              }
            }
          }
        }
      },
      error: (error) => {
        console.error('Error al verificar rol:', error);
        // En caso de error, asignar rol DEFAULT si no tenemos datos
        if (!this.currentUserData && this.auth.currentUser) {
          this.currentUserData = {
            uid: this.auth.currentUser.uid,
            email: this.auth.currentUser.email!,
            emailVerified: this.auth.currentUser.emailVerified,
            role: 'DEFAULT',
            idToken: idToken,
            refreshToken: this.auth.currentUser.refreshToken
          };
          
          // Actualizar BehaviorSubjects
          this.userSubject.next(this.currentUserData);
          this.authStateSubject.next(true);
          
          // Guardar en localStorage para futuras recargas
          localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
          localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
          
          if (shouldNavigate) {
            // Si hay error, siempre redirigir a select-role porque el rol será DEFAULT
            this.router.navigate(['/select-role']);
          }
        } else {
          this.authStateSubject.next(false);
        }
      }
    });
  }

  getCurrentUser(): Observable<User | null> {
    // Si ya tenemos los datos en caché o en el subject, los devolvemos directamente
    if (this.userSubject.getValue()) {
      return of(this.userSubject.getValue());
    }
    
    // Si tenemos datos en localStorage, los devolvemos
    const cachedUser = this.getUserFromLocalStorage();
    if (cachedUser) {
      this.userSubject.next(cachedUser);
      return of(cachedUser);
    }
    
    return new Observable<User | null>((subscriber) => {
      const user = this.auth.currentUser;
      if (!user) {
        subscriber.next(null);
        subscriber.complete();
        return;
      }
      
      // Obtener token
      user.getIdToken()
        .then(idToken => {
          // Verificar rol en el backend (GET es el método correcto)
          this.http.get<any>(`${this.API_BASE_URL}/verificar-rol`, {
            params: { idToken },
            headers: { 'Content-Type': 'application/json' }
          }).subscribe({
            next: (response) => {
              const role: UserRole = response?.role || 'DEFAULT';
              
              this.currentUserData = {
                uid: user.uid,
                email: user.email!,
                emailVerified: user.emailVerified,
                role: role,
                idToken: idToken,
                refreshToken: user.refreshToken
              };
              
              // Actualizar BehaviorSubject
              this.userSubject.next(this.currentUserData);
              this.authStateSubject.next(true);
              
              // Guardar en localStorage para futuras recargas
              localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
              localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
              
              subscriber.next(this.currentUserData);
              subscriber.complete();
            },
            error: (error) => {
              console.error('Error al verificar rol:', error);
              // En caso de error, usar DEFAULT
              this.currentUserData = {
                uid: user.uid,
                email: user.email!,
                emailVerified: user.emailVerified,
                role: 'DEFAULT',
                idToken: idToken,
                refreshToken: user.refreshToken
              };
              
              // Actualizar BehaviorSubject
              this.userSubject.next(this.currentUserData);
              this.authStateSubject.next(true);
              
              // Guardar en localStorage para futuras recargas
              localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
              localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
              
              subscriber.next(this.currentUserData);
              subscriber.complete();
            }
          });
        })
        .catch(error => {
          console.error('Error al obtener token:', error);
          this.authStateSubject.next(false);
          subscriber.next(null);
          subscriber.complete();
        });
    });
  }

  // Método para crear documento de usuario si no existe
  private async createUserDocument(uid: string, email: string, role: UserRole): Promise<void> {
    try {
      const userDocRef = doc(this.firestore, `users/${uid}`);
      await setDoc(userDocRef, {
        email,
        role,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creando documento de usuario:', error);
      throw error;
    }
  }

  async loginWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      // Forzar selección de cuenta incluso si ya hay una sesión
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(this.auth, provider);
      if (result) {
        const idToken = await result.user.getIdToken();
        
        // Comprobar si el usuario existe en el backend
        this.http.post<string>(`${this.API_BASE_URL}/google/register`, null, {
          params: { idToken },
          headers: { 'Content-Type': 'application/json' }
        }).subscribe({
          next: (response) => {
            console.log('Registro con Google exitoso:', response);
            // Después del registro, hacer login
            this.googleLogin(idToken);
          },
          error: (error) => {
            console.error('Error en el registro con Google:', error);
            // Puede ser que ya exista, intentar login
            this.googleLogin(idToken);
          }
        });
      }
    } catch (error) {
      console.error('Error en la autenticación con Google:', error);
      throw error;
    }
  }
  
  // Método para hacer solo login con Google
  private googleLogin(idToken: string): void {
    this.http.post<AuthResponseGoogleDto>(`${this.API_BASE_URL}/google/login`, null, {
      params: { idToken },
      headers: { 'Content-Type': 'application/json' }
    }).subscribe({
      next: (response) => {
        console.log('Autenticación con Google exitosa:', response);
        // Actualizar datos de usuario en memoria
        this.getCurrentUser().subscribe();
      },
      error: (error) => {
        console.error('Error en la autenticación con Google en el backend:', error);
        // Aunque falle en el backend, la autenticación en Firebase es exitosa
      }
    });
  }

  register(email: string, password: string): Observable<string> {
    // Usar parámetros de consulta para método POST como espera el backend
    const params = new HttpParams()
      .set('email', email)
      .set('password', password);

    // Cambiamos a POST, que es lo que espera el endpoint /register
    return this.http.post(`${this.API_BASE_URL}/register`, null, {
      responseType: 'text',
      params: params,
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      catchError(error => {
        console.error('Error al registrar usuario:', error);
        return throwError(() => new Error('No se pudo registrar el usuario'));
      })
    );
  }

  updateUserRole(uid: string, role: UserRole): Observable<any> {
    // Ajustamos el formato del body para enviar exactamente lo que espera el endpoint
    const requestBody = {
      uid: uid,
      roleName: role
    };

    // Endpoint espera un POST con body JSON
    return this.http.post(`${this.API_BASE_URL}/roles/assign`, requestBody, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      switchMap(response => {
        // Actualizar cache local
        if (this.currentUserData && this.currentUserData.uid === uid) {
          this.currentUserData.role = role;
          
          // Actualizamos en localStorage también
          localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
          localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
        }
        return of(response);
      }),
      catchError(error => {
        console.error('Error al actualizar el rol:', error);
        return throwError(() => new Error('No se pudo actualizar el rol'));
      })
    );
  }

  loginWithEmail(email: string, password: string, rememberMe: boolean = false): Observable<any> {
    return new Observable((observer) => {
      signInWithEmailAndPassword(this.auth, email, password)
        .then((result) => {
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          } else {
            localStorage.removeItem('rememberMe');
          }
          
          result.user.getIdToken().then(idToken => {
            this.currentUserData = {
              uid: result.user.uid,
              email: result.user.email!,
              emailVerified: result.user.emailVerified,
              role: result.user.uid === 'DEFAULT' ? 'DEFAULT' as UserRole : 'USER' as UserRole,
              idToken: idToken,
              refreshToken: result.user.refreshToken
            };
             
            // Guardar en localStorage para futuras recargas
            localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
            localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
            
            this.router.navigate(['/select-rol']); 
            observer.next(result);
            observer.complete();
          }).catch((error: any) => {
            console.error('Get ID token error:', error);
            observer.error(this.handleAuthError(error));
          });
        })
        .catch((error: any) => {
          console.error('Login with email error:', error);
          observer.error(this.handleAuthError(error));
        });
    });
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.currentUserData = null;
      this.userSubject.next(null);
      this.authStateSubject.next(false);
      localStorage.removeItem('currentUserData');
      localStorage.removeItem('userDataTimestamp');
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      throw error;
    }
  }

  getIdToken(): Promise<string | null> {
    return this.auth.currentUser?.getIdToken() || Promise.resolve(null);
  }

  isAuthenticated(): boolean {
    return this.auth.currentUser !== null;
  }

  // Método para renovar el token si está por expirar o ha expirado
  refreshToken(): Observable<string | null> {
    return new Observable<string | null>((subscriber) => {
      const user = this.auth.currentUser;
      if (!user) {
        subscriber.next(null);
        subscriber.complete();
        return;
      }

      // Forzar la actualización del token (true fuerza la renovación)
      user.getIdToken(true)
        .then(newToken => {
          // Actualizar el token en los datos del usuario
          if (this.currentUserData) {
            this.currentUserData.idToken = newToken;
            
            // Actualizar también en localStorage
            localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
            localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
          }
          subscriber.next(newToken);
        })
        .catch(error => {
          console.error('Error al renovar el token:', error);
          // Si hay un error al renovar, puede que la sesión haya expirado
          subscriber.next(null);
        })
        .finally(() => {
          subscriber.complete();
        });
    });
  }

  // Verificar si el token está a punto de expirar (para uso proactivo)
  checkTokenExpiration(): Observable<boolean> {
    return new Observable<boolean>((subscriber) => {
      const user = this.auth.currentUser;
      if (!user) {
        subscriber.next(false);
        subscriber.complete();
        return;
      }

      user.getIdTokenResult()
        .then(idTokenResult => {
          const expirationTime = new Date(idTokenResult.expirationTime).getTime();
          const currentTime = new Date().getTime();
          
          // Si faltan menos de 5 minutos para expirar
          const fiveMinutes = 5 * 60 * 1000;
          const isExpiringSoon = (expirationTime - currentTime) < fiveMinutes;
          
          subscriber.next(isExpiringSoon);
        })
        .catch(error => {
          console.error('Error al verificar expiración del token:', error);
          subscriber.next(false);
        })
        .finally(() => {
          subscriber.complete();
        });
    });
  }

  // Manejar errores de autenticación comunes
  handleAuthError(error: any): Observable<any> {
    if (error.status === 401 || error.status === 403) {
      // Token inválido o expirado
      return this.refreshToken().pipe(
        switchMap(token => {
          if (token) {
            return of(token); // Token renovado correctamente
          } else {
            // No se pudo renovar, cerrar sesión
            this.logout();
            return throwError(() => new Error('La sesión ha expirado. Por favor, inicie sesión nuevamente.'));
          }
        })
      );
    }
    
    // Para otros errores, simplemente propagar
    return throwError(() => error);
  }

  // Método para solicitar recuperación de contraseña
  recuperarContrasenia(email: string): Observable<any> {
    return new Observable((observer) => {
      sendPasswordResetEmail(this.auth, email)
        .then(() => {
          observer.next({ success: true });
          observer.complete();
        })
        .catch((error: any) => {
          console.error('Password reset error:', error);
          observer.error(this.handleAuthError(error));
        });
    });
  }

  // Add methods for the login guard to prevent flashing
  waitForAuthReady(): Observable<boolean> {
    // Creates an observable that only completes when auth state is definitively known
    return new Observable<boolean>(observer => {
      const subscription = this.authState$.subscribe(state => {
        // Check if Firebase auth has initialized
        if (this.auth.currentUser !== undefined) {
          observer.next(true);
          observer.complete();
        }
      });
      
      // Clean up subscription when observer unsubscribes
      return () => subscription.unsubscribe();
    });
  }
  
  isLoggedIn(): boolean {
    return this.authStateSubject.getValue();
  }
  
  getCurrentUserSync(): User | null {
    return this.currentUserData;
  }
}
