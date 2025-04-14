// provider-type-selection.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ProfileService } from '../../../services/profile/profile.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export type ProviderType = 'individual' | 'company';

@Component({
  selector: 'app-provider-type-selection',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './provider-type-selection.component.html',
  styleUrls: ['./provider-type-selection.component.scss']
})
export class ProviderTypeSelectionComponent {
  @Input() initialType?: string;
  @Input() showBackButton = false;  // Por defecto, no mostrar el botón de volver
  @Output() typeSelected = new EventEmitter<string>();
  @Output() saved = new EventEmitter<boolean>();
  @Output() back = new EventEmitter<void>();

  selectedType: string | undefined;
  isLoading = false;

  constructor(
    private router: Router,
    private profileService: ProfileService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.selectedType = this.initialType;
  }

  selectType(type: string): void {
    this.selectedType = type;
    this.typeSelected.emit(type);
  }

  goBack(): void {
    this.back.emit();
  }

  continue(): void {
    if (!this.selectedType) {
      this.showMessage('Por favor, selecciona un tipo de proveedor para continuar');
      return;
    }

    this.isLoading = true;

    setTimeout(() => {
      // Simular guardado exitoso después de 1 segundo
      this.isLoading = false;
      this.saved.emit(true);
      
      // Si es proveedor individual, redirigir directamente al home
      if (this.selectedType === 'individual') {
        this.router.navigate(['/home']);
      }
    }, 1000);
  }

  private showMessage(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000
    });
  }
}