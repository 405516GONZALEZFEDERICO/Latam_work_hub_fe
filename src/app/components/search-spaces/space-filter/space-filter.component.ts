import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FilterState } from '../../../models/search-space.model';
import { AddressService } from '../../../services/address/address.service';
import { AmenityService } from '../../../services/amenity/amenity.service';
import { SpaceTypeService } from '../../../services/space/space-type.service';
import { Country } from '../../../models/country.model';
import { City } from '../../../models/city.model';
import { AmenityDto } from '../../../models/space.model';
import { SpaceType } from '../../../models/space-type.model';
import { SelectButtonComponent, OptionItem } from '../../shared/select-button/select-button.component';

@Component({
  selector: 'app-space-filter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatCheckboxModule,
    SelectButtonComponent
  ],
  templateUrl: './space-filter.component.html',
  styleUrls: ['./space-filter.component.css']
})
export class SpaceFilterComponent implements OnInit {
  @Output() filtersChanged = new EventEmitter<FilterState>();
  
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
        console.log('Amenidades cargadas:', amenities);
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
      next: (types) => {
        console.log('Tipos de espacio cargados:', types);
        this.spaceTypes = types;
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

  // Método para manejar la selección de amenidades desde el componente SelectButton
  onAmenitiesSelectionChange(selectedIds: number[]): void {
    console.log('Amenidades seleccionadas:', selectedIds);
    this.filters.amenityIds = selectedIds.length > 0 ? selectedIds : null;
  }

  applyFilters(): void {
    console.log('Aplicando filtros:', this.filters);
    this.filtersChanged.emit({...this.filters});
  }
} 