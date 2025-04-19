import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Address } from '../../../models/address.model';

interface City {
  id: number;
  countryId: number;
  name: string;
}

interface Country {
  id: number;
  name: string;
}

interface AddressCity {
  name: string;
  divisionName: string;
  divisionType: 'PROVINCE' | 'STATE' | 'DEPARTMENT' | 'REGION';
  country: {
    name: string;
  };
}

@Component({
  selector: 'app-address-stepper',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  templateUrl: './address-stepper.component.html',
  styleUrls: ['./address-stepper.component.css'],
  host: {
    '[class.step-0]': 'currentStep === 0',
    '[class.step-1]': 'currentStep === 1'
  }
})
export class AddressStepperComponent implements OnInit {
  @Output() addressSaved = new EventEmitter<Address>();
  @Input() isLoading = false;
  
  addressForm!: FormGroup;
  currentStep = 0;
  
  // Public property to store the current address data
  currentAddressData: Partial<Address> = {};
  
  steps = [
    { title: 'País y Ciudad', description: 'Selecciona tu país y ciudad' },
    { title: 'Dirección', description: 'Completa los detalles de tu dirección' }
  ];
  
  countries = [
    { id: 1, name: 'Argentina' },
    { id: 2, name: 'Brasil' },
    { id: 3, name: 'Chile' },
    { id: 4, name: 'Colombia' },
    { id: 5, name: 'México' }
  ];
  
  cities = [
    { id: 1, countryId: 1, name: 'Buenos Aires' },
    { id: 2, countryId: 1, name: 'Córdoba' },
    { id: 3, countryId: 1, name: 'Rosario' },
    { id: 4, countryId: 2, name: 'São Paulo' },
    { id: 5, countryId: 2, name: 'Rio de Janeiro' },
    { id: 6, countryId: 3, name: 'Santiago' },
    { id: 7, countryId: 4, name: 'Bogotá' },
    { id: 8, countryId: 4, name: 'Medellín' },
    { id: 9, countryId: 5, name: 'Ciudad de México' },
    { id: 10, countryId: 5, name: 'Guadalajara' }
  ];
  
  filteredCities: City[] = [];
  
  constructor(private fb: FormBuilder) {}
  
  ngOnInit(): void {
    this.initForm();
    
    // Listen for country changes to filter cities
    const countryControl = this.addressForm.get('countryId');
    const cityControl = this.addressForm.get('cityId');
    
    if (countryControl && cityControl) {
      countryControl.valueChanges.subscribe(countryId => {
        this.filteredCities = this.cities.filter(city => city.countryId === countryId);
        cityControl.setValue(null);
        
        // Update the current address data with country information
        if (countryId) {
          const selectedCountry = this.countries.find(country => country.id === countryId);
          if (selectedCountry) {
            if (!this.currentAddressData.city) {
              this.currentAddressData.city = {
                name: '',
                divisionName: 'Provincia',
                divisionType: 'PROVINCE',
                country: {
                  name: selectedCountry.name
                }
              };
            } else {
              this.currentAddressData.city = {
                ...this.currentAddressData.city,
                country: {
                  name: selectedCountry.name
                }
              };
            }
          }
        }
      });
      
      // Listen for city changes to update the current address data
      cityControl.valueChanges.subscribe(cityId => {
        if (cityId) {
          const selectedCity = this.cities.find(city => city.id === cityId);
          if (selectedCity) {
            if (!this.currentAddressData.city) {
              this.currentAddressData.city = {
                name: selectedCity.name,
                divisionName: 'Provincia',
                divisionType: 'PROVINCE',
                country: { name: '' }
              };
            } else {
              this.currentAddressData.city = {
                ...this.currentAddressData.city,
                name: selectedCity.name
              };
            }
          }
        }
      });
    }
    
    // Subscribe to form value changes to keep the current address data updated
    this.addressForm.valueChanges.subscribe(formValues => {
      // Update street information
      if (formValues.streetName) {
        this.currentAddressData.streetName = formValues.streetName;
      }
      
      if (formValues.streetNumber) {
        this.currentAddressData.streetNumber = formValues.streetNumber;
      }
      
      if (formValues.floor) {
        this.currentAddressData.floor = formValues.floor;
      }
      
      if (formValues.apartment) {
        this.currentAddressData.apartment = formValues.apartment;
      }
      
      if (formValues.postalCode) {
        this.currentAddressData.postalCode = formValues.postalCode;
      }
    });
  }
  
  initForm(): void {
    this.addressForm = this.fb.group({
      countryId: ['', Validators.required],
      cityId: ['', Validators.required],
      streetName: ['', Validators.required],
      streetNumber: ['', Validators.required],
      floor: [''],
      apartment: [''],
      postalCode: ['', Validators.required]
    });
  }
  
  isFieldInvalid(fieldName: string): boolean {
    const field = this.addressForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }
  
  nextStep(): void {
    // Validate current step before proceeding
    if (this.currentStep === 0) {
      const countryControl = this.addressForm.get('countryId');
      const cityControl = this.addressForm.get('cityId');
      
      if (countryControl && cityControl && countryControl.valid && cityControl.valid) {
        // First step is valid, update the country and city data
        const countryId = countryControl.value;
        const cityId = cityControl.value;
        
        const selectedCountry = this.countries.find(country => country.id === countryId);
        const selectedCity = this.cities.find(city => city.id === cityId);
        
        if (selectedCountry && selectedCity) {
          // Update the current address data
          this.currentAddressData.city = {
            name: selectedCity.name,
            divisionName: 'Provincia',
            divisionType: 'PROVINCE',
            country: {
              name: selectedCountry.name
            }
          };
          
          // Update host classes for progress bar
          this.currentStep++;
        }
      } else {
        if (countryControl) countryControl.markAsTouched();
        if (cityControl) cityControl.markAsTouched();
      }
    }
  }
  
  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }
  
  onSubmit(): void {
    if (this.addressForm.valid) {
      const formValue = this.addressForm.value;
      
      // Create address object from form values
      const selectedCity = this.cities.find(city => city.id === formValue.cityId);
      const selectedCountry = this.countries.find(country => country.id === formValue.countryId);
      
      if (selectedCity && selectedCountry) {
        const address: Address = {
          streetName: formValue.streetName,
          streetNumber: formValue.streetNumber,
          floor: formValue.floor,
          apartment: formValue.apartment,
          postalCode: formValue.postalCode,
          city: {
            name: selectedCity.name,
            divisionName: 'Provincia',
            divisionType: 'PROVINCE',
            country: {
              name: selectedCountry.name
            }
          }
        };
        
        // Update the current address data with complete information
        this.currentAddressData = address;
        
        // Emit event with the address
        this.addressSaved.emit(address);
      }
    } else {
      // Mark all fields as touched to display validation errors
      Object.keys(this.addressForm.controls).forEach(key => {
        const control = this.addressForm.get(key);
        if (control) control.markAsTouched();
      });
    }
  }
  
  // Method to get the current address data
  getCurrentAddressData(): Partial<Address> {
    return this.currentAddressData;
  }
} 