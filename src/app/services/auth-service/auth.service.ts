import { Injectable, inject, runInInjectionContext, EnvironmentInjector, NgZone } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, onAuthStateChanged, browserLocalPersistence, browserSessionPersistence, setPersistence, sendPasswordResetEmail } from '@angular/fire/auth';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, from, throwError, catchError, switchMap, of, BehaviorSubject, firstValueFrom, map, interval, timer } from 'rxjs';
import { AuthResponseGoogleDto, User, UserRole } from '../../models/user';
import { environment } from '../../../environment/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private http = inject(HttpClient);
  private router = inject(Router);
  private environmentInjector = inject(EnvironmentInjector);
  private ngZone = inject(NgZone);

  private API_BASE_URL = `${environment.apiUrl}/auth`;
  
  private currentUserData: User | null = null;
  private authStateSubject = new BehaviorSubject<boolean>(false);
  private userSubject = new BehaviorSubject<User | null>(null);
  private isInitialized = false;
  private lastTokenRefresh = 0;
  private persistenceInitialized = false;
  private tokenRefreshTimer: any = null;
  
  public authState$ = this.authStateSubject.asObservable();
  public currentUser$ = this.userSubject.asObservable();
  
  private checkInitialAuthState(): boolean {
    try {
      const userData = localStorage.getItem('currentUserData');
      const timestamp = localStorage.getItem('userDataTimestamp');
      
      if (userData && timestamp) {
        const user = JSON.parse(userData);
        
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
      return false;
    }
  }

  constructor() {
    const initialAuthState = this.checkInitialAuthState();
    this.authStateSubject.next(initialAuthState);
    
    this.ngZone.runOutsideAngular(() => {
      onAuthStateChanged(this.auth, async (user) => {
        this.ngZone.run(() => {
          this.isInitialized = true;
          
          if (user) {
            const storedUser = localStorage.getItem('currentUserData');
            if (storedUser) {
              try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser.uid !== user.uid) {
                  localStorage.removeItem('currentUserData');
                  localStorage.removeItem('userDataTimestamp');
                }
              } catch (e) {
              }
            }
            
            const cachedUser = this.getUserFromLocalStorage(user.uid);
            
            if (cachedUser && cachedUser.uid === user.uid) {
              this.currentUserData = cachedUser;
              this.userSubject.next(cachedUser);
              this.authStateSubject.next(true);
              
              localStorage.setItem('currentUserData', JSON.stringify(cachedUser));
              localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
              
              this.startTokenRefreshTimer();
              
              const now = new Date().getTime();
              if (now - this.lastTokenRefresh > 1800000) {
                try {
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
                }
              }
            } else {
              try {
                user.getIdToken().then(idToken => {
                  const cachedUser = this.getUserFromLocalStorage(user.uid);
                  const previousRole = cachedUser?.role || 'DEFAULT';
                  
                  this.currentUserData = {
                    uid: user.uid,
                    email: user.email!,
                    emailVerified: user.emailVerified,
                    role: previousRole,
                    refreshToken: user.refreshToken,
                    photoURL: user.photoURL || '',
                    idToken: idToken 
                  };
                  this.userSubject.next(this.currentUserData);
                  this.authStateSubject.next(true);
                  
                  this.startTokenRefreshTimer();
                  
                  this.verifyUserRole(idToken);
                  this.lastTokenRefresh = new Date().getTime();
                });
              } catch (error) {
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
            const cachedUser = this.getUserFromLocalStorage();
            
            if (cachedUser && this.isTokenValid(cachedUser)) {
              this.currentUserData = cachedUser;
              this.userSubject.next(cachedUser);
              this.authStateSubject.next(true);
              
              this.startTokenRefreshTimer();
              
              return;
            }
            
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
  
  private async ensurePersistenceSet(): Promise<void> {
    this.persistenceInitialized = true;
    return Promise.resolve();
  }
  
  private getUserFromLocalStorage(uid?: string): User | null {
    try {
      const userData = localStorage.getItem('currentUserData');
      if (!userData) return null;
      
      const parsedUser = JSON.parse(userData);

      if (uid && parsedUser.uid !== uid) {
        return null;
      }
      
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
      return null;
    }
  }

  private verifyUserRole(idToken: string): void {
    const currentPath = window.location.pathname;
    if (currentPath.includes('/login') || currentPath.includes('/register')) {
      return;
    }
    
    const currentFirebaseUid = this.auth.currentUser?.uid;
    const cachedUser = this.getUserFromLocalStorage();
    
    if (cachedUser && currentFirebaseUid && cachedUser.uid !== currentFirebaseUid) {
      localStorage.removeItem('currentUserData');
      localStorage.removeItem('userDataTimestamp');
    }
    
    const cachedUserFromLocalStorage = this.getUserFromLocalStorage();
    if (cachedUserFromLocalStorage && cachedUserFromLocalStorage.role && cachedUserFromLocalStorage.role !== 'DEFAULT') {
      this.currentUserData = cachedUserFromLocalStorage;
      this.userSubject.next(cachedUserFromLocalStorage);
      this.authStateSubject.next(true);
      
      this.http.get<any>(`${this.API_BASE_URL}/verificar-rol`, {
        params: { idToken },
        headers: { 'Content-Type': 'application/json' }
      }).subscribe({
        next: (response) => {
          if (response && this.auth.currentUser && response.role) {
            if (response.role !== cachedUserFromLocalStorage.role) {
              this.currentUserData = {
                ...this.currentUserData,
                role: response.role as UserRole
              } as User;
              this.userSubject.next(this.currentUserData);
              
              localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
              localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
            }
          }
        },
        error: (error) => {
        }
      });
      
      return;
    }
    
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
          
          this.userSubject.next(this.currentUserData);
          this.authStateSubject.next(true);
          
          localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
          localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
          
          if (role === 'DEFAULT') {
            this.navigateToRoleSelection();
          } else {
            this.router.navigate(['/home']);
          }
        }
      },
      error: (error) => {
      }
    });
  }

  async loginWithGoogle(isRegistration: boolean = false): Promise<void> {
    try {
      await this.clearAllStorages();
      
      const provider = new GoogleAuthProvider();
      if (isRegistration) {
        provider.setCustomParameters({ prompt: 'select_account' });
      }
      
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();
      
      try {
        const backendValidation = await firstValueFrom(this.http.post<any>(`${this.API_BASE_URL}/google/login`, null, {
          params: new HttpParams()
            .set('idToken', idToken)
            .set('isRegistration', isRegistration ? 'true' : 'false'),
          headers: { 'Content-Type': 'application/json' }
        }));

        if (this.auth.currentUser) {
          const cachedUser = this.getUserFromLocalStorage(this.auth.currentUser.uid);
          const roleFromBackend = backendValidation?.role || 'DEFAULT';
          const persistedRole = cachedUser?.role;
          
          let finalRole: string;
          
          if (isRegistration) {
            finalRole = 'DEFAULT';
          } else {
            finalRole = (roleFromBackend === 'DEFAULT' && persistedRole && persistedRole !== 'DEFAULT')
              ? persistedRole
              : roleFromBackend;
          }
            
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
          
          localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
          localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
          
          if (isRegistration || finalRole === 'DEFAULT') {
            this.navigateToRoleSelection();
          } else {
            this.router.navigate(['/home']);
          }
        } else {
          throw new Error('No se pudo completar el proceso de autenticación.');
        }
      } catch (error) {
        console.error('Error en loginWithGoogle:', error); // Para debugging
        
        if (error && (error as any).message && ((error as any).message.includes('select-rol') || (error as any).message.includes('select-role'))) {
          this.handleRouteError(error);
        } else if (error && (
          (error as any).status === 401 || // Status 401 indica usuario deshabilitado
          (error as any).message?.includes('Usuario deshabilitado') || 
          (error as any).error?.includes('Usuario deshabilitado') ||
          (error as any).error?.message?.includes('Usuario deshabilitado') ||
          ((error as any).status === 400 && (error as any).error?.includes('deshabilitado')) ||
          ((error as any).status === 403 && (error as any).error?.includes('deshabilitado'))
        )) {
          // Usuario deshabilitado - cerrar sesión y mostrar error
          await signOut(this.auth);
          await this.clearAllStorages();
          throw new Error('Tu cuenta está deshabilitada. Contacta al administrador para más información.');
        } else {
          const user = this.auth.currentUser;
          if (user) {
            
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
            
            localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
            localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
            
            this.navigateToRoleSelection();
          } else {
            throw new Error('Error en autenticación y no hay usuario disponible');
          }
        }
      }
    } catch (error: any) {
      
      let errorMessage = 'Error al procesar la autenticación con Google';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Proceso cancelado. La ventana fue cerrada.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'El navegador bloqueó la ventana emergente. Por favor, permita ventanas emergentes e intente nuevamente.';
      } else if (error.message && (error.message.includes('select-rol') || error.message.includes('select-role'))) {
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
            return from(new Promise<string>((resolve, reject) => {
              this.ngZone.runOutsideAngular(() => {
                runInInjectionContext(this.environmentInjector, () => {
                  signInWithEmailAndPassword(this.auth, email, password)
                    .then(userCredential => {
                      this.ngZone.run(() => {
                        resolve(response);
                      });
                    })
                    .catch(error => {
                      this.ngZone.run(() => {
                        reject(error);
                      });
                    });
                });
              });
            }));
          }),
          catchError(error => {
            return throwError(() => error);
          })
        );
      })
    );
  }

  updateUserRole(uid: string, role: UserRole, adminKey?: string): Observable<any> {
    
    return from(this.getIdToken()).pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => new Error('No se pudo obtener el token de autenticación'));
        }
        
        const requestData: any = { uid, roleName: role };
        if (adminKey) {
          requestData.adminKey = adminKey;
        }
        
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
            if (this.currentUserData) {
              this.currentUserData.role = role;
              this.userSubject.next(this.currentUserData);
              localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
              localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
            }
            return of(response);
          }),
          catchError(error => {
            
            if (error.status === 403 || error.status === 401) {
              
              if (this.currentUserData) {
                this.currentUserData.role = role;
                this.userSubject.next(this.currentUserData);
                localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
                localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
                
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
        return throwError(() => error);
      })
    );
  }

  loginWithEmail(email: string, password: string): Observable<any> {
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
            return from(new Promise<any>((resolve, reject) => {
              this.ngZone.runOutsideAngular(() => {
                runInInjectionContext(this.environmentInjector, () => {
                  signInWithEmailAndPassword(this.auth, email, password)
                    .then(userCredential => {
                      this.ngZone.run(() => {
                        const cachedUser = this.getUserFromLocalStorage();
                        if (cachedUser && cachedUser.uid !== userCredential.user.uid) {
                          localStorage.removeItem('currentUserData');
                          localStorage.removeItem('userDataTimestamp');
                        }
                        
                        userCredential.user.getIdToken()
                          .then(idToken => {
                            const cachedUser = this.getUserFromLocalStorage(userCredential.user.uid);
                            const roleFromBackend = response.role || 'DEFAULT';
                            const persistedRole = cachedUser?.role;
                            
                            const finalRole = (roleFromBackend === 'DEFAULT' && persistedRole && persistedRole !== 'DEFAULT')
                              ? persistedRole
                              : roleFromBackend;
                              
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
                            
                            localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
                            localStorage.setItem('userDataTimestamp', new Date().getTime().toString());

                            if (finalRole === 'DEFAULT') {
                              this.navigateToRoleSelection();
                            } else {
                              this.router.navigate(['/home']);
                            }
                            
                            this.startTokenRefreshTimer();
                            
                            this.verifyUserRole(idToken);
                            this.lastTokenRefresh = new Date().getTime();
                            
                            resolve({ 
                              success: true, 
                              role: finalRole,
                              needsRole: finalRole === 'DEFAULT'
                            });
                          })
                          .catch(error => {
                            reject(error);
                          });
                      });
                    })
                    .catch(error => {
                      this.ngZone.run(() => {
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
      this.stopTokenRefreshTimer();
      
      return new Promise<void>(async (resolve) => {
        try {
          if (this.auth.currentUser) {
            await signOut(this.auth);
          }
          
          this.currentUserData = null;
          this.userSubject.next(null);
          this.authStateSubject.next(false);
          
          await this.clearAllStorages();
          
          window.location.href = '/login';
          resolve();
        } catch (error) {
          await this.clearAllStorages();
          window.location.href = '/login';
          resolve();
        }
      });
      
      return Promise.resolve();
    } catch (error) {
      await this.clearAllStorages();
      window.location.href = '/login';
      return Promise.reject(error);
    }
  }

  private async clearAllStorages(): Promise<void> {
    localStorage.clear();
    sessionStorage.clear();
    
    try {
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
          i--;
        }
      }
    } catch (e) {
    }
    
    try {
      const databases = await window.indexedDB.databases();
      databases.forEach(db => {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
        }
      });
    } catch (e) {
    }
    
    try {
      document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    } catch (e) {
    }
  }

  updateCurrentUser(user: User): void {
    this.currentUserData = user;
    this.userSubject.next(user);
    localStorage.setItem('currentUserData', JSON.stringify(user));
  }

  getIdToken(): Promise<string | null> {
    if (!this.auth.currentUser) {
      const cachedUser = this.getUserFromLocalStorage();
      if (cachedUser && cachedUser.idToken && this.isTokenValid(cachedUser)) {
        return Promise.resolve(cachedUser.idToken);
      }
      return Promise.resolve(null);
    }
    
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
    if (this.currentUserData) {
      return true;
    }
    
    if (this.auth.currentUser) {
      return true;
    }
    
    const cachedUser = this.getUserFromLocalStorage();
    if (cachedUser && this.isTokenValid(cachedUser)) {
      this.currentUserData = cachedUser;
      this.userSubject.next(cachedUser);
      this.authStateSubject.next(true);
      
      this.startTokenRefreshTimer();
      
      return true;
    }
    
    return false;
  }
  
  refreshToken(): Observable<string | null> {
    return new Observable<string | null>(subscriber => {
      if (this.auth.currentUser) {
        
        runInInjectionContext(this.environmentInjector, () => {
          import('firebase/auth').then(firebaseAuth => {
            if (this.auth.currentUser) {
              (this.auth.currentUser as import('@firebase/auth').User).getIdToken(true)
                .then(newToken => {
                  
                  if (this.currentUserData) {
                    this.currentUserData.idToken = newToken;
                    this.userSubject.next(this.currentUserData);
                    this.lastTokenRefresh = new Date().getTime();
                    
                    localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
                    localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
                  }
                  
                  subscriber.next(newToken);
                  subscriber.complete();
                })
                .catch(error => {
                  this.tryRecoverFromLocalStorage(subscriber);
                });
            } else {
              this.tryRecoverFromLocalStorage(subscriber);
            }
          }).catch(err => {
            this.tryRecoverFromLocalStorage(subscriber);
          });
        });
        
        return;
      }
      
      this.tryRecoverFromLocalStorage(subscriber);
    });
  }
  
  private tryRecoverFromLocalStorage(subscriber: any): void {
    const cachedUser = this.getUserFromLocalStorage();
    
    if (cachedUser && cachedUser.idToken) {
      
      subscriber.next(cachedUser.idToken);
    } else {
      subscriber.next(null);
    }
    
    subscriber.complete();
  }
  
  isLoggedIn(): boolean {
    return !!this.currentUserData;
  }
  
  getCurrentUserSync(): User | null {
    if (!this.currentUserData) {
      const userData = localStorage.getItem('currentUserData');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          return user;
        } catch (e) {
        }
      }
    }
    return this.currentUserData;
  }
  
  getUserRole(): UserRole | null {
    return this.currentUserData?.role || null;
  }

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
        return throwError(() => error);
      })
    );
  }

  checkTokenExpiration(): Promise<boolean> {
    return Promise.resolve(true);
  }

  waitForAuthReady(): Observable<boolean> {
    return new Observable<boolean>(subscriber => {
      if (this.currentUserData) {
        subscriber.next(true);
        subscriber.complete();
        return;
      }
      
      if (this.auth.currentUser) {
        subscriber.next(true);
        subscriber.complete();
        return;
      }
      
      const cachedUser = this.getUserFromLocalStorage();
      if (cachedUser && this.isTokenValid(cachedUser)) {
        this.currentUserData = cachedUser;
        this.userSubject.next(cachedUser);
        this.authStateSubject.next(true);
        subscriber.next(true);
        subscriber.complete();
        return;
      }
      
      const unsubscribe = onAuthStateChanged(this.auth, user => {
        unsubscribe();
        subscriber.next(true);
        subscriber.complete();
      });
    });
  }

  private isTokenValid(user: User): boolean {
    try {
      if (!user.idToken) return false;
      
      const timestamp = localStorage.getItem('userDataTimestamp');
      if (!timestamp) return false;
      
      const tokenDate = new Date(parseInt(timestamp));
      const now = new Date();
      
      const hoursElapsed = (now.getTime() - tokenDate.getTime()) / (1000 * 60 * 60);
      
      return hoursElapsed < 24;
    } catch (e) {
      return false;
    }
  }

  clearAuthCache(): void {
    
    this.currentUserData = null;
    this.userSubject.next(null);
    
    localStorage.removeItem('currentUserData');
    localStorage.removeItem('userDataTimestamp');
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('firebase') || key.includes('firebaseui') || key.includes('auth'))) {
        localStorage.removeItem(key);
        i--;
      }
    }
    
  }

  handleRouteError(error: any): void {
    if (error && error.message && (error.message.includes('select-rol') || error.message.includes('select-role'))) {
      this.navigateToRoleSelection();
    }
  }

  navigateToRoleSelection(): void {
    
    setTimeout(() => {
      this.router.navigate(['/select-role']).then(success => {
        if (!success) {
          window.location.href = window.location.origin + '/select-role';
        }
      }).catch(err => {
        window.location.href = window.location.origin + '/select-role';
      });
    }, 100);
  }

  private startTokenRefreshTimer(): void {
    this.stopTokenRefreshTimer();
    
    this.tokenRefreshTimer = timer(45 * 60 * 1000, 45 * 60 * 1000).subscribe(() => {
      if (this.auth.currentUser && this.currentUserData) {
        this.refreshTokenSilently();
      }
    });
  }

  private stopTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      this.tokenRefreshTimer.unsubscribe();
      this.tokenRefreshTimer = null;
    }
  }

  private async refreshTokenSilently(): Promise<void> {
    try {
      if (this.auth.currentUser) {
        const newToken = await this.auth.currentUser.getIdToken(true);
        if (newToken && this.currentUserData) {
          this.currentUserData.idToken = newToken;
          this.userSubject.next(this.currentUserData);
          this.lastTokenRefresh = new Date().getTime();
          
          localStorage.setItem('currentUserData', JSON.stringify(this.currentUserData));
          localStorage.setItem('userDataTimestamp', new Date().getTime().toString());
        }
      }
    } catch (error) {
    }
  }
}
