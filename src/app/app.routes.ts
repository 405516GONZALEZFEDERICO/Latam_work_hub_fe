import { Routes } from '@angular/router';
import { SecurityWardGuard } from './guards/security-ward.guard';
import { LoginGuard } from './guards/login.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
    canActivate: [LoginGuard]
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
      import('./views/view-select-rol/view-select-rol.component').then(m => m.RoleSelectionComponent),
    canActivate: [SecurityWardGuard],
    data: { 
      allowedRoles: ['DEFAULT'] // Solo usuarios con rol DEFAULT pueden seleccionar rol
    }
  },
  {
    path: 'profile',
    canActivate: [SecurityWardGuard],
    children: [
      {
        path: 'personal',
        loadComponent: () =>
          import('./components/profile/complete-profile/complete-profile.component').then(m => m.CompleteProfileComponent),
        data: { activeTab: 'personal', allowedRoles: ['CLIENTE', 'PROVEEDOR', 'ADMIN'] }
      },
      {
        path: 'company',
        loadComponent: () =>
          import('./components/profile/complete-profile/complete-profile.component').then(m => m.CompleteProfileComponent),
        data: { activeTab: 'company', allowedRoles: ['PROVEEDOR'] }
      }
    ]
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./views/home-layout/home-layout.component').then(h => h.HomeLayoutComponent),
    canActivate: [SecurityWardGuard],
    data: { 
      allowedRoles: ['PROVEEDOR', 'CLIENTE', 'ADMIN'] // Home no es accesible para usuarios DEFAULT
    }
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent), // Usar login temporalmente
    data: { message: 'No tienes permiso para acceder a esta página' }
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
