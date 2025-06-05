import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FilterState } from '../../models/search-space.model';

@Injectable({
  providedIn: 'root'
})
export class FilterStateService {
  private readonly defaultFilters: FilterState = {
    pricePerHour: 0,
    pricePerDay: 0,
    pricePerMonth: 0,
    area: 0,
    capacity: 0,
    spaceTypeId: null,
    cityId: null,
    countryId: null,
    amenityIds: null,
    address: ''
  };

  // Filtros separados para cada contexto
  private providerFilters$ = new BehaviorSubject<FilterState>({...this.defaultFilters});
  private clientFilters$ = new BehaviorSubject<FilterState>({...this.defaultFilters});

  constructor() { }

  /**
   * Obtiene los filtros para el contexto de proveedor
   */
  getProviderFilters(): FilterState {
    return this.providerFilters$.value;
  }

  /**
   * Obtiene los filtros para el contexto de cliente
   */
  getClientFilters(): FilterState {
    return this.clientFilters$.value;
  }

  /**
   * Actualiza los filtros para el contexto de proveedor
   */
  setProviderFilters(filters: FilterState): void {
    this.providerFilters$.next({...filters});
  }

  /**
   * Actualiza los filtros para el contexto de cliente
   */
  setClientFilters(filters: FilterState): void {
    this.clientFilters$.next({...filters});
  }

  /**
   * Resetea los filtros para el contexto de proveedor
   */
  resetProviderFilters(): void {
    this.providerFilters$.next({...this.defaultFilters});
  }

  /**
   * Resetea los filtros para el contexto de cliente
   */
  resetClientFilters(): void {
    this.clientFilters$.next({...this.defaultFilters});
  }

  /**
   * Obtiene los filtros apropiados según la ruta actual
   */
  getFiltersForRoute(route: string): FilterState {
    if (route.includes('/home/spaces')) {
      return this.getProviderFilters();
    } else if (route.includes('/home/search-spaces')) {
      return this.getClientFilters();
    }
    return {...this.defaultFilters};
  }

  /**
   * Actualiza los filtros apropiados según la ruta actual
   */
  setFiltersForRoute(route: string, filters: FilterState): void {
    if (route.includes('/home/spaces')) {
      this.setProviderFilters(filters);
    } else if (route.includes('/home/search-spaces')) {
      this.setClientFilters(filters);
    }
  }
} 