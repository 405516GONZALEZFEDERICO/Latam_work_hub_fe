import { Routes } from '@angular/router';
import { securityWardGuard } from './guards/security-ward.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'  // Esto es importante
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./components/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'terms-and-conditions',
    loadComponent: () =>
      import('./components/terms-and-conditions/terms-and-conditions.component').then(m => m.TermsAndConditionsComponent)
  },
  {
    path: 'select-role',
    loadComponent: () =>
      import('./views/view-select-rol/view-select-rol.component').then(m => m.ViewSelectRolComponent),
    canActivate: [securityWardGuard],
    data: { requiredRole: 'DEFAULT' }
  },
  {
    path: 'default-section',
    loadComponent: () =>
      import('./views/default-section/default-section.component').then(m => m.DefaultSectionComponent),
    canActivate: [securityWardGuard],
    data: { requiredRole: 'USER' }
  }
];
