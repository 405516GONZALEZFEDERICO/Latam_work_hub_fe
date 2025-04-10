import { Routes } from '@angular/router';
import { securityWardGuard } from './guards/security-ward.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./views/view-login').then(v => v.ViewHomeComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'terms-and-conditions',
    loadComponent: () => import('./components/terms-and-conditions/terms-and-conditions.component').then(m => m.TermsAndConditionsComponent)
  },
  {
    path: 'home',
    loadComponent: () => import('./views/view-home/view-home.component').then(v => v.ViewHomeComponent)
  },
  {
    path: 'admin-section',
    canActivate: [securityWardGuard],
    data: { requiredRole: 'ADMIN' },
    loadComponent: () => import('./views/view-home/view-home.component').then(v => v.ViewHomeComponent)
  },
  {
    path: 'provider-section',
    canActivate: [securityWardGuard],
    data: { requiredRole: 'PROVEEDOR' },
    loadComponent: () => import('./views/view-home/view-home.component').then(v => v.ViewHomeComponent)
  }
];