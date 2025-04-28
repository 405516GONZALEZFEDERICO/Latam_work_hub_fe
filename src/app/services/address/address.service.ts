import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Country } from '../../models/country.model';
import { City } from '../../models/city.model';
import { Address } from '../../models/address.model';
import { environment } from '../../../environment/environment';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AddressService {

  private API_BASE_URL = `${environment.apiUrl}/location`;

  constructor(private http: HttpClient) { }

  getAllCountries(): Observable<Country[]> {
    return this.http.get<Country[]>(`${this.API_BASE_URL}/countries`);
  }

  getCitiesByCountry(countryId: number | string): Observable<City[]> {
    // Asegurarse de que el ID sea un número
    const id = typeof countryId === 'string' ? parseInt(countryId, 10) : countryId;
    console.log(`Enviando solicitud para obtener ciudades del país ID: ${id}`);
    return this.http.get<City[]>(`${this.API_BASE_URL}/cities/country/${id}`);
  }

  saveAddress(address: Address, userId: string): Observable<Address> {
    if (!userId) {
      throw new Error('Se requiere el ID de usuario para guardar la dirección');
    }
    
    const params = new HttpParams().set('uid', userId);
    
    return this.http.post<Address>(`${this.API_BASE_URL}/addresses`, address, { params });
  }

  updateAddress(id: number, address: Address): Observable<Address> {
    return this.http.put<Address>(`${this.API_BASE_URL}/addresses/${id}`, address);
  }

  deleteAddress(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE_URL}/addresses/${id}`);
  }

  getUserAddresses(): Observable<Address[]> {
    return this.http.get<Address[]>(`${this.API_BASE_URL}/user/addresses`);
  }

  getUserAddressesByUserId(userId: string): Observable<Address[]> {
    const params = new HttpParams().set('uid', userId);
    return this.http.get<Address[]>(`${this.API_BASE_URL}/user/addresses`, { params });
  }

  getAddressById(id: number): Observable<Address> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.get<Address>(`${this.API_BASE_URL}/addresses/${id}`, { params });
  }

  getUserProfileAddress(userId: string): Observable<Address> {
    const params = new HttpParams().set('uid', userId);
    return this.http.get<Address>(`${this.API_BASE_URL}/user/profile/address`, { params });
  }

  getAddressByUserUid(uid: string): Observable<Address | null> {
    const params = new HttpParams().set('uid', uid);
    
    console.log('AddressService: Solicitando dirección para usuario:', uid);
    
    // Utilizamos any como tipo para manejar diferentes formatos de respuesta
    return this.http.get<any>(`${this.API_BASE_URL}/addresses/`, { params })
      .pipe(
        map(response => {
          console.log('AddressService: Respuesta recibida del servidor:', response);
          
          // Si la respuesta es nula
          if (!response) {
            console.log('AddressService: No hay dirección asociada al usuario (respuesta nula)');
            return null;
          }
          
          // Si la respuesta es un Optional de Java
          if (response.hasOwnProperty('present')) {
            // Si es un Optional vacío
            if (!response.present || response.empty) {
              console.log('AddressService: Optional vacío');
              return null;
            }
            
            // Si es un Optional con valor, extraer el valor
            if (response.value) {
              console.log('AddressService: Extrayendo valor del Optional:', response.value);
              return response.value;
            }
          }
          
          // Si la respuesta es directamente el objeto Address (tiene las propiedades esperadas)
          if (response.streetName && response.city) {
            console.log('AddressService: La respuesta es directamente un objeto Address');
            return response;
          }
          
          console.log('AddressService: Formato de respuesta no reconocido');
          return null;
        }),
        catchError(error => {
          console.error('AddressService: Error al obtener dirección:', error);
          return of(null);
        })
      );
  }
} 