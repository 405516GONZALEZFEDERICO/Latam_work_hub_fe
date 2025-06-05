import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output, ViewChild, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelect } from '@angular/material/select';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';
import { FilterState } from '../../../models/search-space.model';
import { Country } from '../../../models/country.model';
import { City } from '../../../models/city.model';
import { AmenityDto } from '../../../models/space.model';
import { SpaceType } from '../../../models/space-type.model';
import { MaterialSelectComponent, OptionItem } from '../../shared/material-select/material-select.component';
import { AddressService } from '../../../services/address/address.service';
import { AmenityService } from '../../../services/amenity/amenity.service';
import { SpaceTypeService } from '../../../services/space-type/space-type.service';
import { FilterStateService } from '../../../services/filter-state/filter-state.service';

@Component({
  selector: 'app-space-filter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MaterialSelectComponent,
    MatTooltipModule
  ],
  templateUrl: './space-filter.component.html',
  styleUrls: ['./space-filter.component.css']
})
export class SpaceFilterComponent implements OnInit, OnDestroy {
  @Output() filtersChanged = new EventEmitter<FilterState>();
  @ViewChild(MaterialSelectComponent) selectButton?: MaterialSelectComponent;
  @ViewChild('countrySelect') countrySelect?: MatSelect;
  @ViewChild('citySelect') citySelect?: MatSelect;
  @ViewChild('spaceTypeSelect') spaceTypeSelect?: MatSelect;
  
  // Subject para manejar la limpieza de suscripciones
  private destroy$ = new Subject<void>();
  private currentRoute: string = '';
  
  // Control de expansión de filtros
  isExpanded = true;
  
  // Listas para los selectores
  countries: Country[] = [];
  cities: City[] = [];
  amenities: AmenityDto[] = [];
  spaceTypes: SpaceType[] = [];
  
  // Opciones para el selector de amenidades
  amenityOptions: OptionItem[] = [];
  
  filters: FilterState = {
    pricePerHour: null,
    pricePerDay: null,
    pricePerMonth: null,
    area: null,
    capacity: null,
    spaceTypeId: null,
    cityId: null,
    countryId: null,
    amenityIds: null,
    address: ''
  };

  constructor(
    private addressService: AddressService,
    private amenityService: AmenityService,
    private spaceTypeService: SpaceTypeService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private filterStateService: FilterStateService
  ) { }

  ngOnInit(): void {
    this.loadCountries();
    this.loadAmenities();
    this.loadSpaceTypes();
    
    // Guardar la ruta actual
    this.currentRoute = this.router.url;
    
    // Cargar los filtros apropiados para la ruta actual
    this.loadFiltersForCurrentRoute();
    
    // Suscribirse a los cambios de navegación para resetear filtros automáticamente
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      this.handleRouteChange(event.url);
    });
  }

  ngOnDestroy(): void {
    // Guardar los filtros actuales antes de destruir el componente
    this.saveCurrentFilters();
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga los filtros apropiados para la ruta actual
   */
  private loadFiltersForCurrentRoute(): void {
    const savedFilters = this.filterStateService.getFiltersForRoute(this.currentRoute);
    this.filters = {...savedFilters};
    
    // Actualizar las opciones de amenidades si hay filtros guardados
    if (this.filters.amenityIds && this.amenityOptions.length > 0) {
      this.updateAmenityOptionsFromFilters();
    }
    
    // Cargar ciudades si hay un país seleccionado
    if (this.filters.countryId) {
      this.loadCities(this.filters.countryId);
    }
    
    this.cdr.detectChanges();
  }

  /**
   * Guarda los filtros actuales en el servicio
   */
  private saveCurrentFilters(): void {
    this.filterStateService.setFiltersForRoute(this.currentRoute, this.filters);
  }

  /**
   * Actualiza las opciones de amenidades basándose en los filtros guardados
   */
  private updateAmenityOptionsFromFilters(): void {
    if (this.amenityOptions && this.amenityOptions.length > 0 && this.filters.amenityIds) {
      this.amenityOptions = this.amenityOptions.map(option => ({
        ...option,
        selected: this.filters.amenityIds!.includes(option.value)
      }));
      
      // Actualizar el componente MaterialSelect si existe
      if (this.selectButton) {
        this.selectButton.selectedValues = this.filters.amenityIds;
      }
    }
  }

  /**
   * Maneja los cambios de ruta y resetea los filtros cuando se navega entre
   * vistas de proveedor (mis espacios) y cliente (buscar espacios)
   */
  private handleRouteChange(newRoute: string): void {
    // Guardar los filtros de la ruta anterior
    this.saveCurrentFilters();
    
    const isProviderRoute = newRoute.includes('/home/spaces');
    const isClientRoute = newRoute.includes('/home/search-spaces');
    const wasProviderRoute = this.currentRoute.includes('/home/spaces');
    const wasClientRoute = this.currentRoute.includes('/home/search-spaces');
    
    // Actualizar la ruta actual
    this.currentRoute = newRoute;
    
    // Cargar filtros apropiados para la nueva ruta
    if ((isProviderRoute && wasClientRoute) || (isClientRoute && wasProviderRoute)) {
      console.log('Cambiando entre vistas de proveedor y cliente, cargando filtros apropiados...');
      this.loadFiltersForCurrentRoute();
    }
  }

  // Carga de datos
  loadCountries(): void {
    this.addressService.getAllCountries().subscribe({
      next: (countries) => {
        this.countries = countries;
      },
      error: (error) => {
        console.error('Error al cargar países:', error);
      }
    });
  }

  loadCities(countryId: number): void {
    if (!countryId) return;
    
    this.addressService.getCitiesByCountry(countryId).subscribe({
      next: (cities) => {
        this.cities = cities;
        this.filters.cityId = null; // Resetear ciudad al cambiar país
      },
      error: (error) => {
        console.error('Error al cargar ciudades:', error);
      }
    });
  }

  loadAmenities(): void {
    this.amenityService.getAmenities().subscribe({
      next: (amenities) => {
        this.amenities = amenities;
        
        // Convertir amenidades a opciones para el selector
        this.amenityOptions = amenities.map(amenity => ({
          label: amenity.name,
          selected: false,
          value: amenity.id ? Number(amenity.id) : 0
        }));
      },
      error: (error) => {
        console.error('Error al cargar amenidades:', error);
      }
    });
  }

  loadSpaceTypes(): void {
    this.spaceTypeService.getAllSpaceTypes().subscribe({
      next: (types: SpaceType[]) => {
        this.spaceTypes = types;
        console.log('Tipos de espacio cargados en SpaceFilterComponent:', JSON.stringify(this.spaceTypes)); // Log detallado
      },
      error: (error) => {
        console.error('Error al cargar tipos de espacios:', error);
      }
    });
  }

  // Método para alternar la visibilidad de los filtros
  toggleFilters(): void {
    this.isExpanded = !this.isExpanded;
  }

  // Formatters
  formatCapacity(value: number): string {
    return `${value} personas`;
  }

  formatPrice(value: number): string {
    return `$${value}`;
  }

  formatArea(value: number): string {
    return `${value} m²`;
  }

  // Eventos de actualización
  onCountryChange(): void {
    if (this.filters.countryId) {
      this.loadCities(this.filters.countryId);
    } else {
      this.cities = [];
      this.filters.cityId = null;
    }
  }

  updateCapacity(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.filters.capacity = Number(target.value);
  }

  updateHourlyPrice(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.filters.pricePerHour = Number(target.value);
  }

  updateMonthlyPrice(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.filters.pricePerMonth = Number(target.value);
  }
  
  updateDailyPrice(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.filters.pricePerDay = Number(target.value);
  }
  
  updateArea(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.filters.area = Number(target.value);
  }

  // Método para manejar la selección de amenidades desde el componente MaterialSelect
  onAmenitiesSelectionChange(selectedIds: any[]): void {
    this.filters.amenityIds = selectedIds.length > 0 ? selectedIds : null;
  }

  applyFilters(): void {
    // Asegurarse que spaceTypeId sea un número entero válido
    if (this.filters.spaceTypeId !== null) {
      // Convertir explícitamente a número y validar
      const typeId = Number(this.filters.spaceTypeId);
      if (!isNaN(typeId)) {
        this.filters.spaceTypeId = typeId;
      } else {
        console.error('Error: spaceTypeId no es un número válido:', this.filters.spaceTypeId);
      }
    }
    
    console.log('Aplicando filtros:', JSON.stringify(this.filters));
    console.log('Tipo de espacio seleccionado:', 
      this.filters.spaceTypeId, 
      'tipo:', typeof this.filters.spaceTypeId,
      'objeto correspondiente:', this.spaceTypes.find(t => t.id === this.filters.spaceTypeId)
    );
    
    // Guardar los filtros en el servicio
    this.filterStateService.setFiltersForRoute(this.currentRoute, this.filters);
    
    // Crear una copia de los filtros para enviar, convirtiendo 0 a null para el backend
    const filtersToEmit = {
      ...this.filters,
      pricePerHour: this.filters.pricePerHour === 0 ? null : this.filters.pricePerHour,
      pricePerDay: this.filters.pricePerDay === 0 ? null : this.filters.pricePerDay,
      pricePerMonth: this.filters.pricePerMonth === 0 ? null : this.filters.pricePerMonth,
      area: this.filters.area === 0 ? null : this.filters.area,
      capacity: this.filters.capacity === 0 ? null : this.filters.capacity
    };
    
    this.filtersChanged.emit(filtersToEmit);
  }

  resetFilters() {
    // Restablecer todos los filtros a sus valores predeterminados
    this.filters = {
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

    // Reiniciar las opciones de amenidades
    if (this.amenityOptions && this.amenityOptions.length > 0) {
      this.amenityOptions = this.amenityOptions.map(option => ({
        ...option,
        selected: false
      }));
    }

    // Vaciar las ciudades al resetear
    this.cities = [];
    
    // Resetear el componente MaterialSelect si existe
    if (this.selectButton) {
      this.selectButton.selectedValues = [];
    }
    
    // Reset de los selects
    if (this.countrySelect) {
      this.countrySelect.value = null;
    }
    if (this.citySelect) {
      this.citySelect.value = null;
    }
    if (this.spaceTypeSelect) {
      this.spaceTypeSelect.value = null;
    }
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
    
    // Actualizar el servicio con los filtros reseteados
    this.filterStateService.setFiltersForRoute(this.currentRoute, this.filters);
    
    // Emitir los filtros restablecidos (convertir 0 a null para el backend)
    const filtersToEmit = {
      ...this.filters,
      pricePerHour: null,
      pricePerDay: null,
      pricePerMonth: null,
      area: null,
      capacity: null
    };
    
    this.filtersChanged.emit(filtersToEmit);
  }

  onFilterScroll(): void {
    // Esta lógica ya no es necesaria con el nuevo componente de Material
    // pero podemos mantenerla por compatibilidad si es necesario
  }

  // Método para registrar el cambio directo en el select
  onSpaceTypeChange(event: any): void {
    const selectedId = event.value;
    console.log('Tipo de espacio SELECCIONADO (evento directo):', selectedId, 'Tipo de dato:', typeof selectedId);
    // No necesitamos asignar aquí porque ngModel lo hace, pero podemos forzarlo si es necesario:
    // this.filters.spaceTypeId = selectedId;
  }
} 