import { Routes } from '@angular/router';
import { LoginGuard } from '../guards/login.guard';
import { SecurityWardGuard } from '../guards/security-ward.guard';
import { ProfileCompletionGuard } from './guards/profile-completion.guard';
import { RentalsTabComponent } from './components/rentals-tab/rentals-tab.component';
import { InvoicesTabComponent } from './components/invoices-tab/invoices-tab.component';
import { BookingsTabComponent } from './components/bookings-tab/bookings-tab.component';

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
        path: 'search-spaces',
        loadComponent: () =>
          import('./components/search-spaces/search-spaces.component').then(m => m.SearchSpacesComponent),
        canActivate: [SecurityWardGuard, ProfileCompletionGuard],
        data: { 
          allowedRoles: ['CLIENTE'],
          title: 'Buscar Espacios' 
        }
      },
      {
        path: 'space-details/:id',
        loadComponent: () =>
          import('./components/spaces/space-details/space-details.component').then(m => m.SpaceDetailsComponent),
        canActivate: [SecurityWardGuard, ProfileCompletionGuard],
        data: { 
          allowedRoles: ['CLIENTE'],
          title: 'Detalles del Espacio' 
        }
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
      },
      {
        path: 'spaces',
        canActivate: [SecurityWardGuard, ProfileCompletionGuard],
        data: { 
          allowedRoles: ['PROVEEDOR'],
          title: 'Mis Espacios'
        },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./components/spaces/spaces-list/spaces-list.component').then(m => m.SpacesListComponent),
            data: { title: 'Mis Espacios' }
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./components/spaces/space-form/space-form.component').then(m => m.SpaceFormComponent),
            data: { title: 'Crear Espacio' }
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./components/spaces/space-details/space-details.component').then(m => m.SpaceDetailsComponent),
            data: { title: 'Detalles del Espacio' }
          },
          {
            path: ':id/edit',
            loadComponent: () =>
              import('./components/spaces/space-form/space-form.component').then(m => m.SpaceFormComponent),
            data: { title: 'Editar Espacio' }
          }
        ]
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./views/settings-view/settings.component').then(m => m.SettingsComponent),
        data: { title: 'Configuración' }
      },
      {
        path: 'reservas',
        loadComponent: () =>
          import('./components/reservas/reservas.component').then(m => m.ReservasComponent),
        canActivate: [SecurityWardGuard],
        data: { 
          allowedRoles: ['CLIENTE'],
          title: 'Mis Reservas y Alquileres' 
        }
      }
    ]
  },
  {
    path: 'rentals',
    component: RentalsTabComponent,
    data: { title: 'Mis Alquileres' }
  },
  {
    path: 'invoices',
    component: InvoicesTabComponent,
    data: { title: 'Mis Facturas' }
  },
  {
    path: 'bookings',
    component: BookingsTabComponent,
    data: { title: 'Mis Reservas' }
  }
];
