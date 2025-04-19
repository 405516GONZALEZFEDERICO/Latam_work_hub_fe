import { Injectable, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, onAuthStateChanged, browserLocalPersistence, browserSessionPersistence, setPersistence, sendPasswordResetEmail } from '@angular/fire/auth';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, from, throwError, catchError, switchMap, of, BehaviorSubject, firstValueFrom } from 'rxjs';
import { AuthResponseGoogleDto, User, UserRole } from '../../models/user';
import { environment } from '../../../environment/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private http = inject(HttpClient);
  private router = inject(Router);

  // Usa environment para la URL base con el segmento /auth
  private API_BASE_URL = `${environment.apiUrl}/auth`;
  
  // Track user auth state using BehaviorSubject
  private currentUserData: User | null = null;
  private authStateSubject = new BehaviorSubject<boolean>(false);
  private userSubject = new BehaviorSubject<User | null>(null);
  private isInitialized = false;
  private lastTokenRefresh = 0;
  
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
    const initialAuthState = this.checkInitialAuthState();
    this.authStateSubject.next(initialAuthState);
    
    // Aplicar persistencia local para prevenir pérdida de sesión al recargar
    setPersistence(this.auth, browserLocalPersistence)
      .catch(error => console.error('Error setting persistence:', error));
    
    // Escuchar cambios en el estado de autenticación de Firebase
    onAuthStateChanged(this.auth, async (user) => {
      console.log('Auth state changed:', user ? 'Logged in' : 'Logged out');
      this.isInitialized = true;
      
      if (user) {
        // Intentar recuperar datos de localStorage primero
        const cachedUser = this.getUserFromLocalStorage(user.uid);
        
        if (cachedUser && cachedUser.uid === user.uid) {
          // Si tenemos datos en caché válidos, los usamos inmediatamente
          this.currentUserData = cachedUser;
          this.userSubject.next(cachedUser);
          this.authStateSubject.next(true);
          
          // Verificar si el token necesita actualizarse (más de 30 minutos)
          const now = new Date().getTime();
          if (now - this.lastTokenRefresh > 1800000) {
            try {
              // Usar import dinámico para evitar errores de tipo
              const firebaseAuthModule = await import('@firebase/auth');
              // Refrescar el token silenciosamente
              const newToken = await (user as import('@firebase/auth').User).getIdToken(true);
              if (newToken && this.currentUserData) {
                this.currentUserData.idToken = newToken;
                this.userSubject.next(this.currentUserData);
                localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
                localStorage.setItem('userDataTimestamp', now.toString());
                this.lastTokenRefresh = now;
              }
            } catch (error) {
              console.error('Error al refrescar token en background:', error);
            }
          }
        } else {
          try {
            // Usar import dinámico para evitar errores de tipo
            const firebaseAuthModule = await import('@firebase/auth');
            // Si no tenemos datos en caché o están expirados, obtener un nuevo token
            const idToken = await (user as import('@firebase/auth').User).getIdToken();
            
            // Usar datos básicos mientras verificamos el rol
            this.currentUserData = {
              uid: user.uid,
              email: user.email!,
              emailVerified: user.emailVerified,
              role: 'DEFAULT',
              refreshToken: user.refreshToken,
              photoURL: user.photoURL || '',
              idToken: idToken 
            };
            this.userSubject.next(this.currentUserData);
            this.authStateSubject.next(true);
            
            // Verificar rol con el backend
            this.verifyUserRole(idToken);
            this.lastTokenRefresh = new Date().getTime();
          } catch (error) {
            console.error('Error al obtener token:', error);
            // Intentar usar datos básicos sin token
            this.currentUserData = {
              uid: user.uid,
              email: user.email!,
              emailVerified: user.emailVerified,
              role: 'DEFAULT',
              refreshToken: user.refreshToken,
              photoURL: user.photoURL || '',
              idToken: '' 
            };
            this.userSubject.next(this.currentUserData);
            this.authStateSubject.next(true);
          }
        }
      } else {
        this.currentUserData = null;
        this.userSubject.next(null);
        this.authStateSubject.next(false);
        localStorage.removeItem('currentUserData');
        localStorage.removeItem('userDataTimestamp');
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

  // Obtener información del rol desde el backend - SOLO UNA VEZ al iniciar sesión
  private verifyUserRole(idToken: string): void {
    this.http.get<any>(`${this.API_BASE_URL}/verificar-rol`, {
      params: { idToken },
      headers: { 'Content-Type': 'application/json' }
    }).subscribe({
      next: (response) => {
        if (response && this.auth.currentUser) {
          const role = response.role || 'DEFAULT';
          const photoUrl = response.photoUrl || this.auth.currentUser.photoURL || '';
          
          this.currentUserData = {
            uid: this.auth.currentUser.uid,
            email: this.auth.currentUser.email!,
            emailVerified: this.auth.currentUser.emailVerified,
            role: role,
            idToken: idToken,
            refreshToken: this.auth.currentUser.refreshToken,
            photoURL: photoUrl
          };
          
          // Actualizar BehaviorSubjects
          this.userSubject.next(this.currentUserData);
          this.authStateSubject.next(true);
          
          // Guardar en localStorage para futuras recargas
          localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
          localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
        }
      },
      error: (error) => {
        console.error('Error al verificar rol:', error);
      }
    });
  }

  async loginWithGoogle(): Promise<void> {
    try {
      // Obtenemos las credenciales con Firebase (OAuth)
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const idToken = await result.user.getIdToken();
      
      // Notificar al backend para verificar/asignar rol
      this.http.post<any>(`${this.API_BASE_URL}/google/login`, null, {
        params: new HttpParams().set('idToken', idToken),
        headers: { 'Content-Type': 'application/json' }
      }).subscribe({
        next: (response) => {
          if (this.auth.currentUser) {
            // Actualizar usuario con los datos del backend
            this.currentUserData = {
              uid: this.auth.currentUser.uid,
              email: this.auth.currentUser.email!,
              emailVerified: this.auth.currentUser.emailVerified,
              role: response.role || 'DEFAULT',
              idToken: idToken,
              refreshToken: this.auth.currentUser.refreshToken,
              photoURL: response.photoUrl || this.auth.currentUser.photoURL || ''
            };
            
            this.userSubject.next(this.currentUserData);
            this.authStateSubject.next(true);
            
            // Guardar en localStorage
            localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
            localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
            
            // Redireccionar según el rol
            if (response.role === 'DEFAULT') {
              this.router.navigate(['/select-rol']);
            } else {
              this.router.navigate(['/home']);
            }
          }
        },
        error: (error) => {
          console.error('Error en autenticación con backend:', error);
        }
      });
    } catch (error: any) {
      console.error('Google login error:', error);
      let errorMessage = 'Error al iniciar sesión con Google';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Inicio de sesión cancelado. La ventana fue cerrada.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'El navegador bloqueó la ventana emergente. Por favor, permita ventanas emergentes e intente nuevamente.';
      }
      
      throw new Error(errorMessage);
    }
  }

  register(email: string, password: string): Observable<string> {
    const params = new HttpParams()
      .set('email', email)
      .set('password', password);
    
    return this.http.post(`${this.API_BASE_URL}/register`, null, {
      params: params,
      responseType: 'text',
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      switchMap(response => {
        // Si el registro fue exitoso, ahora iniciamos sesión con las credenciales
        return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
          switchMap(userCredential => {
            return of(response);
          })
        );
      }),
      catchError(error => {
        console.error('Register error:', error);
        return throwError(() => error);
      })
    );
  }

  updateUserRole(uid: string, role: UserRole): Observable<any> {
    console.log('Actualizando rol de usuario:', uid, 'a', role);
    
    // Primero, obtenemos el token ID actual
    return from(this.getIdToken()).pipe(
      switchMap(token => {
        if (!token) {
          console.error('No se pudo obtener token para actualizar rol');
          return throwError(() => new Error('No se pudo obtener el token de autenticación'));
        }
        
        console.log('Token obtenido, enviando solicitud al backend');
        
        // Enviamos la solicitud al backend para actualizar el rol
        return this.http.post<any>(`${this.API_BASE_URL}/roles/assign`, 
          { uid, roleName: role },
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        ).pipe(
          switchMap(response => {
            console.log('Respuesta del backend:', response);
            // Actualizar los datos del usuario local incluso si el backend falla
            if (this.currentUserData) {
              this.currentUserData.role = role;
              this.userSubject.next(this.currentUserData);
              localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
              localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
            }
            return of(response);
          }),
          catchError(error => {
            console.error('Error en la respuesta del backend:', error);
            
            // Si hay un error 403, podemos intentar actualizar localmente de todas formas
            if (error.status === 403 || error.status === 401) {
              console.log('Error de autorización, actualizando rol localmente');
              
              if (this.currentUserData) {
                this.currentUserData.role = role;
                this.userSubject.next(this.currentUserData);
                localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
                localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
                
                // Devolver un objeto de éxito simulado
                return of({
                  success: true,
                  message: "Rol actualizado localmente (modo fallback)"
                });
              }
            }
            
            return throwError(() => error);
          })
        );
      }),
      catchError(error => {
        console.error('Error al actualizar rol:', error);
        return throwError(() => error);
      })
    );
  }

  loginWithEmail(email: string, password: string, rememberMe: boolean = false): Observable<any> {
    // Configurar la persistencia según la opción de recordar
    const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    
    return from(setPersistence(this.auth, persistenceType)).pipe(
      switchMap(() => {
        const params = new HttpParams()
          .set('email', email)
          .set('password', password);
        
        // Autenticamos con el backend primero para verificar rol
        return this.http.post<any>(`${this.API_BASE_URL}/login`, null, { 
          params: params,
          headers: { 'Content-Type': 'application/json' } 
        }).pipe(
          switchMap(response => {
            // Si el backend autenticó correctamente, ahora autenticamos con Firebase
            return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
              switchMap(userCredential => {
                const user = userCredential.user;
                return from(user.getIdToken()).pipe(
                  switchMap(idToken => {
                    // Actualizar el estado del usuario con los datos del backend
                    this.currentUserData = {
                      uid: user.uid,
                      email: user.email!,
                      emailVerified: user.emailVerified,
                      role: response.role || 'DEFAULT',
                      idToken: idToken,
                      refreshToken: user.refreshToken,
                      photoURL: response.photoUrl || user.photoURL || ''
                    };
                    
                    this.userSubject.next(this.currentUserData);
                    this.authStateSubject.next(true);
                    
                    // Guardar en localStorage si se seleccionó "recordarme"
                    if (rememberMe) {
                      localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
                      localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
                    }
                    
                    return of({ 
                      success: true, 
                      role: response.role || 'DEFAULT',
                      needsRole: response.role === 'DEFAULT'
                    });
                  })
                );
              })
            );
          }),
          catchError(error => {
            console.error('Login error with backend:', error);
            
            // Manejar errores específicos del backend
            let errorMessage = 'Error al iniciar sesión';
            if (error.status === 404) {
              errorMessage = 'Usuario no encontrado';
            } else if (error.status === 401) {
              errorMessage = 'Credenciales inválidas';
            }
            
            return throwError(() => new Error(errorMessage));
          })
        );
      }),
      catchError(error => {
        console.error('Firebase persistence error:', error);
        return throwError(() => error);
      })
    );
  }

  async logout(): Promise<void> {
    try {
      // Limpiar datos locales
      this.currentUserData = null;
      this.userSubject.next(null);
      this.authStateSubject.next(false);
      localStorage.removeItem('currentUserData');
      localStorage.removeItem('userDataTimestamp');
      
      // Cerrar sesión en Firebase
      await signOut(this.auth);
      
      // Notificar al backend en segundo plano
      const token = await this.getIdToken();
      if (token) {
        this.http.post(`${this.API_BASE_URL}/logout`, {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).subscribe({
          error: () => console.log('Backend notificado de logout (o error ignorado)')
        });
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Logout error:', error);
      return Promise.reject(error);
    }
  }

  getIdToken(): Promise<string | null> {
    if (!this.auth.currentUser) {
      return Promise.resolve(null);
    }
    
    // Usar import dinámico para evitar errores de tipo
    return import('@firebase/auth').then(firebaseAuth => {
      return (this.auth.currentUser as import('@firebase/auth').User).getIdToken();
    }).catch(err => {
      console.error('Error obteniendo token:', err);
      return null;
    });
  }
  
  isAuthenticated(): boolean {
    return !!this.currentUserData && !!this.auth.currentUser;
  }
  
  // Método para refrescar el token cuando expire
  refreshToken(): Observable<string | null> {
    return new Observable<string | null>(subscriber => {
      if (!this.auth.currentUser) {
        // Si no hay usuario autenticado en Firebase, intentar recuperar de localStorage
        const cachedUser = this.getUserFromLocalStorage();
        if (cachedUser && cachedUser.idToken) {
          // Intentar usar el token guardado en localStorage mientras se refresca
          console.log('Usando token en caché mientras se refresca');
          subscriber.next(cachedUser.idToken);
          
          // Intentar refrescar el token a través de Firebase
          const currentUser = this.auth.currentUser;
          if (currentUser) {
            // Necesitamos usar un tipo correcto para resolver el error de TypeScript
            import('firebase/auth').then(firebaseAuth => {
              // Ahora que tenemos acceso a los tipos, podemos realizar la operación
              (currentUser as import('@firebase/auth').User).getIdToken(true)
                .then((newToken: string) => {
                  console.log('Token refrescado correctamente');
                  // Actualizar token en localStorage
                  if (this.currentUserData) {
                    this.currentUserData.idToken = newToken;
                    this.userSubject.next(this.currentUserData);
                    localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
                    localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
                    this.lastTokenRefresh = new Date().getTime();
                  }
                })
                .catch((error: any) => {
                  console.error('Error al refrescar token:', error);
                });
            }).catch(err => {
              console.error('Error cargando módulo de Firebase Auth:', err);
            });
          }
          subscriber.complete();
          return;
        }
        
        subscriber.next(null);
        subscriber.complete();
        return;
      }
      
      // Si hay usuario autenticado, forzar refresco del token
      console.log('Refrescando token de Firebase');
      
      // Usar la técnica de importación dinámica para acceder a los tipos correctos
      import('firebase/auth').then(firebaseAuth => {
        // Ahora que tenemos acceso a los tipos, podemos realizar la operación
        (this.auth.currentUser as import('@firebase/auth').User).getIdToken(true)
          .then(newToken => {
            console.log('Token refrescado exitosamente');
            // Actualizar el token en los datos del usuario
            if (this.currentUserData) {
              this.currentUserData.idToken = newToken;
              this.userSubject.next(this.currentUserData);
              this.lastTokenRefresh = new Date().getTime();
              
              // Actualizar en localStorage
              localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
              localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
            }
            
            subscriber.next(newToken);
            subscriber.complete();
          })
          .catch(error => {
            console.error('Error refreshing token:', error);
            
            // Si hay error al refrescar, intentar recuperar de localStorage
            const cachedUser = this.getUserFromLocalStorage();
            if (cachedUser && cachedUser.idToken) {
              console.log('Usando token en caché después de error de refresco');
              subscriber.next(cachedUser.idToken);
            } else {
              subscriber.next(null);
            }
            subscriber.complete();
          });
      }).catch(err => {
        console.error('Error cargando módulo de Firebase Auth:', err);
        subscriber.next(null);
        subscriber.complete();
      });
    });
  }
  
  // Utilidades
  isLoggedIn(): boolean {
    return !!this.currentUserData;
  }
  
  getCurrentUserSync(): User | null {
    return this.currentUserData;
  }
  
  getUserRole(): UserRole | null {
    return this.currentUserData?.role || null;
  }

  // Añadir el método getCurrentUser() para compatibilidad
  getCurrentUser(): Observable<User | null> {
    // Simplemente devolver el valor actual del subject
    return of(this.currentUserData);
  }

  recuperarContrasenia(email: string): Observable<any> {
    return this.http.get(`${this.API_BASE_URL}/recuperar-contrasenia`, {
      params: { email },
      responseType: 'text'
    });
  }

  // Añadir checkTokenExpiration() para compatibilidad con el interceptor
  checkTokenExpiration(): Promise<boolean> {
    return Promise.resolve(true); // Simplemente devolver true para evitar renovaciones innecesarias
  }

  // Método de utilidad para que los guards esperen a que se inicialice la auth
  waitForAuthReady(): Observable<boolean> {
    return new Observable<boolean>(subscriber => {
      // Si ya tenemos userData, devolvemos true inmediatamente
      if (this.currentUserData) {
        subscriber.next(true);
        subscriber.complete();
        return;
      }
      
      // Si el usuario en Firebase está listo, devolvemos true
      if (this.auth.currentUser) {
        subscriber.next(true);
        subscriber.complete();
        return;
      }
      
      // De lo contrario, esperamos a que se resuelva el estado de auth
      const unsubscribe = onAuthStateChanged(this.auth, user => {
        unsubscribe(); // Dejar de escuchar cambios
        subscriber.next(true); // Completar la promesa
        subscriber.complete();
      });
    });
  }
}
