import { ApplicationConfig, importProvidersFrom, ComponentRef, Type } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { environment } from '../environment/environment';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { provideFirestore } from '@angular/fire/firestore';
import { getFirestore } from 'firebase/firestore';
import { authInterceptor } from '../interceptor/auth-interceptor.interceptor';
import { ProfileService } from './services/profile/profile.service';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { LOCALE_ID } from '@angular/core';
import { httpErrorInterceptor } from '../interceptors/http-error.interceptor';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

// Registrar los datos de localización para español
registerLocaleData(localeEs);

// Función para suprimir warnings de consola
const suppressConsoleWarnings = () => {
  const originalConsoleWarn = console.warn;
  console.warn = function(message?: any, ...optionalParams: any[]): void {
    // Ignorar warnings específicos de NG0912
    if (message && typeof message === 'string' && 
        (message.includes('NG0912') || message.includes('Component ID generation collision'))) {
      return;
    }
    originalConsoleWarn.apply(console, [message, ...optionalParams]);
  };
};

// Ejecutar directamente la supresión de warnings
suppressConsoleWarnings();

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([
      authInterceptor,
      httpErrorInterceptor
    ])),
    provideAnimations(),
    importProvidersFrom(
      MatDatepickerModule,
      MatNativeDateModule
    ),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    ProfileService,
    { provide: LOCALE_ID, useValue: 'es' },
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      }
    }
  ]
};