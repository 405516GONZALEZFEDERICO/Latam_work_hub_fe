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
    canActivate: [LoginGuard],
    data: { title: 'Iniciar Sesión' }
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./components/register/register.component').then(m => m.RegisterComponent),
    canActivate: [LoginGuard],
    data: { title: 'Registro' }
  },
  {
    path: 'terms-and-conditions',
    loadComponent: () =>
      import('./components/terms-and-conditions/terms-and-conditions.component').then(m => m.TermsAndConditionsComponent),
    data: { title: 'Términos y Condiciones' }
  },
  {
    path: 'select-role',
    loadComponent: () =>
      import('./views/view-select-rol/view-select-rol.component').then(m => m.RoleSelectionComponent),
    canActivate: [SecurityWardGuard],
    data: { 
      allowedRoles: ['DEFAULT'],
      title: 'Seleccionar Rol'
    }
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./views/home-layout/home-layout.component').then(h => h.HomeLayoutComponent),
    canActivate: [SecurityWardGuard],
    data: { 
      allowedRoles: ['PROVEEDOR', 'CLIENTE', 'ADMIN'],
      title: 'Inicio'
    },
    children: [
      {
        path: '',
        redirectTo: 'welcome',
        pathMatch: 'full'
      },
      {
        path: 'welcome',
        loadComponent: () =>
          import('./components/home-layout/welcome/welcome.component').then(m => m.WelcomeComponent),
        data: { title: 'Bienvenido' }
      },
      {
        path: 'profile',
        children: [
          {
            path: '',
            redirectTo: 'personal',
            pathMatch: 'full'
          },
          {
            path: 'personal',
            loadComponent: () =>
              import('./components/profile/complete-profile/complete-profile.component').then(m => m.CompleteProfileComponent),
            data: { activeTab: 'personal', title: 'Perfil Personal' }
          },
          {
            path: 'company',
            loadComponent: () =>
              import('./components/profile/complete-profile/complete-profile.component').then(m => m.CompleteProfileComponent),
            data: { activeTab: 'company', title: 'Perfil de Empresa' }
          },
          {
            path: 'provider-type',
            loadComponent: () =>
              import('./components/profile/complete-profile/complete-profile.component').then(m => m.CompleteProfileComponent),
            data: { activeTab: 'provider-type', title: 'Tipo de Proveedor' }
          }
        ]
      }
    ]
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent), 
    data: { message: 'No tienes permiso para acceder a esta página', title: 'No Autorizado' }
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
