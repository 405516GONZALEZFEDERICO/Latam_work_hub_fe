import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule, NavigationExtras } from '@angular/router';
import { Location } from '@angular/common';
import { finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Observable } from 'rxjs';

import { Space } from '../../../models/space.model';
import { SpaceService } from '../../../services/space/space.service';
import { Amenity } from '../../../models/amenity.model';
import { ReservationModalComponent } from '../../reservation/reservation-modal/reservation-modal.component';
import { AuthService } from '../../../services/auth-service/auth.service';
import { RentalModalComponent } from '../../rental-modal/rental-modal.component';

// Tipo para Address con las propiedades que realmente usamos
interface AddressWithCityCountry {
  streetName?: string;
  streetNumber?: string;
  floor?: string;
  apartment?: string;
  postalCode?: string;
  cityName?: string;
  countryName?: string;
  city?: { name?: string };
  country?: { name?: string };
  location?: string;
}

export interface SpaceWithType extends Space {
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  spaceType?: { id?: number | string; name?: string };
  typeObj?: { id?: number | string; name?: string };
  images?: string[];
  photoUrl?: string[];
  // Campos adicionales del DTO del backend
  pricePerHour?: number;
  pricePerDay?: number;
  pricePerMonth?: number;
}

@Component({
  selector: 'app-space-details',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  templateUrl: './space-details.component.html',
  styleUrls: ['./space-details.component.css']
})
export class SpaceDetailsComponent implements OnInit {
  space: SpaceWithType = {} as SpaceWithType;
  similarSpaces: SpaceWithType[] = [];
  selectedImage: string | null = null;
  isLoading: boolean = true;
  error: string | null = null;
  formattedAddress: string = '';
  showZoom: boolean = false;
  isMobile: boolean = false;
  userRole: string | null = null;
  private route=inject(ActivatedRoute);
  private router=inject(Router);
  private location=inject(Location);
  private spaceService=inject(SpaceService);
  private snackBar=inject(MatSnackBar);
  private dialog=inject(MatDialog);
  private authService=inject(AuthService);

  

  ngOnInit(): void {
    // Mejorar obtención del rol del usuario utilizando el servicio de autenticación
    this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.userRole = user.role;
      } else {
        // Si no hay usuario en el servicio, intentar recuperarlo de localStorage como fallback
        try {
          const userData = localStorage.getItem('currentUserData');
          if (userData) {
            const user = JSON.parse(userData);
            this.userRole = user.role || null;
          }
        } catch (e) {
          console.error('Error al obtener rol de usuario:', e);
          this.userRole = null;
        }
      }
    });

    this.checkMobile();
    this.route.paramMap.subscribe((params) => {
      // Intentar obtener el espacio desde el router state primero
      const navigation = this.router.getCurrentNavigation();
      const state = navigation?.extras?.state as { space?: SpaceWithType };
      
      if (state?.space) {
        this.setSpace(state.space);
      } else {
        // Fallback: si no hay datos en el state, intentar obtener el ID y hacer petición
        const spaceId = params.get('id');
        if (spaceId) {
          this.loadSpaceById(spaceId);
        } else {
          this.error = 'No se proporcionó ID del espacio';
        }
      }
    });

    // Inicializar selectedImage con la imagen principal del espacio
    this.selectedImage = this.space?.imageUrl ? this.space.imageUrl : null;

    // Detectar cambios de tamaño de pantalla
    window.addEventListener('resize', () => {
      this.checkMobile();
    });
  }

  setSpace(space: SpaceWithType): void {
    this.space = space;
    
    // Mapear campos del DTO a los campos esperados en el frontend
    this.mapDtoFields(space);
    
    
    // Procesamiento de imágenes prioritario
    if (space.photoUrl && space.photoUrl.length > 0) {
      this.selectedImage = space.photoUrl[0];
    } else if (space.imageUrl) {
      this.selectedImage = space.imageUrl;
    } else if (space.images && space.images.length > 0) {
      this.selectedImage = space.images[0];
    } else {
      this.selectedImage = null;
    }
    
    this.formatAddress(space);
    
    // Usar cualquier propiedad disponible para buscar espacios similares
    // this.findSimilarSpacesLocally(space);
    

  }

  formatAddress(space: SpaceWithType): void {
    // Manejar objeto de dirección
    if (space.address) {
      if (typeof space.address === 'string') {
        this.formattedAddress = space.address;
      } else if (typeof space.address === 'object') {
        // Formatear dirección a partir del objeto
        const address = space.address as AddressWithCityCountry;
        const parts = [];
        
        if (address.streetName) parts.push(address.streetName);
        if (address.streetNumber) parts.push(address.streetNumber);
        if (address.floor) parts.push(`Piso ${address.floor}`);
        if (address.apartment) parts.push(`Depto. ${address.apartment}`);
        if (address.postalCode) parts.push(`CP ${address.postalCode}`);
        
        // Intentar obtener ciudad y país usando diferentes propiedades
        if (address.city?.name) parts.push(address.city.name);
        else if (address.cityName) parts.push(address.cityName);
        
        if (address.country?.name) parts.push(address.country.name);
        else if (address.countryName) parts.push(address.countryName);
        
        // Extraer y asignar ciudad y país al objeto space
        if (address.city) {
          space.city = typeof address.city === 'string' ? address.city : address.city.name;
        } else if (address.cityName) {
          space.city = address.cityName;
        }
        
        if (address.country) {
          space.country = typeof address.country === 'string' ? address.country : address.country.name;
        } else if (address.countryName) {
          space.country = address.countryName;
        }
        
        this.formattedAddress = parts.join(', ');
      }
    } else {
      this.formattedAddress = 'Dirección no disponible';
    }
  }

  getFormattedAddress(space: SpaceWithType): string {
    if (!space.address) return 'Dirección no disponible';
    
    if (typeof space.address === 'string') {
      return space.address;
    } else if (typeof space.address === 'object') {
      const address = space.address as AddressWithCityCountry;
      const parts = [];
      
      if (address.streetName) parts.push(address.streetName);
      if (address.streetNumber) parts.push(address.streetNumber);
      
      // Intentar obtener ciudad usando diferentes propiedades
      if (address.city?.name) parts.push(address.city.name);
      else if (address.cityName) parts.push(address.cityName);
      
      return parts.join(', ') || 'Dirección no disponible';
    }
    
    return 'Dirección no disponible';
  }

  getSpaceType(): string {
    if (!this.space) {
      return 'No especificado';
    }
    
    let spaceTypeName = '';
    
    // Primero intentar con spaceType
    if (this.space.spaceType) {
      // Si es un objeto con name
      if (typeof this.space.spaceType === 'object' && 'name' in this.space.spaceType) {
        spaceTypeName = this.space.spaceType.name as string;
      }
      
      // Si es un string
      if (typeof this.space.spaceType === 'string') {
        spaceTypeName = this.space.spaceType;
      }
    }
    
    // Luego intentar con typeObj
    if (!spaceTypeName && this.space.typeObj) {
      if (typeof this.space.typeObj === 'object' && 'name' in this.space.typeObj) {
        spaceTypeName = this.space.typeObj.name as string;
      }
    }
    
    // Luego intentar con type (de la interfaz Space)
    if (!spaceTypeName && this.space.type) {
      // Si es un string
      if (typeof this.space.type === 'string') {
        spaceTypeName = this.space.type;
      }
    }
    
    if (!spaceTypeName) {
      return 'No especificado';
    }
    
    // Traducir el tipo de espacio
    return this.translateSpaceType(spaceTypeName);
  }

  /**
   * Traduce tipos de espacios al español
   */
  private translateSpaceType(name: string): string {
    if (!name) return 'No especificado';
    
    // Traducciones específicas para tipos de espacios
    const spaceTypeTranslations: { [key: string]: string } = {
      'CONTRACT': 'Contrato',
      'OFFICE': 'Oficina',
      'MEETING_ROOM': 'Sala de Reuniones',
      'CONFERENCE_ROOM': 'Sala de Conferencias',
      'COWORKING': 'Coworking',
      'PRIVATE_OFFICE': 'Oficina Privada',
      'SHARED_OFFICE': 'Oficina Compartida',
      'AUDITORIUM': 'Auditorio',
      'CLASSROOM': 'Aula',
      'WORKSHOP': 'Taller',
      'EVENT_SPACE': 'Espacio para Eventos',
      'STUDIO': 'Estudio'
    };
    
    // Verificar si existe una traducción específica
    const upperName = name.toUpperCase();
    if (spaceTypeTranslations[upperName]) {
      return spaceTypeTranslations[upperName];
    }
    
    // Si contiene espacios, sólo capitalizar la primera letra de cada palabra
    if (name.includes(' ')) {
      return name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    // Para camelCase, insertar espacios antes de cada letra mayúscula y capitalizar la primera
    const formatted = name.replace(/([A-Z])/g, ' $1').trim();
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // Método para obtener la URL de Google Maps para mostrar el mapa estático
  getGoogleMapImageUrl(): string {
    if (this.space && this.space.address) {
      // Si tenemos latitud y longitud, usarlas
      if (this.space.latitude && this.space.longitude) {
        const apiKey = ''; // Dejar vacío si no tienes una API key
        const zoom = 15;
        const size = '600x400';
        const marker = `color:red|${this.space.latitude},${this.space.longitude}`;
        
        return `https://maps.googleapis.com/maps/api/staticmap?center=${this.space.latitude},${this.space.longitude}&zoom=${zoom}&size=${size}&markers=${marker}${apiKey ? '&key=' + apiKey : ''}`;
      }
      
      // Si no tenemos coordenadas, usar la dirección
      const address = encodeURIComponent(this.formattedAddress);
      const apiKey = ''; // Dejar vacío si no tienes una API key
      const zoom = 15;
      const size = '600x400';
      
      return `https://maps.googleapis.com/maps/api/staticmap?center=${address}&zoom=${zoom}&size=${size}&markers=${address}${apiKey ? '&key=' + apiKey : ''}`;
    }
    
    return 'https://via.placeholder.com/600x400?text=Mapa+no+disponible';
  }
  
  // Método para obtener la URL de Google Maps para abrir en una nueva pestaña
  getGoogleMapsUrl(): string {
    if (!this.space || !this.space.address) {
      return 'https://maps.google.com';
    }
    
    // Si tenemos latitud y longitud, usarlas
    if (this.space.latitude && this.space.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${this.space.latitude},${this.space.longitude}`;
    }
    
    // Si no tenemos coordenadas, usar la dirección
    const address = encodeURIComponent(this.formattedAddress);
    return `https://www.google.com/maps/search/?api=1&query=${address}`;
  }
  
  // Método para obtener la URL de Google Maps para direcciones
  getGoogleMapsDirectionsUrl(): string {
    if (!this.space || !this.space.address) {
      return 'https://maps.google.com/maps';
    }
    
    // Si tenemos latitud y longitud, usarlas
    if (this.space.latitude && this.space.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${this.space.latitude},${this.space.longitude}`;
    }
    
    // Si no tenemos coordenadas, usar la dirección
    const address = encodeURIComponent(this.formattedAddress);
    return `https://www.google.com/maps/dir/?api=1&destination=${address}`;
  }

  loadSpaceById(id: string): void {
    this.isLoading = true;
    this.error = null;
    
    this.spaceService.getSpaceById(id)
      .pipe(
        finalize(() => this.isLoading = false),
        catchError(err => {
          console.error('Error loading space details:', err);
          this.error = 'Error cargando los detalles del espacio. Intente de nuevo más tarde.';
          this.snackBar.open('Error cargando datos del espacio', 'Cerrar', { duration: 5000 });
          return of(undefined);
        })
      )
      .subscribe(
        (space) => {
          if (space) {
            this.setSpace(space as SpaceWithType);
          } else {
            this.error = 'No se encontró el espacio solicitado';
            this.snackBar.open('No se encontró información del espacio', 'Cerrar', { duration: 5000 });
          }
        }
      );
  }

  // // Buscar espacios similares utilizando los datos locales
  // findSimilarSpacesLocally(currentSpace: SpaceWithType): void {
  //   this.spaceService.getSpaces().subscribe(spaces => {
  //     // Convertir a SpaceWithType[]
  //     const spacesWithType = spaces as SpaceWithType[];
      
  //     this.similarSpaces = spacesWithType
  //       .filter(space => {
  //         // Si el ID es igual, no es un espacio similar
  //         if (space.id === currentSpace.id) return false;
          
  //         // Obtener el tipo de espacio de cualquier propiedad disponible
  //         let spaceTypeStr = '';
  //         let currentTypeStr = '';
          
  //         // Intentar obtener el tipo del space
  //         if (space.type) {
  //           spaceTypeStr = typeof space.type === 'string' 
  //             ? space.type 
  //             : '';
  //         } else if (space.spaceType) {
  //           spaceTypeStr = typeof space.spaceType === 'string'
  //             ? space.spaceType
  //             : ((space.spaceType as any)?.name || '');
  //         } else if (space.typeObj) {
  //           spaceTypeStr = space.typeObj.name || '';
  //         }
          
  //         // Intentar obtener el tipo del currentSpace
  //         if (currentSpace.type) {
  //           currentTypeStr = typeof currentSpace.type === 'string' 
  //             ? currentSpace.type 
  //             : '';
  //         } else if (currentSpace.spaceType) {
  //           currentTypeStr = typeof currentSpace.spaceType === 'string'
  //             ? currentSpace.spaceType
  //             : ((currentSpace.spaceType as any)?.name || '');
  //         } else if (currentSpace.typeObj) {
  //           currentTypeStr = currentSpace.typeObj.name || '';
  //         }
          
  //         return spaceTypeStr && currentTypeStr && spaceTypeStr === currentTypeStr;
  //       })
  //       .slice(0, 3); // Limitar a 3 espacios similares
      
  //   });
  // }

  goBack(): void {
    this.location.back();
  }
  
  goToSimilarSpace(space: SpaceWithType): void {
    if (space && space.id) {
      // Navegación al detalle del espacio similar
      this.router.navigate(['/home/space-details', space.id]);
    }
  }

  reserveSpace(): void {
    if (this.space) {
      // Abrir el modal de reserva
      const dialogRef = this.dialog.open(ReservationModalComponent, {
        width: '1200px',
        maxWidth: '98vw',
        maxHeight: '98vh',
        panelClass: 'reservation-dialog-container',
        data: { spaceId: this.space.id, space: this.space }
      });

      // Escuchar el resultado del modal
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // Si se ha realizado la reserva con éxito
          this.snackBar.open('Reserva completada con éxito', 'Cerrar', {
            duration: 3000,
            panelClass: 'success-snackbar'
          });
        }
      });
    } else {
      this.snackBar.open('No se pudo cargar la información del espacio', 'Cerrar', {
        duration: 3000,
        panelClass: 'error-snackbar'
      });
    }
  }

  rentSpace(): void {
    if (this.space) {
      const dialogRef = this.dialog.open(RentalModalComponent, {
        width: '1200px',
        maxWidth: '98vw',
        maxHeight: '98vh',
        panelClass: 'rental-dialog-container',
        data: {
          spaceId: this.space.id,
          monthlyAmount: this.space.priceMonth || this.space.pricePerMonth || 0,
          amenities: this.space.amenities || []
        }
      });
      dialogRef.afterClosed().subscribe(result => {
        // Aquí puedes manejar el resultado si es necesario
      });
    } else {
      this.snackBar.open('No se pudo cargar la información del espacio', 'Cerrar', {
        duration: 3000,
        panelClass: 'error-snackbar'
      });
    }
  }

  // Método para obtener el ícono correspondiente a cada amenity
  getAmenityIcon(amenityName: string): string {
    const iconMap: { [key: string]: string } = {
      'WiFi': 'wifi',
      'Aire acondicionado': 'ac_unit',
      'Estacionamiento': 'local_parking',
      'Café': 'coffee',
      'Impresora': 'print',
      'Sala de reuniones': 'meeting_room',
      'Cocina': 'kitchen',
      'Seguridad': 'security',
      'Acceso 24/7': 'access_time',
      'Lockers': 'lock',
      // Agrega más mapeos según necesites
    };

    return iconMap[amenityName] || 'check_circle'; // Ícono por defecto si no hay mapeo
  }

  private mapDtoFields(space: SpaceWithType): void {
    if (!space) return;

    // Mejorado el manejo de amenidades para considerar todos los posibles formatos
    if (space.amenities === undefined) {
      this.space.amenities = [];
    } else if (Array.isArray(space.amenities)) {
      this.space.amenities = space.amenities.map(amenity => {
        // Si es un string, convertirlo a objeto Amenity
        if (typeof amenity === 'string') {
          return {
            id: 0,
            name: amenity,
            createdAt: new Date(),
            updatedAt: new Date()
          } as Amenity;
        } 
        // Si es un objeto pero no tiene createdAt/updatedAt (puede ser de otro formato)
        else if (typeof amenity === 'object' && !('createdAt' in amenity)) {
          return {
            id: amenity.id || 0,
            name: amenity.name || 'Amenidad sin nombre',
            price: amenity.price,
            description: amenity.description,
            createdAt: new Date(),
            updatedAt: new Date()
          } as Amenity;
        }
        
        // Si ya es un objeto Amenity completo
        return amenity;
      });
      
    } else {
      // Si amenities existe pero no es un array, inicializar como array vacío
      this.space.amenities = [];
    }

    // Mapear tipo de espacio
    this.space.type = typeof space.spaceType === 'string'
      ? space.spaceType
      : space.spaceType?.name || '';

    // Asegurar que los precios estén mapeados correctamente
    this.space.pricePerHour = space.pricePerHour || space.priceHour || 0;
    this.space.pricePerDay = space.pricePerDay || space.priceDay || 0;
    this.space.pricePerMonth = space.pricePerMonth || space.priceMonth || 0;
    
    // Extraer ciudad y país directamente si están en el objeto address
    if (space.address && typeof space.address === 'object') {
      const address = space.address as AddressWithCityCountry;
      
      // Asignar ciudad
      if (!space.city) {
        if (address.city) {
          space.city = typeof address.city === 'string' ? address.city : address.city.name;
        } else if (address.cityName) {
          space.city = address.cityName;
        }
      }
      
      // Asignar país
      if (!space.country) {
        if (address.country) {
          space.country = typeof address.country === 'string' ? address.country : address.country.name;
        } else if (address.countryName) {
          space.country = address.countryName;
        }
      }
    }
    
    
  }

  // Método para detectar si es un dispositivo móvil basado en el ancho de la ventana
  checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
  }

  // Método para manejar el zoom al mover el mouse sobre la imagen
  handleZoom(event: MouseEvent): void {
    if (this.isMobile) return;
    
    const image = event.currentTarget as HTMLImageElement;
    const imageRect = image.getBoundingClientRect();
    
    // Calcular la posición relativa del cursor
    const x = ((event.clientX - imageRect.left) / imageRect.width) * 100;
    const y = ((event.clientY - imageRect.top) / imageRect.height) * 100;
    
    // Aplicar el efecto de zoom
    image.style.transformOrigin = `${x}% ${y}%`;
  }

  // Método para obtener el nombre de la ciudad de forma segura
  getCityName(): string {
    if (!this.space) return 'No especificada';
    
    if (this.space.city) {
      return this.space.city;
    }
    
    if (this.space.address) {
      if (typeof this.space.address === 'object') {
        const address = this.space.address as any;
        if (address.city) {
          if (typeof address.city === 'string') {
            return address.city;
          } else if (typeof address.city === 'object' && address.city.name) {
            return address.city.name;
          }
        }
        
        if (address.cityName) {
          return address.cityName;
        }
      }
    }
    
    return 'No especificada';
  }
  
  // Método para obtener el nombre del país de forma segura
  getCountryName(): string {
    if (!this.space) return 'No especificado';
    
    if (this.space.country) {
      return this.space.country;
    }
    
    if (this.space.address) {
      if (typeof this.space.address === 'object') {
        const address = this.space.address as any;
        if (address.country) {
          if (typeof address.country === 'string') {
            return address.country;
          } else if (typeof address.country === 'object' && address.country.name) {
            return address.country.name;
          }
        }
        
        if (address.countryName) {
          return address.countryName;
        }
      }
    }
    
    return 'No especificado';
  }

  // Método para verificar si el usuario tiene permisos para reservar
  canReserve(): boolean {
    return this.userRole === 'CLIENTE';
  }
}
