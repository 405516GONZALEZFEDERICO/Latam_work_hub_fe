import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FilterState } from '../../../models/search-space.model';
import { Country } from '../../../models/country.model';
import { City } from '../../../models/city.model';
import { AmenityDto } from '../../../models/space.model';
import { SpaceType } from '../../../models/space-type.model';
import { MaterialSelectComponent, OptionItem } from '../../shared/material-select/material-select.component';
import { AddressService } from '../../../services/address/address.service';
import { AmenityService } from '../../../services/amenity/amenity.service';
import { SpaceTypeService } from '../../../services/space-type/space-type.service';

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
    MatSliderModule,
    MatCheckboxModule,
    MaterialSelectComponent,
    MatTooltipModule
  ],
  templateUrl: './space-filter.component.html',
  styleUrls: ['./space-filter.component.css']
})
export class SpaceFilterComponent implements OnInit {
  @Output() filtersChanged = new EventEmitter<FilterState>();
  @ViewChild(MaterialSelectComponent) selectButton?: MaterialSelectComponent;
  
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
    private spaceTypeService: SpaceTypeService
  ) { }

  ngOnInit(): void {
    this.loadCountries();
    this.loadAmenities();
    this.loadSpaceTypes();
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

  updateCapacity(event: any): void {
    this.filters.capacity = event;
  }

  updateHourlyPrice(event: any): void {
    this.filters.pricePerHour = event;
  }

  updateMonthlyPrice(event: any): void {
    this.filters.pricePerMonth = event;
  }
  
  updateDailyPrice(event: any): void {
    this.filters.pricePerDay = event;
  }
  
  updateArea(event: any): void {
    this.filters.area = event;
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
    
    this.filtersChanged.emit({...this.filters});
  }

  resetFilters() {
    // Restablecer todos los filtros a sus valores predeterminados
    this.filters = {
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

    // Reiniciar las opciones de amenidades
    if (this.amenityOptions && this.amenityOptions.length > 0) {
      this.amenityOptions = this.amenityOptions.map(option => ({
        ...option,
        selected: false
      }));
    }

    // Vaciar las ciudades al resetear
    if (this.filters.countryId) {
      this.cities = [];
    }
    
    // Emitir los filtros restablecidos
    this.filtersChanged.emit({...this.filters});
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