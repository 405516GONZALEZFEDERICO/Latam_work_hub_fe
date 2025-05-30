import { Injectable, inject, runInInjectionContext, EnvironmentInjector, NgZone } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, onAuthStateChanged, browserLocalPersistence, browserSessionPersistence, setPersistence, sendPasswordResetEmail } from '@angular/fire/auth';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, from, throwError, catchError, switchMap, of, BehaviorSubject, firstValueFrom, map } from 'rxjs';
import { AuthResponseGoogleDto, User, UserRole } from '../../models/user';
import { environment } from '../../../environment/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private http = inject(HttpClient);
  private router = inject(Router);
  private environmentInjector = inject(EnvironmentInjector);
  private ngZone = inject(NgZone);

  // Usa environment para la URL base con el segmento /auth
  private API_BASE_URL = `${environment.apiUrl}/auth`;
  
  // Track user auth state using BehaviorSubject
  private currentUserData: User | null = null;
  private authStateSubject = new BehaviorSubject<boolean>(false);
  private userSubject = new BehaviorSubject<User | null>(null);
  private isInitialized = false;
  private lastTokenRefresh = 0;
  private persistenceInitialized = false;
  
  // Public observables that components can subscribe to
  public authState$ = this.authStateSubject.asObservable();
  public currentUser$ = this.userSubject.asObservable();
  
  // Check initial auth state from localStorage
  private checkInitialAuthState(): boolean {
    try {
      const userData = localStorage.getItem('currentUserData');
      const timestamp = localStorage.getItem('userDataTimestamp');
      
      if (userData && timestamp) {
        const user = JSON.parse(userData);
        
        // Verificar si los datos tienen más de 24 horas (mayor margen para ser compatible con tokens refresh)
        const now = new Date().getTime();
        const parsedTimestamp = parseInt(timestamp);
        const hoursElapsed = (now - parsedTimestamp) / (1000 * 60 * 60);
        
        if (hoursElapsed <= 24) {
          this.currentUserData = user;
          this.userSubject.next(user);
          return true;
        } else {
          localStorage.removeItem('currentUserData');
          localStorage.removeItem('userDataTimestamp');
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
    
    // Escuchar cambios en el estado de autenticación de Firebase de forma segura
    this.ngZone.runOutsideAngular(() => {
      onAuthStateChanged(this.auth, async (user) => {
        this.ngZone.run(() => {
          this.isInitialized = true;
          
          if (user) {
            // Verificar si hay un conflicto entre el usuario en Firebase y el usuario en localStorage
            const storedUser = localStorage.getItem('currentUserData');
            if (storedUser) {
              try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser.uid !== user.uid) {
                  // Limpiar localStorage para prevenir conflictos
                  localStorage.removeItem('currentUserData');
                  localStorage.removeItem('userDataTimestamp');
                }
              } catch (e) {
                console.error('Error al verificar conflicto de usuarios:', e);
              }
            }
            
            // Intentar recuperar datos de localStorage primero
            const cachedUser = this.getUserFromLocalStorage(user.uid);
            
            if (cachedUser && cachedUser.uid === user.uid) {
              // Si tenemos datos en caché válidos, los usamos inmediatamente
              this.currentUserData = cachedUser;
              this.userSubject.next(cachedUser);
              this.authStateSubject.next(true);
              
              // Asegurar que esté actualizado en localStorage (por si acaso)
              localStorage.setItem('currentUserData', JSON.stringify(cachedUser));
              localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
              
              // Verificar si el token necesita actualizarse (más de 30 minutos)
              const now = new Date().getTime();
              if (now - this.lastTokenRefresh > 1800000) {
                try {
                  // Refrescar el token silenciosamente
                  user.getIdToken(true).then(newToken => {
                    if (newToken && this.currentUserData) {
                      this.currentUserData.idToken = newToken;
                      this.userSubject.next(this.currentUserData);
                      localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
                      localStorage.setItem('userDataTimestamp', now.toString());
                      this.lastTokenRefresh = now;
                    }
                  });
                } catch (error) {
                  console.error('Error al refrescar token en background:', error);
                }
              }
            } else {
              try {
                // Si no tenemos datos en caché o están expirados, obtener un nuevo token
                user.getIdToken().then(idToken => {
                  // Intentar recuperar el rol anterior de localStorage
                  const cachedUser = this.getUserFromLocalStorage(user.uid);
                  const previousRole = cachedUser?.role || 'DEFAULT';
                  
                  // Usar datos básicos mientras verificamos el rol
                  this.currentUserData = {
                    uid: user.uid,
                    email: user.email!,
                    emailVerified: user.emailVerified,
                    role: previousRole, // Usar el rol previo si existe, no DEFAULT automáticamente
                    refreshToken: user.refreshToken,
                    photoURL: user.photoURL || '',
                    idToken: idToken 
                  };
                  this.userSubject.next(this.currentUserData);
                  this.authStateSubject.next(true);
                  
                  // Verificar rol con el backend
                  this.verifyUserRole(idToken);
                  this.lastTokenRefresh = new Date().getTime();
                });
              } catch (error) {
                console.error('Error al obtener token:', error);
                // Intentar usar datos básicos sin token
                this.currentUserData = {
                  uid: user.uid,
                  email: user.email!,
                  emailVerified: user.emailVerified,
                  role: 'DEFAULT' as UserRole,
                  refreshToken: user.refreshToken,
                  photoURL: user.photoURL || '',
                  idToken: '' 
                };
                this.userSubject.next(this.currentUserData);
                this.authStateSubject.next(true);
              }
            }
          } else {
            // No hay usuario en Firebase, pero podría haber en localStorage
            const cachedUser = this.getUserFromLocalStorage();
            
            if (cachedUser && this.isTokenValid(cachedUser)) {
              this.currentUserData = cachedUser;
              this.userSubject.next(cachedUser);
              this.authStateSubject.next(true);
              
              // No limpiamos localStorage para permitir futuras restauraciones
              return;
            }
            
            // Si no hay usuario en caché o su token no es válido, limpiar todo
            this.currentUserData = null;
            this.userSubject.next(null);
            this.authStateSubject.next(false);
            localStorage.removeItem('currentUserData');
            localStorage.removeItem('userDataTimestamp');
          }
        });
      });
    });
  }
  
  // Método privado para configurar la persistencia (solo una vez)
  private async ensurePersistenceSet(): Promise<void> {
    // Solo marcar como inicializado sin intentar configurar persistence
    this.persistenceInitialized = true;
    return Promise.resolve();
  }
  
  // Obtener información del rol desde localStorage
  private getUserFromLocalStorage(uid?: string): User | null {
    try {
      const userData = localStorage.getItem('currentUserData');
      if (!userData) return null;
      
      const parsedUser = JSON.parse(userData);

      // Verificar que sea el mismo usuario si se proporciona un UID
      if (uid && parsedUser.uid !== uid) {
        return null;
      }
      
      // Comprobar si los datos tienen más de 24 horas (en lugar de 1 hora)
      const timestamp = localStorage.getItem('userDataTimestamp');
      if (timestamp) {
        const now = new Date().getTime();
        const hoursElapsed = (now - parseInt(timestamp)) / (1000 * 60 * 60);
        
        if (hoursElapsed > 24) {
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
    // Verificar si estamos en una ruta pública (login/register) y evitar la verificación
    const currentPath = window.location.pathname;
    if (currentPath.includes('/login') || currentPath.includes('/register')) {
      return;
    }
    
    // Verificar que el usuario actual en Firebase coincida con lo que tenemos en localStorage
    const currentFirebaseUid = this.auth.currentUser?.uid;
    const cachedUser = this.getUserFromLocalStorage();
    
    if (cachedUser && currentFirebaseUid && cachedUser.uid !== currentFirebaseUid) {
      // Hay un usuario diferente al almacenado - limpiar localStorage para evitar confusión
      localStorage.removeItem('currentUserData');
      localStorage.removeItem('userDataTimestamp');
    }
    
    // Intentar recuperar los datos de localStorage primero
    const cachedUserFromLocalStorage = this.getUserFromLocalStorage();
    if (cachedUserFromLocalStorage && cachedUserFromLocalStorage.role && cachedUserFromLocalStorage.role !== 'DEFAULT') {
      // Si ya tiene un rol válido en localStorage, usarlo inmediatamente
      this.currentUserData = cachedUserFromLocalStorage;
      this.userSubject.next(cachedUserFromLocalStorage);
      this.authStateSubject.next(true);
      
      // De todas formas verificar con el backend, pero no esperar la respuesta para continuar
      this.http.get<any>(`${this.API_BASE_URL}/verificar-rol`, {
        params: { idToken },
        headers: { 'Content-Type': 'application/json' }
      }).subscribe({
        next: (response) => {
          if (response && this.auth.currentUser && response.role) {
            if (response.role !== cachedUserFromLocalStorage.role) {
              // Solo actualizar si el rol cambió
              this.currentUserData = {
                ...this.currentUserData,
                role: response.role as UserRole
              } as User;
              this.userSubject.next(this.currentUserData);
              
              // Actualizar localStorage
              localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
              localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
            }
          }
        },
        error: (error) => {
          console.error('Error al verificar rol con backend:', error);
          // Seguir usando el rol de localStorage en caso de error
        }
      });
      
      return;
    }
    
    // Si no hay datos en caché o el rol es DEFAULT, verificar con el backend
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
            role: role as UserRole,
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
          
          // Redireccionar según el rol
          if (role === 'DEFAULT') {
            this.navigateToRoleSelection();
          } else {
            this.router.navigate(['/home']);
          }
        }
      },
      error: (error) => {
        console.error('Error al verificar rol con backend:', error);
      }
    });
  }
  async loginWithGoogle(isRegistration: boolean = false): Promise<void> {
    try {
    // Clear storages first
      await this.clearAllStorages();
      
    // 1. Get Firebase credentials (but don't store them yet)
    const provider = new GoogleAuthProvider();
      if (isRegistration) {
        provider.setCustomParameters({ prompt: 'select_account' });
      }
      
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();
      
    try {
      // 2. Validate with backend FIRST - Make this a blocking call
      const backendValidation = await this.http.post<any>(`${this.API_BASE_URL}/google/login`, null, {
        params: new HttpParams()
          .set('idToken', idToken)
          .set('isRegistration', isRegistration ? 'true' : 'false'),
        headers: { 'Content-Type': 'application/json' }
      }).toPromise();

          if (this.auth.currentUser) {
            // Verificar si ya existe un rol en localStorage
            const cachedUser = this.getUserFromLocalStorage(this.auth.currentUser.uid);
        const roleFromBackend = backendValidation?.role || 'DEFAULT';
            const persistedRole = cachedUser?.role;
            
            // Priorizar el rol persistido si es diferente a DEFAULT y el backend devuelve DEFAULT
            let finalRole: string;
            
            if (isRegistration) {
              // Si es registro, siempre usar DEFAULT para forzar selección de rol
              finalRole = 'DEFAULT';
            } else {
              // Si es login, usar lógica normal
              finalRole = (roleFromBackend === 'DEFAULT' && persistedRole && persistedRole !== 'DEFAULT')
                ? persistedRole
                : roleFromBackend;
            }
              
            // Actualizar usuario con los datos del backend
            this.currentUserData = {
              uid: this.auth.currentUser.uid,
              email: this.auth.currentUser.email!,
              emailVerified: this.auth.currentUser.emailVerified,
              role: finalRole as UserRole,
              idToken: idToken,
              refreshToken: this.auth.currentUser.refreshToken,
          photoURL: backendValidation?.photoUrl || this.auth.currentUser.photoURL || ''
            };
            
            this.userSubject.next(this.currentUserData);
            this.authStateSubject.next(true);
            
            // Guardar en localStorage siempre
            localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
            localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
            
            // Si es un registro o tiene rol DEFAULT, redirigir a selección de rol
            if (isRegistration || finalRole === 'DEFAULT') {
              // Usar método directo para evitar problemas de ruteo
              this.navigateToRoleSelection();
            } else {
              this.router.navigate(['/home']);
            }
          } else {
            throw new Error('No se pudo completar el proceso de autenticación.');
          }
    } catch (error) {
          console.error('Error en autenticación con backend:', error);
          // Verificar si es un error de ruta
      if (error && (error as any).message && ((error as any).message.includes('select-rol') || (error as any).message.includes('select-role'))) {
            this.handleRouteError(error);
          } else {
            // Manejo genérico de errores
            console.error('Error desconocido en proceso de autenticación:', error);
            
            // Incluso con error, intentar navegar según corresponda
            const user = this.auth.currentUser;
            if (user) {
              
              // Crear datos mínimos del usuario
              this.currentUserData = {
                uid: user.uid,
                email: user.email!,
                emailVerified: user.emailVerified,
                role: 'DEFAULT' as UserRole, // Asignar DEFAULT como fallback
                refreshToken: user.refreshToken,
                photoURL: user.photoURL || '',
                idToken: '' 
              };
              
              // Actualizar el estado
              this.userSubject.next(this.currentUserData);
              this.authStateSubject.next(true);
              
              // Guardar en localStorage
              localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
              localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
              
              // Redirigir a selección de rol en caso de error
              this.navigateToRoleSelection();
            } else {
              throw new Error('Error en autenticación y no hay usuario disponible');
            }
          }
        }
    } catch (error: any) {
      console.error('Error crítico en proceso de Google auth:', error);
      
      let errorMessage = 'Error al procesar la autenticación con Google';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Proceso cancelado. La ventana fue cerrada.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'El navegador bloqueó la ventana emergente. Por favor, permita ventanas emergentes e intente nuevamente.';
      } else if (error.message && (error.message.includes('select-rol') || error.message.includes('select-role'))) {
        // Error de ruta - intentar redirigir a la ruta correcta
        this.navigateToRoleSelection();
        return;
      }
      
      throw new Error(errorMessage);
    }
  }

  register(email: string, password: string): Observable<string> {
    return from(this.ensurePersistenceSet()).pipe(
      switchMap(() => {
        const params = new HttpParams()
          .set('email', email)
          .set('password', password);
        
        return this.http.post(`${this.API_BASE_URL}/register`, null, {
          params: params,
          responseType: 'text',
          headers: { 'Content-Type': 'application/json' }
        }).pipe(
          switchMap(response => {
            // Use ngZone and runInInjectionContext for Firebase operations
            return from(new Promise<string>((resolve, reject) => {
              this.ngZone.runOutsideAngular(() => {
                runInInjectionContext(this.environmentInjector, () => {
                  // Si el registro fue exitoso, ahora iniciamos sesión con las credenciales
                  signInWithEmailAndPassword(this.auth, email, password)
                    .then(userCredential => {
                      this.ngZone.run(() => {
                        resolve(response);
                      });
                    })
                    .catch(error => {
                      this.ngZone.run(() => {
                        console.error('Error signing in after registration:', error);
                        reject(error);
                      });
                    });
                });
              });
            }));
          }),
          catchError(error => {
            console.error('Register error:', error);
            return throwError(() => error);
          })
        );
      })
    );
  }

  updateUserRole(uid: string, role: UserRole, adminKey?: string): Observable<any> {
    
    // Primero, obtenemos el token ID actual
    return from(this.getIdToken()).pipe(
      switchMap(token => {
        if (!token) {
          console.error('No se pudo obtener token para actualizar rol');
          return throwError(() => new Error('No se pudo obtener el token de autenticación'));
        }
        
        // Crear objeto de solicitud con o sin adminKey
        const requestData: any = { uid, roleName: role };
        if (adminKey) {
          requestData.adminKey = adminKey;
        }
        
        // Enviamos la solicitud al backend para actualizar el rol
        return this.http.post<any>(`${this.API_BASE_URL}/roles/assign`, 
          requestData,
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        ).pipe(
          switchMap(response => {
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

  loginWithEmail(email: string, password: string): Observable<any> {
    // Add at the start of login methods
    return from(this.ensurePersistenceSet()).pipe(
      switchMap(() => {
        this.clearAllStorages();
        
        const params = new HttpParams()
          .set('email', email)
          .set('password', password);
        
        return this.http.post<any>(`${this.API_BASE_URL}/login`, null, { 
          params: params,
          headers: { 'Content-Type': 'application/json' } 
        }).pipe(
          switchMap(response => {
            // Use ngZone and runInInjectionContext for Firebase operations
            return from(new Promise<any>((resolve, reject) => {
              this.ngZone.runOutsideAngular(() => {
                runInInjectionContext(this.environmentInjector, () => {
                  signInWithEmailAndPassword(this.auth, email, password)
                    .then(userCredential => {
                      this.ngZone.run(() => {
                        // Verificar si hay un usuario diferente en localStorage y limpiarlo
                        const cachedUser = this.getUserFromLocalStorage();
                        if (cachedUser && cachedUser.uid !== userCredential.user.uid) {
                          localStorage.removeItem('currentUserData');
                          localStorage.removeItem('userDataTimestamp');
                        }
                        
                        // Get token
                        userCredential.user.getIdToken()
                          .then(idToken => {
                            // Verificar si ya existe un rol en localStorage
                            const cachedUser = this.getUserFromLocalStorage(userCredential.user.uid);
                            const roleFromBackend = response.role || 'DEFAULT';
                            const persistedRole = cachedUser?.role;
                            
                            // Priorizar el rol persistido si es diferente a DEFAULT y el backend devuelve DEFAULT
                            const finalRole = (roleFromBackend === 'DEFAULT' && persistedRole && persistedRole !== 'DEFAULT')
                              ? persistedRole
                              : roleFromBackend;
                              
                            // Actualizar el estado del usuario con los datos del backend
                            this.currentUserData = {
                              uid: userCredential.user.uid,
                              email: userCredential.user.email!,
                              emailVerified: userCredential.user.emailVerified,
                              role: finalRole as UserRole,
                              idToken: idToken,
                              refreshToken: userCredential.user.refreshToken,
                              photoURL: response.photoUrl || userCredential.user.photoURL || ''
                            };
                            
                            this.userSubject.next(this.currentUserData);
                            this.authStateSubject.next(true);
                            
                            // Siempre guardar en localStorage, independientemente de rememberMe
                            localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
                            localStorage.setItem('userDataTimestamp', new Date().getTime().toString());

                            // Determinar la ruta basada en el rol
                            if (finalRole === 'DEFAULT') {
                              this.navigateToRoleSelection();
                            } else {
                              this.router.navigate(['/home']);
                            }
                            
                            resolve({ 
                              success: true, 
                              role: finalRole,
                              needsRole: finalRole === 'DEFAULT'
                            });
                          })
                          .catch(error => {
                            console.error('Error getting token:', error);
                            reject(error);
                          });
                      });
                    })
                    .catch(error => {
                      this.ngZone.run(() => {
                        console.error('Error signing in:', error);
                        reject(error);
                      });
                    });
                });
              });
            }));
          })
        );
      })
    );
  }

  async logout(): Promise<void> {
    try {
      // Clear all Firebase auth state within the proper injection context
      await new Promise<void>((resolve) => {
        // Usar directamente runInInjectionContext sin ngZone
        runInInjectionContext(this.environmentInjector, async () => {
          try {
            await signOut(this.auth);
            
            // Clear all local state
            this.currentUserData = null;
            this.userSubject.next(null);
            this.authStateSubject.next(false);
            
            // Clear localStorage comprehensively
            await this.clearAllStorages();
            
            // Force navigation
            window.location.href = '/login';
            resolve();
          } catch (error) {
            console.error('Logout error:', error);
            // Even if there's an error, try to clean up
            await this.clearAllStorages();
            window.location.href = '/login';
            resolve();
          }
        });
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, try to clean up
      await this.clearAllStorages();
      window.location.href = '/login';
      return Promise.reject(error);
    }
  }

  private async clearAllStorages(): Promise<void> {
    // Clear standard storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear Firebase-specific tokens and OAuth state
    try {
      // Limpiar específicamente datos relacionados con Firebase
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
            key.includes('firebase') || 
            key.includes('firebaseui') || 
            key.includes('auth') ||
            key.includes('token') ||
            key.includes('oauth')
        )) {
          localStorage.removeItem(key);
          i--; // Ajustar índice después de eliminar
        }
      }
    } catch (e) {
      console.error('Error limpiando datos específicos de Firebase:', e);
    }
    
    // Clear IndexedDB
    try {
      const databases = await window.indexedDB.databases();
      databases.forEach(db => {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
        }
      });
    } catch (e) {
      console.error('Error limpiando IndexedDB:', e);
    }
    
    // Clear cookies
    try {
      document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    } catch (e) {
      console.error('Error limpiando cookies:', e);
    }
  }

  updateCurrentUser(user: User): void {
    this.currentUserData = user; // Actualiza el usuario localmente
    this.userSubject.next(user); // Notifica a los observadores
    localStorage.setItem('currentUserData', JSON.stringify(user)); // Guarda en localStorage
  }

  getIdToken(): Promise<string | null> {
    if (!this.auth.currentUser) {
      // Si no hay usuario activo en Firebase, intentar obtener el token de localStorage
      const cachedUser = this.getUserFromLocalStorage();
      if (cachedUser && cachedUser.idToken && this.isTokenValid(cachedUser)) {
        return Promise.resolve(cachedUser.idToken);
      }
      return Promise.resolve(null);
    }
    
    // Usar injection context para operaciones de Firebase
    return new Promise((resolve) => {
      runInInjectionContext(this.environmentInjector, () => {
        import('@firebase/auth').then(firebaseAuth => {
          if (this.auth.currentUser) {
            (this.auth.currentUser as import('@firebase/auth').User).getIdToken()
              .then(token => resolve(token))
              .catch(() => resolve(null));
          } else {
            resolve(null);
          }
        }).catch(() => resolve(null));
      });
    });
  }
  
  isAuthenticated(): boolean {
    // Si hay usuario en currentUserData, considerarlo autenticado
    if (this.currentUserData) {
      return true;
    }
    
    // Si hay usuario en Firebase, considerarlo autenticado
    if (this.auth.currentUser) {
      return true;
    }
    
    // Intentar recuperar desde localStorage como último recurso
    const cachedUser = this.getUserFromLocalStorage();
    if (cachedUser && this.isTokenValid(cachedUser)) {
      // Restaurar el estado desde localStorage
      this.currentUserData = cachedUser;
      this.userSubject.next(cachedUser);
      this.authStateSubject.next(true);
      return true;
    }
    
    // Si ninguna de las condiciones anteriores se cumple, no está autenticado
    return false;
  }
  
  // Método para refrescar el token cuando expire
  refreshToken(): Observable<string | null> {
    return new Observable<string | null>(subscriber => {
      // Caso 1: Hay usuario en Firebase, intentar refrescar directamente
      if (this.auth.currentUser) {
        
        // Usar runInInjectionContext para operaciones de Firebase
        runInInjectionContext(this.environmentInjector, () => {
          import('firebase/auth').then(firebaseAuth => {
            if (this.auth.currentUser) {
              (this.auth.currentUser as import('@firebase/auth').User).getIdToken(true)
                .then(newToken => {
                  
                  // Actualizar el token en los datos del usuario
                  if (this.currentUserData) {
                    this.currentUserData.idToken = newToken;
                    this.userSubject.next(this.currentUserData);
                    this.lastTokenRefresh = new Date().getTime();
                    
                    // Actualizar en localStorage para mantener persistencia entre pestañas
                    localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
                    localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
                  }
                  
                  subscriber.next(newToken);
                  subscriber.complete();
                })
                .catch(error => {
                  console.error('Error refrescando token en Firebase:', error);
                  this.tryRecoverFromLocalStorage(subscriber);
                });
            } else {
              this.tryRecoverFromLocalStorage(subscriber);
            }
          }).catch(err => {
            console.error('Error cargando módulo de Firebase Auth:', err);
            this.tryRecoverFromLocalStorage(subscriber);
          });
        });
        
        return;
      }
      
      // Caso 2: No hay usuario en Firebase, intentar recuperar de localStorage
      this.tryRecoverFromLocalStorage(subscriber);
    });
  }
  
  // Método auxiliar para intentar usar token de localStorage
  private tryRecoverFromLocalStorage(subscriber: any): void {
    const cachedUser = this.getUserFromLocalStorage();
    
    if (cachedUser && cachedUser.idToken) {
      
      // No intentamos reconectar automáticamente con Firebase aquí
      // ya que requeriría la contraseña que no tenemos almacenada
      
      subscriber.next(cachedUser.idToken);
    } else {
      subscriber.next(null);
    }
    
    subscriber.complete();
  }
  
  // Utilidades
  isLoggedIn(): boolean {
    return !!this.currentUserData;
  }
  
  // Método sincrónico para obtener el usuario actual (inmediato)
  getCurrentUserSync(): User | null {
    // Si no hay datos, intentar cargar desde localStorage
    if (!this.currentUserData) {
      const userData = localStorage.getItem('currentUserData');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          return user;
        } catch (e) {
          console.error('Error parseando datos del usuario:', e);
        }
      }
    }
    return this.currentUserData;
  }
  
  getUserRole(): UserRole | null {
    return this.currentUserData?.role || null;
  }

  // Método para cambiar el rol de un usuario (solo para administradores)
  changeUserRole(uid: string, roleName: UserRole): Observable<any> {
    return from(this.getIdToken()).pipe(
      switchMap(token => {
        if (!token) {
          console.error('No se pudo obtener token para cambiar rol');
          return throwError(() => new Error('No se pudo obtener el token de autenticación'));
        }
        
        const roleChangeDto = { uid, roleName };
        
        return this.http.post<any>(`${this.API_BASE_URL}/change-rol`, 
          roleChangeDto,
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
      }),
      catchError(error => {
        console.error('Error al cambiar rol:', error);
        return throwError(() => error);
      })
    );
  }

  // Añadir el método getCurrentUser() para compatibilidad
  getCurrentUser(): Observable<User | null> {
    return this.currentUser$;
  }

  getUserProfile(): Observable<User | null> {
    return this.currentUser$;
  }
  
  recuperarContrasenia(email: string): Observable<any> {
    return this.http.get<string>(`${this.API_BASE_URL}/recuperar-contrasenia`, {
      params: { email },
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      catchError(error => {
        console.error('Error al solicitar recuperación de contraseña:', error);
        return throwError(() => error);
      })
    );
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
      
      // Intentar recuperar desde localStorage
      const cachedUser = this.getUserFromLocalStorage();
      if (cachedUser && this.isTokenValid(cachedUser)) {
        this.currentUserData = cachedUser;
        this.userSubject.next(cachedUser);
        this.authStateSubject.next(true);
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

  // Determinar si un token aún podría ser válido
  private isTokenValid(user: User): boolean {
    try {
      if (!user.idToken) return false;
      
      // Verificar si hay marca de tiempo
      const timestamp = localStorage.getItem('userDataTimestamp');
      if (!timestamp) return false;
      
      const tokenDate = new Date(parseInt(timestamp));
      const now = new Date();
      
      // Considerar válido si tiene menos de 24 horas (generalmente tokens de Firebase duran 1 hora)
      const hoursElapsed = (now.getTime() - tokenDate.getTime()) / (1000 * 60 * 60);
      
      // Si han pasado menos de 24 horas, considerarlo potencialmente válido
      // El interceptor HTTP se encargará de manejar errores si realmente expiró
      return hoursElapsed < 24;
    } catch (e) {
      return false;
    }
  }

  // Método para limpiar explícitamente el caché de autenticación
  clearAuthCache(): void {
    
    // Limpiar datos en memoria
    this.currentUserData = null;
    this.userSubject.next(null);
    
    // Limpiar localStorage
    localStorage.removeItem('currentUserData');
    localStorage.removeItem('userDataTimestamp');
    
    // Limpiar datos relacionados con Firebase
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('firebase') || key.includes('firebaseui') || key.includes('auth'))) {
        localStorage.removeItem(key);
        i--; // Ajustar índice después de eliminar
      }
    }
    
  }

  // Método para manejar errores de ruta conocidos
  handleRouteError(error: any): void {
    if (error && error.message && (error.message.includes('select-rol') || error.message.includes('select-role'))) {
      // Forzar redirección a la URL correcta
      this.navigateToRoleSelection();
    }
  }

  navigateToRoleSelection(): void {
    
    setTimeout(() => {
      this.router.navigate(['/select-role']).then(success => { // Changed from '/select-rol' to '/select-role'
        if (!success) {
          console.warn('Navegación con Angular Router falló, usando redirección directa');
          window.location.href = window.location.origin + '/select-role';
        }
      }).catch(err => {
        console.error('Error al navegar con router:', err);
        window.location.href = window.location.origin + '/select-role';
      });
    }, 100);
  }
}
